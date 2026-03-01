use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::{ErrorCode, Job, JobStatus};

// ==================== MILESTONE-BASED ESCROW ====================

/// Initialize milestone configuration for a job
pub fn init_job_milestones(
    ctx: Context<InitJobMilestones>,
    total_milestones: u8,
) -> Result<()> {
    let job = &ctx.accounts.job;
    let config = &mut ctx.accounts.milestone_config;

    require!(job.client == ctx.accounts.client.key(), ErrorCode::Unauthorized);
    require!(job.status == JobStatus::Open, ErrorCode::JobNotOpen);
    require!(total_milestones >= 1 && total_milestones <= 10, MilestoneError::InvalidMilestoneCount);

    config.job = job.key();
    config.client = job.client;
    config.total_milestones = total_milestones;
    config.created_count = 0;
    config.funded_count = 0;
    config.approved_count = 0;
    config.total_funded = 0;
    config.bump = ctx.bumps.milestone_config;

    emit!(MilestoneConfigCreated {
        job: job.key(),
        client: job.client,
        total_milestones,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

/// Create a single milestone for a job
pub fn create_milestone(
    ctx: Context<CreateMilestone>,
    milestone_index: u8,
    title: String,
    description: String,
    amount: u64,
) -> Result<()> {
    let job = &ctx.accounts.job;
    let config = &mut ctx.accounts.milestone_config;
    let milestone = &mut ctx.accounts.milestone;

    require!(job.client == ctx.accounts.client.key(), ErrorCode::Unauthorized);
    require!(job.status == JobStatus::Open, ErrorCode::JobNotOpen);
    require!(milestone_index == config.created_count, MilestoneError::InvalidMilestoneIndex);
    require!(config.created_count < config.total_milestones, MilestoneError::AllMilestonesCreated);
    require!(title.len() <= 100, ErrorCode::TitleTooLong);
    require!(description.len() <= 500, ErrorCode::DescriptionTooLong);
    require!(amount > 0, ErrorCode::InvalidBudget);

    // Check that cumulative amounts do not exceed job budget
    let new_total = config.total_funded.checked_add(amount).ok_or(MilestoneError::AmountOverflow)?;
    require!(new_total <= job.budget, MilestoneError::MilestoneAmountsExceedBudget);

    milestone.job = job.key();
    milestone.milestone_index = milestone_index;
    milestone.title = title;
    milestone.description = description;
    milestone.amount = amount;
    milestone.status = MilestoneStatus::Pending;
    milestone.deliverable_uri = String::new();
    milestone.submitted_at = None;
    milestone.approved_at = None;
    milestone.bump = ctx.bumps.milestone;

    config.created_count += 1;
    config.total_funded += amount; // Track planned total (not yet deposited)

    emit!(MilestoneCreated {
        job: job.key(),
        milestone: milestone.key(),
        milestone_index,
        amount,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

/// Fund a specific milestone escrow with SOL
pub fn fund_milestone(
    ctx: Context<FundMilestone>,
    amount: u64,
) -> Result<()> {
    let job = &ctx.accounts.job;
    let milestone = &mut ctx.accounts.milestone;
    let escrow = &mut ctx.accounts.milestone_escrow;
    let clock = Clock::get()?;

    require!(job.client == ctx.accounts.client.key(), ErrorCode::Unauthorized);
    require!(milestone.status == MilestoneStatus::Pending, MilestoneError::MilestoneNotPending);
    require!(amount >= milestone.amount, ErrorCode::InsufficientEscrow);

    // Transfer SOL to escrow PDA
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.client.to_account_info(),
                to: escrow.to_account_info(),
            },
        ),
        amount,
    )?;

    escrow.job = job.key();
    escrow.milestone = milestone.key();
    escrow.client = job.client;
    escrow.freelancer = job.selected_freelancer.unwrap_or_default();
    escrow.amount = amount;
    escrow.locked = true;
    escrow.released = false;
    escrow.disputed = false;
    escrow.created_at = clock.unix_timestamp;
    escrow.bump = ctx.bumps.milestone_escrow;

    milestone.status = MilestoneStatus::Funded;

    // Update config
    let config = &mut ctx.accounts.milestone_config;
    config.funded_count += 1;

    emit!(MilestoneFunded {
        job: job.key(),
        milestone: milestone.key(),
        amount,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Freelancer submits deliverable for a specific milestone
pub fn submit_milestone_work(
    ctx: Context<SubmitMilestoneWork>,
    deliverable_uri: String,
) -> Result<()> {
    let job = &ctx.accounts.job;
    let milestone = &mut ctx.accounts.milestone;
    let clock = Clock::get()?;

    require!(
        job.selected_freelancer == Some(ctx.accounts.freelancer.key()),
        ErrorCode::Unauthorized
    );
    require!(
        milestone.status == MilestoneStatus::Funded || milestone.status == MilestoneStatus::InProgress,
        MilestoneError::MilestoneNotActive
    );
    require!(deliverable_uri.len() <= 200, ErrorCode::URITooLong);

    milestone.deliverable_uri = deliverable_uri.clone();
    milestone.submitted_at = Some(clock.unix_timestamp);
    milestone.status = MilestoneStatus::Submitted;

    emit!(MilestoneWorkSubmitted {
        job: job.key(),
        milestone: milestone.key(),
        freelancer: ctx.accounts.freelancer.key(),
        deliverable_uri,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Client approves milestone and releases payment
pub fn approve_milestone(ctx: Context<ApproveMilestone>) -> Result<()> {
    let job = &mut ctx.accounts.job;
    let milestone = &mut ctx.accounts.milestone;
    let escrow = &mut ctx.accounts.milestone_escrow;
    let config = &mut ctx.accounts.milestone_config;
    let clock = Clock::get()?;

    require!(job.client == ctx.accounts.client.key(), ErrorCode::Unauthorized);
    require!(milestone.status == MilestoneStatus::Submitted, MilestoneError::MilestoneNotSubmitted);
    require!(escrow.locked, ErrorCode::EscrowNotLocked);
    require!(!escrow.released, ErrorCode::EscrowAlreadyReleased);

    // Transfer SOL from escrow to freelancer
    **escrow.to_account_info().try_borrow_mut_lamports()? -= escrow.amount;
    **ctx.accounts.freelancer.to_account_info().try_borrow_mut_lamports()? += escrow.amount;

    escrow.released = true;
    escrow.locked = false;
    milestone.status = MilestoneStatus::Approved;
    milestone.approved_at = Some(clock.unix_timestamp);

    config.approved_count += 1;

    // If all milestones approved, mark job as completed
    if config.approved_count == config.total_milestones {
        job.status = JobStatus::Completed;
        job.updated_at = clock.unix_timestamp;
    }

    emit!(MilestoneApproved {
        job: job.key(),
        milestone: milestone.key(),
        freelancer: escrow.freelancer,
        amount: escrow.amount,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Client rejects milestone work - funds stay in escrow
pub fn reject_milestone(
    ctx: Context<RejectMilestone>,
    reason: String,
) -> Result<()> {
    let job = &ctx.accounts.job;
    let milestone = &mut ctx.accounts.milestone;
    let clock = Clock::get()?;

    require!(job.client == ctx.accounts.client.key(), ErrorCode::Unauthorized);
    require!(milestone.status == MilestoneStatus::Submitted, MilestoneError::MilestoneNotSubmitted);
    require!(reason.len() <= 500, ErrorCode::ReasonTooLong);

    // Reset to InProgress so freelancer can re-submit
    milestone.status = MilestoneStatus::InProgress;
    milestone.deliverable_uri = String::new();
    milestone.submitted_at = None;

    emit!(MilestoneRejected {
        job: job.key(),
        milestone: milestone.key(),
        freelancer: job.selected_freelancer.unwrap_or_default(),
        reason,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Open dispute for a specific milestone
pub fn dispute_milestone(
    ctx: Context<DisputeMilestone>,
    reason: String,
) -> Result<()> {
    let job = &mut ctx.accounts.job;
    let milestone = &mut ctx.accounts.milestone;
    let escrow = &mut ctx.accounts.milestone_escrow;
    let dispute = &mut ctx.accounts.milestone_dispute;
    let clock = Clock::get()?;

    let initiator = ctx.accounts.initiator.key();
    require!(
        initiator == job.client || initiator == job.selected_freelancer.unwrap_or_default(),
        ErrorCode::Unauthorized
    );
    require!(
        milestone.status == MilestoneStatus::Submitted || milestone.status == MilestoneStatus::InProgress || milestone.status == MilestoneStatus::Funded,
        MilestoneError::MilestoneCannotBeDisputed
    );
    require!(reason.len() <= 500, ErrorCode::ReasonTooLong);
    require!(!escrow.disputed, ErrorCode::EscrowAlreadyDisputed);

    dispute.job = job.key();
    dispute.milestone = milestone.key();
    dispute.escrow = escrow.key();
    dispute.client = job.client;
    dispute.freelancer = job.selected_freelancer.unwrap_or_default();
    dispute.initiator = initiator;
    dispute.reason = reason.clone();
    dispute.status = crate::DisputeStatus::Open;
    dispute.votes_for_client = 0;
    dispute.votes_for_freelancer = 0;
    dispute.created_at = clock.unix_timestamp;
    dispute.resolved_at = None;
    dispute.bump = ctx.bumps.milestone_dispute;

    escrow.disputed = true;
    milestone.status = MilestoneStatus::Disputed;

    emit!(MilestoneDisputed {
        job: job.key(),
        milestone: milestone.key(),
        initiator,
        reason,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// ==================== CONTEXTS ====================

#[derive(Accounts)]
pub struct InitJobMilestones<'info> {
    #[account(
        init,
        payer = client,
        space = 8 + JobMilestoneConfig::INIT_SPACE,
        seeds = [b"job-config", job.key().as_ref()],
        bump
    )]
    pub milestone_config: Account<'info, JobMilestoneConfig>,
    pub job: Account<'info, Job>,
    #[account(mut)]
    pub client: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(milestone_index: u8)]
pub struct CreateMilestone<'info> {
    #[account(
        init,
        payer = client,
        space = 8 + Milestone::INIT_SPACE,
        seeds = [b"milestone", job.key().as_ref(), &[milestone_index]],
        bump
    )]
    pub milestone: Account<'info, Milestone>,
    #[account(
        mut,
        seeds = [b"job-config", job.key().as_ref()],
        bump = milestone_config.bump
    )]
    pub milestone_config: Account<'info, JobMilestoneConfig>,
    pub job: Account<'info, Job>,
    #[account(mut)]
    pub client: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FundMilestone<'info> {
    #[account(
        init,
        payer = client,
        space = 8 + MilestoneEscrow::INIT_SPACE,
        seeds = [b"ms-escrow", milestone.key().as_ref()],
        bump
    )]
    pub milestone_escrow: Account<'info, MilestoneEscrow>,
    #[account(mut)]
    pub milestone: Account<'info, Milestone>,
    #[account(
        mut,
        seeds = [b"job-config", job.key().as_ref()],
        bump = milestone_config.bump
    )]
    pub milestone_config: Account<'info, JobMilestoneConfig>,
    pub job: Account<'info, Job>,
    #[account(mut)]
    pub client: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitMilestoneWork<'info> {
    #[account(
        mut,
        seeds = [b"milestone", job.key().as_ref(), &[milestone.milestone_index]],
        bump = milestone.bump
    )]
    pub milestone: Account<'info, Milestone>,
    pub job: Account<'info, Job>,
    pub freelancer: Signer<'info>,
}

#[derive(Accounts)]
pub struct ApproveMilestone<'info> {
    #[account(
        mut,
        seeds = [b"milestone", job.key().as_ref(), &[milestone.milestone_index]],
        bump = milestone.bump
    )]
    pub milestone: Account<'info, Milestone>,
    #[account(
        mut,
        seeds = [b"ms-escrow", milestone.key().as_ref()],
        bump = milestone_escrow.bump
    )]
    pub milestone_escrow: Account<'info, MilestoneEscrow>,
    #[account(
        mut,
        seeds = [b"job-config", job.key().as_ref()],
        bump = milestone_config.bump
    )]
    pub milestone_config: Account<'info, JobMilestoneConfig>,
    #[account(mut)]
    pub job: Account<'info, Job>,
    pub client: Signer<'info>,
    /// CHECK: freelancer receiving payment
    #[account(mut)]
    pub freelancer: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct RejectMilestone<'info> {
    #[account(
        mut,
        seeds = [b"milestone", job.key().as_ref(), &[milestone.milestone_index]],
        bump = milestone.bump
    )]
    pub milestone: Account<'info, Milestone>,
    pub job: Account<'info, Job>,
    pub client: Signer<'info>,
}

