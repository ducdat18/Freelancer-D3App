use anchor_lang::prelude::*;
use solana_program::hash::hashv;

use crate::{ErrorCode, Job, JobStatus, Reputation};

// ==================== SBT (SOULBOUND TOKEN) REPUTATION ====================

/// Initialize SBT counter for a user
pub fn init_sbt_counter(ctx: Context<InitSBTCounter>) -> Result<()> {
    let counter = &mut ctx.accounts.sbt_counter;

    counter.user = ctx.accounts.user.key();
    counter.count = 0;
    counter.bump = ctx.bumps.sbt_counter;

    emit!(SBTCounterInitialized {
        user: ctx.accounts.user.key(),
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

/// Mint a reputation SBT after job completion
/// Creates a non-transferable on-chain record with cryptographic verification
pub fn mint_reputation_sbt(
    ctx: Context<MintReputationSBT>,
    rating: u8,
    comment: String,
    job_title: String,
    metadata_uri: String,
) -> Result<()> {
    let job = &ctx.accounts.job;
    let sbt = &mut ctx.accounts.reputation_sbt;
    let counter = &mut ctx.accounts.sbt_counter;
    let reputation = &mut ctx.accounts.reputation;
    let clock = Clock::get()?;

    // Verify job is completed
    require!(job.status == JobStatus::Completed, ErrorCode::JobNotCompleted);

    // Verify reviewer is client or freelancer of this job
    let reviewer = ctx.accounts.reviewer.key();
    let reviewee = ctx.accounts.reviewee.key();
    require!(
        (reviewer == job.client && Some(reviewee) == job.selected_freelancer) ||
        (Some(reviewer) == job.selected_freelancer && reviewee == job.client),
        ErrorCode::Unauthorized
    );

    // Validate inputs
    require!(rating >= 1 && rating <= 5, ErrorCode::InvalidRating);
    require!(comment.len() <= 200, SBTError::CommentTooLong);
    require!(job_title.len() <= 100, ErrorCode::TitleTooLong);
    require!(metadata_uri.len() <= 200, ErrorCode::URITooLong);

    // Compute verification hash: SHA256(job_key || reviewer_key || rating || timestamp)
    let mut hash_input = Vec::new();
    hash_input.extend_from_slice(job.key().as_ref());
    hash_input.extend_from_slice(reviewer.as_ref());
    hash_input.push(rating);
    hash_input.extend_from_slice(&clock.unix_timestamp.to_le_bytes());
    let verification = hashv(&[&hash_input]);

    // Set SBT data
    sbt.user = reviewee;
    sbt.job = job.key();
    sbt.rater = reviewer;
    sbt.rating = rating;
    sbt.comment = comment;
    sbt.job_amount = job.budget;
    sbt.job_title = job_title;
    sbt.metadata_uri = metadata_uri;
    sbt.issued_at = clock.unix_timestamp;
    sbt.sbt_index = counter.count;
    sbt.verification_hash = verification.to_bytes();
    sbt.revoked = false;
    sbt.bump = ctx.bumps.reputation_sbt;

    // Increment counter
    counter.count = counter.count.checked_add(1).ok_or(SBTError::CounterOverflow)?;

    // Update aggregate reputation
    let current_total = (reputation.average_rating * reputation.total_reviews as f32) + rating as f32;
    reputation.total_reviews += 1;
    reputation.average_rating = current_total / reputation.total_reviews as f32;

    if Some(reviewee) == job.selected_freelancer {
        reputation.completed_jobs += 1;
        reputation.total_earned = reputation.total_earned.saturating_add(job.budget);
    }

    emit!(ReputationSBTMinted {
        user: reviewee,
        rater: reviewer,
        job: job.key(),
        sbt: sbt.key(),
        rating,
        sbt_index: sbt.sbt_index,
        verification_hash: sbt.verification_hash,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Revoke an SBT (admin/DAO action for fraud cases)
pub fn revoke_sbt(ctx: Context<RevokeSBT>) -> Result<()> {
    let sbt = &mut ctx.accounts.reputation_sbt;

    require!(!sbt.revoked, SBTError::AlreadyRevoked);

    sbt.revoked = true;

    emit!(ReputationSBTRevoked {
        user: sbt.user,
        sbt: sbt.key(),
        sbt_index: sbt.sbt_index,
        revoked_by: ctx.accounts.authority.key(),
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

// ==================== CONTEXTS ====================

#[derive(Accounts)]
pub struct InitSBTCounter<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + UserSBTCounter::INIT_SPACE,
        seeds = [b"sbt-counter", user.key().as_ref()],
        bump
    )]
    pub sbt_counter: Account<'info, UserSBTCounter>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintReputationSBT<'info> {
    #[account(
        init,
        payer = reviewer,
        space = 8 + ReputationSBT::INIT_SPACE,
        seeds = [b"sbt", reviewee.key().as_ref(), &sbt_counter.count.to_le_bytes()],
        bump
    )]
    pub reputation_sbt: Account<'info, ReputationSBT>,

    #[account(
        mut,
        seeds = [b"sbt-counter", reviewee.key().as_ref()],
        bump = sbt_counter.bump
    )]
    pub sbt_counter: Account<'info, UserSBTCounter>,

    pub job: Account<'info, Job>,

    #[account(
        mut,
        seeds = [b"reputation", reviewee.key().as_ref()],
        bump = reputation.bump
    )]
    pub reputation: Account<'info, Reputation>,

    #[account(mut)]
    pub reviewer: Signer<'info>,

    /// CHECK: The user receiving the SBT
    pub reviewee: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeSBT<'info> {
    #[account(mut)]
    pub reputation_sbt: Account<'info, ReputationSBT>,

    // For now, the user themselves or a designated admin can revoke
    // In production, this would be gated by a DAO multisig
    pub authority: Signer<'info>,
}

// ==================== STATE ACCOUNTS ====================

#[account]
#[derive(InitSpace)]
pub struct UserSBTCounter {
    pub user: Pubkey,
    pub count: u32,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ReputationSBT {
    pub user: Pubkey,           // The freelancer/client who earned this
    pub job: Pubkey,            // Which job this is for
    pub rater: Pubkey,          // Who issued the rating
    pub rating: u8,             // 1-5 stars
    #[max_len(200)]
    pub comment: String,        // Review comment
    pub job_amount: u64,        // How much the job paid
    #[max_len(100)]
    pub job_title: String,      // Job title for display
    #[max_len(200)]
    pub metadata_uri: String,   // IPFS URI with full details
    pub issued_at: i64,         // Timestamp
    pub sbt_index: u32,         // Sequential index per user
    pub verification_hash: [u8; 32], // SHA256 proof
    pub revoked: bool,          // Can be revoked for fraud
    pub bump: u8,
}

// ==================== EVENTS ====================

#[event]
pub struct SBTCounterInitialized {
    pub user: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ReputationSBTMinted {
    pub user: Pubkey,
    pub rater: Pubkey,
    pub job: Pubkey,
    pub sbt: Pubkey,
    pub rating: u8,
    pub sbt_index: u32,
    pub verification_hash: [u8; 32],
    pub timestamp: i64,
}

#[event]
pub struct ReputationSBTRevoked {
    pub user: Pubkey,
    pub sbt: Pubkey,
    pub sbt_index: u32,
    pub revoked_by: Pubkey,
    pub timestamp: i64,
}

// ==================== ERRORS ====================

#[error_code]
pub enum SBTError {
    #[msg("SBT comment exceeds maximum length")]
    CommentTooLong,
    #[msg("SBT counter overflow")]
    CounterOverflow,
    #[msg("SBT already revoked")]
    AlreadyRevoked,
}
