use anchor_lang::prelude::*;

use crate::{Dispute, DisputeStatus, ErrorCode, VoteRecord};

// ==================== ARBITRATOR FEE MANAGER ====================

pub const ARBITRATOR_FEE_PERCENTAGE: u64 = 2; // 2% of escrow amount
pub const MAX_ARBITRATORS_PER_DISPUTE: usize = 20;

/// Calculate arbitrator fee from escrow amount
pub fn calculate_arbitrator_fee(escrow_amount: u64) -> u64 {
    escrow_amount
        .checked_mul(ARBITRATOR_FEE_PERCENTAGE)
        .unwrap()
        .checked_div(100)
        .unwrap()
}

/// Calculate individual arbitrator share
pub fn calculate_arbitrator_share(total_fee: u64, num_voters: u32) -> u64 {
    if num_voters == 0 {
        return 0;
    }
    total_fee.checked_div(num_voters as u64).unwrap_or(0)
}

/// Distribute fees to arbitrators who voted on a dispute
pub fn distribute_arbitrator_fees(
    ctx: Context<DistributeArbitratorFees>,
) -> Result<()> {
    let dispute = &ctx.accounts.dispute;
    let escrow_amount = ctx.accounts.escrow_amount();

    require!(
        dispute.status != DisputeStatus::Open,
        ErrorCode::DisputeNotResolved
    );

    let total_votes = dispute.votes_for_client + dispute.votes_for_freelancer;
    require!(total_votes > 0, ErrorCode::NoVotesToDistribute);

    // Calculate total arbitrator fee
    let total_arbitrator_fee = calculate_arbitrator_fee(escrow_amount);
    let share_per_voter = calculate_arbitrator_share(total_arbitrator_fee, total_votes);

    require!(share_per_voter > 0, ErrorCode::FeeShareTooSmall);

    // Distribute to each voter
    // Note: In production, this would iterate through all vote records
    // For this implementation, we'll emit an event for tracking
    emit!(ArbitratorFeesDistributed {
        dispute: dispute.key(),
        total_fee: total_arbitrator_fee,
        num_voters: total_votes,
        share_per_voter,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

/// Claim arbitrator fee for a specific dispute vote
pub fn claim_arbitrator_fee(ctx: Context<ClaimArbitratorFee>) -> Result<()> {
    let dispute = &ctx.accounts.dispute;
    let escrow_amount = ctx.accounts.escrow_amount();

    // Verify dispute is resolved
    require!(
        dispute.status != DisputeStatus::Open,
        ErrorCode::DisputeNotResolved
    );

    let vote_record = &mut ctx.accounts.vote_record;

    // Verify voter hasn't claimed yet
    require!(!vote_record.fee_claimed, ErrorCode::FeeAlreadyClaimed);

    // Calculate share
    let total_votes = dispute.votes_for_client + dispute.votes_for_freelancer;
    let total_arbitrator_fee = calculate_arbitrator_fee(escrow_amount);
    let share = calculate_arbitrator_share(total_arbitrator_fee, total_votes);

    require!(share > 0, ErrorCode::FeeShareTooSmall);

    // Transfer SOL to arbitrator
    **ctx.accounts.escrow_fee_vault.try_borrow_mut_lamports()? -= share;
    **ctx.accounts.arbitrator.try_borrow_mut_lamports()? += share;

    // Mark as claimed
    vote_record.fee_claimed = true;

    emit!(ArbitratorFeeClaimed {
        dispute: dispute.key(),
        arbitrator: ctx.accounts.arbitrator.key(),
        amount: share,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

// ==================== CONTEXTS ====================

#[derive(Accounts)]
pub struct DistributeArbitratorFees<'info> {
    #[account(mut)]
    pub dispute: Account<'info, Dispute>,
    /// CHECK: Escrow account to calculate fees from
    pub escrow_account: AccountInfo<'info>,
    pub authority: Signer<'info>,
}

impl<'info> DistributeArbitratorFees<'info> {
    pub fn escrow_amount(&self) -> u64 {
        self.escrow_account.lamports()
    }
}

#[derive(Accounts)]
pub struct ClaimArbitratorFee<'info> {
    pub dispute: Account<'info, Dispute>,

    #[account(
        mut,
        seeds = [b"vote", dispute.key().as_ref(), arbitrator.key().as_ref()],
        bump = vote_record.bump
    )]
    pub vote_record: Account<'info, VoteRecord>,

    #[account(mut)]
    /// CHECK: Fee vault for storing arbitrator fees
    pub escrow_fee_vault: AccountInfo<'info>,

    #[account(mut)]
    pub arbitrator: Signer<'info>,
}

impl<'info> ClaimArbitratorFee<'info> {
    pub fn escrow_amount(&self) -> u64 {
        self.escrow_fee_vault.lamports()
    }
}

// ==================== ENHANCED VOTE RECORD ====================

// Note: This extends the existing VoteRecord struct
// In production, add this field to the VoteRecord struct in lib.rs:
// pub fee_claimed: bool,

// ==================== EVENTS ====================

#[event]
pub struct ArbitratorFeesDistributed {
    pub dispute: Pubkey,
    pub total_fee: u64,
    pub num_voters: u32,
    pub share_per_voter: u64,
    pub timestamp: i64,
}

#[event]
pub struct ArbitratorFeeClaimed {
    pub dispute: Pubkey,
    pub arbitrator: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}