#[derive(Accounts)]
pub struct DisputeMilestone<'info> {
    #[account(
        init,
        payer = initiator,
        space = 8 + MilestoneDispute::INIT_SPACE,
        seeds = [b"ms-dispute", milestone.key().as_ref()],
        bump
    )]
    pub milestone_dispute: Account<'info, MilestoneDispute>,
    #[account(
        mut,
        seeds = [b"milestone", job.key().as_ref(), &[milestone.milestone_index]],
        bump = milestone.bump
    )]
    pub milestone: Account<'info, Milestone>,
    #[account(
        mut,
        seeds = [b"ms-escrow", milestone.key().as_ref()],
        bump = milestone_escrow.bump
    )]
    pub milestone_escrow: Account<'info, MilestoneEscrow>,
    #[account(mut)]
    pub job: Account<'info, Job>,
    #[account(mut)]
    pub initiator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// ==================== STATE ACCOUNTS ====================

#[account]
#[derive(InitSpace)]
pub struct JobMilestoneConfig {
    pub job: Pubkey,
    pub client: Pubkey,
    pub total_milestones: u8,
    pub created_count: u8,
    pub funded_count: u8,
    pub approved_count: u8,
    pub total_funded: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Milestone {
    pub job: Pubkey,
    pub milestone_index: u8,
    #[max_len(100)]
    pub title: String,
    #[max_len(500)]
    pub description: String,
    pub amount: u64,
    pub status: MilestoneStatus,
    #[max_len(200)]
    pub deliverable_uri: String,
    pub submitted_at: Option<i64>,
    pub approved_at: Option<i64>,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct MilestoneEscrow {
    pub job: Pubkey,
    pub milestone: Pubkey,
    pub client: Pubkey,
    pub freelancer: Pubkey,
    pub amount: u64,
    pub locked: bool,
    pub released: bool,
    pub disputed: bool,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct MilestoneDispute {
    pub job: Pubkey,
    pub milestone: Pubkey,
    pub escrow: Pubkey,
    pub client: Pubkey,
    pub freelancer: Pubkey,
    pub initiator: Pubkey,
    #[max_len(500)]
    pub reason: String,
    pub status: crate::DisputeStatus,
    pub votes_for_client: u32,
    pub votes_for_freelancer: u32,
    pub created_at: i64,
    pub resolved_at: Option<i64>,
    pub bump: u8,
}

// ==================== ENUMS ====================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum MilestoneStatus {
    Pending,
    Funded,
    InProgress,
    Submitted,
    Approved,
    Disputed,
    Cancelled,
}

// ==================== EVENTS ====================

#[event]
pub struct MilestoneConfigCreated {
    pub job: Pubkey,
    pub client: Pubkey,
    pub total_milestones: u8,
    pub timestamp: i64,
}

#[event]
pub struct MilestoneCreated {
    pub job: Pubkey,
    pub milestone: Pubkey,
    pub milestone_index: u8,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct MilestoneFunded {
    pub job: Pubkey,
    pub milestone: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct MilestoneWorkSubmitted {
    pub job: Pubkey,
    pub milestone: Pubkey,
    pub freelancer: Pubkey,
    pub deliverable_uri: String,
    pub timestamp: i64,
}

#[event]
pub struct MilestoneApproved {
    pub job: Pubkey,
    pub milestone: Pubkey,
    pub freelancer: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct MilestoneRejected {
    pub job: Pubkey,
    pub milestone: Pubkey,
    pub freelancer: Pubkey,
    pub reason: String,
    pub timestamp: i64,
}

#[event]
pub struct MilestoneDisputed {
    pub job: Pubkey,
    pub milestone: Pubkey,
    pub initiator: Pubkey,
    pub reason: String,
    pub timestamp: i64,
}

// ==================== ERRORS ====================

#[error_code]
pub enum MilestoneError {
    #[msg("Invalid milestone count (must be 1-10)")]
    InvalidMilestoneCount,
    #[msg("Invalid milestone index")]
    InvalidMilestoneIndex,
    #[msg("All milestones already created")]
    AllMilestonesCreated,
    #[msg("Milestone amounts exceed job budget")]
    MilestoneAmountsExceedBudget,
    #[msg("Amount overflow")]
    AmountOverflow,
    #[msg("Milestone is not in pending status")]
    MilestoneNotPending,
    #[msg("Milestone is not active (funded or in progress)")]
    MilestoneNotActive,
    #[msg("Milestone is not submitted")]
    MilestoneNotSubmitted,
    #[msg("Milestone cannot be disputed in current status")]
    MilestoneCannotBeDisputed,
}
