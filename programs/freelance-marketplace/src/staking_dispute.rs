use anchor_lang::prelude::*;
use solana_program::hash::hashv;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{Dispute, DisputeStatus, ErrorCode};

// ==================== STAKING-BASED DISPUTE RESOLUTION (KLEROS-STYLE) ====================

/// Initialize dispute configuration (admin one-time setup)
pub fn init_dispute_config(
    ctx: Context<InitDisputeConfig>,
    min_stake_amount: u64,
    juror_count: u8,
    voting_period: i64,
    slash_percentage: u8,
    reward_percentage: u8,
    quorum_percentage: u8,
) -> Result<()> {
    let config = &mut ctx.accounts.dispute_config;

    require!(min_stake_amount > 0, StakingError::InvalidStakeAmount);
    require!(juror_count >= 3 && juror_count <= 11, StakingError::InvalidJurorCount);
    require!(voting_period >= 3600, StakingError::VotingPeriodTooShort); // Min 1 hour
    require!(slash_percentage <= 50, StakingError::SlashPercentageTooHigh);
    require!(reward_percentage <= 100, StakingError::InvalidRewardPercentage);
    require!(quorum_percentage >= 50 && quorum_percentage <= 100, StakingError::InvalidQuorumPercentage);

    config.admin = ctx.accounts.admin.key();
    config.staking_token_mint = ctx.accounts.staking_token_mint.key();
    config.min_stake_amount = min_stake_amount;
    config.juror_count = juror_count;
    config.voting_period = voting_period;
    config.slash_percentage = slash_percentage;
    config.reward_percentage = reward_percentage;
    config.quorum_percentage = quorum_percentage;
    config.bump = ctx.bumps.dispute_config;

    emit!(DisputeConfigInitialized {
        admin: config.admin,
        staking_token_mint: config.staking_token_mint,
        min_stake_amount,
        juror_count,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

/// Initialize juror registry (admin one-time setup)
pub fn init_juror_registry(ctx: Context<InitJurorRegistry>) -> Result<()> {
    let registry = &mut ctx.accounts.juror_registry;

    registry.admin = ctx.accounts.admin.key();
    registry.total_jurors = 0;
    registry.juror_list = Vec::new();
    registry.bump = ctx.bumps.juror_registry;

    Ok(())
}

/// Stake tokens to become eligible as a juror
pub fn stake_for_jury(ctx: Context<StakeForJury>, amount: u64) -> Result<()> {
    let config = &ctx.accounts.dispute_config;
    let registry = &mut ctx.accounts.juror_registry;
    let stake = &mut ctx.accounts.juror_stake;
    let clock = Clock::get()?;

    require!(amount >= config.min_stake_amount, StakingError::InsufficientStakeAmount);
    require!(registry.juror_list.len() < 100, StakingError::RegistryFull);

    // Transfer tokens to jury vault
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.juror_token_account.to_account_info(),
                to: ctx.accounts.jury_vault.to_account_info(),
                authority: ctx.accounts.juror.to_account_info(),
            },
        ),
        amount,
    )?;

    stake.juror = ctx.accounts.juror.key();
    stake.amount = amount;
    stake.staked_at = clock.unix_timestamp;
    stake.active = true;
    stake.disputes_participated = 0;
    stake.disputes_correct = 0;
    stake.active_dispute_count = 0;
    stake.bump = ctx.bumps.juror_stake;

    // Add to registry
    registry.juror_list.push(ctx.accounts.juror.key());
    registry.total_jurors += 1;

    emit!(JurorStaked {
        juror: ctx.accounts.juror.key(),
        amount,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Unstake tokens and leave the juror pool
pub fn unstake_from_jury(ctx: Context<UnstakeFromJury>) -> Result<()> {
    let registry = &mut ctx.accounts.juror_registry;
    let stake = &mut ctx.accounts.juror_stake;

    require!(stake.active, StakingError::StakeNotActive);
    require!(stake.active_dispute_count == 0, StakingError::ActiveDisputesPending);

    let amount = stake.amount;

    // Transfer tokens back from jury vault
    let config_bump = ctx.accounts.dispute_config.bump;
    let seeds = &[b"dispute-config".as_ref(), &[config_bump]];
    let signer = &[&seeds[..]];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.jury_vault.to_account_info(),
                to: ctx.accounts.juror_token_account.to_account_info(),
                authority: ctx.accounts.dispute_config.to_account_info(),
            },
            signer,
        ),
        amount,
    )?;

    stake.active = false;
    stake.amount = 0;

    // Remove from registry
    let juror_key = ctx.accounts.juror.key();
    if let Some(pos) = registry.juror_list.iter().position(|k| *k == juror_key) {
        registry.juror_list.swap_remove(pos);
        registry.total_jurors = registry.total_jurors.saturating_sub(1);
    }

    emit!(JurorUnstaked {
        juror: juror_key,
        amount,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

/// Select random jurors for a dispute
pub fn select_jurors(ctx: Context<SelectJurors>) -> Result<()> {
    let config = &ctx.accounts.dispute_config;
    let registry = &ctx.accounts.juror_registry;
    let selection = &mut ctx.accounts.juror_selection;
    let dispute = &ctx.accounts.dispute;
    let clock = Clock::get()?;

    require!(dispute.status == DisputeStatus::Open, ErrorCode::DisputeNotOpen);
    require!(
        registry.total_jurors as u8 >= config.juror_count,
        StakingError::NotEnoughJurors
    );

    // Generate pseudo-random seed from slot + dispute key
    let mut seed_input = Vec::new();
    seed_input.extend_from_slice(&clock.slot.to_le_bytes());
    seed_input.extend_from_slice(dispute.key().as_ref());
    seed_input.extend_from_slice(&clock.unix_timestamp.to_le_bytes());
    let seed = hashv(&[&seed_input]).to_bytes();

    // Select jurors using hash-based pseudo-random selection
    let pool_size = registry.juror_list.len();
    let count = config.juror_count as usize;
    let mut selected: Vec<Pubkey> = Vec::new();
    let mut current_hash = seed;

    // Exclude dispute parties from being jurors
    let client = dispute.client;
    let freelancer = dispute.freelancer;

    let mut attempts = 0;
    while selected.len() < count && attempts < count * 10 {
        current_hash = hashv(&[&current_hash]).to_bytes();
        let index = u64::from_le_bytes(current_hash[0..8].try_into().unwrap()) as usize % pool_size;
        let candidate = registry.juror_list[index];

        // Skip if already selected or is a dispute party
        if !selected.contains(&candidate) && candidate != client && candidate != freelancer {
            selected.push(candidate);
        }
        attempts += 1;
    }

    require!(selected.len() == count, StakingError::JurorSelectionFailed);

    selection.dispute = dispute.key();
    selection.selected_jurors = selected;
    selection.selection_seed = seed;
    selection.voting_deadline = clock.unix_timestamp + config.voting_period;
    selection.votes_cast = 0;
    selection.quorum_met = false;
    selection.resolved = false;
    selection.bump = ctx.bumps.juror_selection;

    emit!(JurorsSelected {
        dispute: dispute.key(),
        juror_count: config.juror_count,
        voting_deadline: selection.voting_deadline,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Cast a staked vote on a dispute (only selected jurors)
pub fn cast_staked_vote(
    ctx: Context<CastStakedVote>,
    vote_for_client: bool,
) -> Result<()> {
    let selection = &mut ctx.accounts.juror_selection;
    let stake = &mut ctx.accounts.juror_stake;
    let vote_record = &mut ctx.accounts.staked_vote_record;
    let config = &ctx.accounts.dispute_config;
    let clock = Clock::get()?;

    let juror = ctx.accounts.juror.key();

    // Verify juror is selected for this dispute
    require!(
        selection.selected_jurors.contains(&juror),
        StakingError::NotSelectedJuror
    );
    require!(!selection.resolved, StakingError::DisputeAlreadyResolved);

    // Check voting deadline
    require!(
        clock.unix_timestamp <= selection.voting_deadline,
        StakingError::VotingPeriodExpired
    );

    // Calculate stake to lock (proportional to their stake)
    let lock_amount = stake.amount
        .checked_mul(config.slash_percentage as u64)
        .ok_or(StakingError::CalculationOverflow)?
        .checked_div(100)
        .ok_or(StakingError::CalculationOverflow)?;

    vote_record.dispute = selection.dispute;
    vote_record.juror = juror;
    vote_record.vote_for_client = vote_for_client;
    vote_record.voted_at = clock.unix_timestamp;
    vote_record.stake_locked = lock_amount;
    vote_record.reward_claimed = false;
    vote_record.slashed = false;
    vote_record.bump = ctx.bumps.staked_vote_record;

    selection.votes_cast += 1;

    // Check quorum
    let quorum_needed = (selection.selected_jurors.len() as u8)
        .checked_mul(config.quorum_percentage)
        .ok_or(StakingError::CalculationOverflow)?
        .checked_div(100)
        .ok_or(StakingError::CalculationOverflow)?;

    if selection.votes_cast >= quorum_needed.max(1) {
        selection.quorum_met = true;
    }

    stake.disputes_participated += 1;
    stake.active_dispute_count += 1;

    emit!(StakedVoteCast {
        dispute: selection.dispute,
        juror,
        vote_for_client,
        stake_locked: lock_amount,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Resolve a staked dispute after voting period ends
pub fn resolve_staked_dispute(ctx: Context<ResolveStakedDispute>) -> Result<()> {
    let selection = &mut ctx.accounts.juror_selection;
    let dispute = &mut ctx.accounts.dispute;
    let escrow = &mut ctx.accounts.escrow;
    let job = &mut ctx.accounts.job;
    let clock = Clock::get()?;

    require!(dispute.status == DisputeStatus::Open, ErrorCode::DisputeNotOpen);
    require!(selection.quorum_met, StakingError::QuorumNotMet);
    require!(
        clock.unix_timestamp > selection.voting_deadline,
        StakingError::VotingPeriodNotEnded
    );
    require!(!selection.resolved, StakingError::DisputeAlreadyResolved);

    let winner_is_client = dispute.votes_for_client > dispute.votes_for_freelancer;

    // Transfer escrow to winner
    **escrow.to_account_info().try_borrow_mut_lamports()? -= escrow.amount;

    if winner_is_client {
        **ctx.accounts.client.to_account_info().try_borrow_mut_lamports()? += escrow.amount;
        dispute.status = DisputeStatus::ResolvedClient;
    } else {
        **ctx.accounts.freelancer.to_account_info().try_borrow_mut_lamports()? += escrow.amount;
        dispute.status = DisputeStatus::ResolvedFreelancer;
    }

    dispute.resolved_at = Some(clock.unix_timestamp);
    escrow.released = true;
    escrow.locked = false;
    job.status = crate::JobStatus::Completed;
    job.updated_at = clock.unix_timestamp;
    selection.resolved = true;

    emit!(StakedDisputeResolved {
        dispute: dispute.key(),
        winner_is_client,
        votes_for_client: dispute.votes_for_client,
        votes_for_freelancer: dispute.votes_for_freelancer,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Claim staking reward after dispute resolution
/// Majority voters get rewarded, minority voters get slashed
pub fn claim_staking_reward(ctx: Context<ClaimStakingReward>) -> Result<()> {
    let selection = &ctx.accounts.juror_selection;
    let dispute = &ctx.accounts.dispute;
    let vote_record = &mut ctx.accounts.staked_vote_record;
    let stake = &mut ctx.accounts.juror_stake;
    let config = &ctx.accounts.dispute_config;
    let clock = Clock::get()?;

    require!(selection.resolved, StakingError::DisputeNotYetResolved);
    require!(!vote_record.reward_claimed, StakingError::RewardAlreadyClaimed);

    let winner_is_client = dispute.status == DisputeStatus::ResolvedClient;
    let voted_with_majority = vote_record.vote_for_client == winner_is_client;

    if voted_with_majority {
        // Reward: get back locked stake + share of slashed tokens
        let reward = vote_record.stake_locked
            .checked_mul(config.reward_percentage as u64)
            .ok_or(StakingError::CalculationOverflow)?
            .checked_div(100)
            .ok_or(StakingError::CalculationOverflow)?;

        // Transfer reward from jury vault
        let config_bump = config.bump;
        let seeds = &[b"dispute-config".as_ref(), &[config_bump]];
        let signer = &[&seeds[..]];

        if reward > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.jury_vault.to_account_info(),
                        to: ctx.accounts.juror_token_account.to_account_info(),
                        authority: ctx.accounts.dispute_config.to_account_info(),
                    },
                    signer,
                ),
                reward,
            )?;
        }

        stake.disputes_correct += 1;

        emit!(StakingRewardClaimed {
            dispute: dispute.key(),
            juror: ctx.accounts.juror.key(),
            reward_amount: reward,
            slashed: false,
            timestamp: clock.unix_timestamp,
        });
    } else {
        // Slash: lose locked stake
        vote_record.slashed = true;

        emit!(StakingRewardClaimed {
            dispute: dispute.key(),
            juror: ctx.accounts.juror.key(),
            reward_amount: 0,
            slashed: true,
            timestamp: clock.unix_timestamp,
        });
    }

    vote_record.reward_claimed = true;
    stake.active_dispute_count = stake.active_dispute_count.saturating_sub(1);

    Ok(())
}

// ==================== CONTEXTS ====================

#[derive(Accounts)]
pub struct InitDisputeConfig<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + DisputeConfig::INIT_SPACE,
        seeds = [b"dispute-config"],
        bump
    )]
    pub dispute_config: Account<'info, DisputeConfig>,
    pub staking_token_mint: Account<'info, token::Mint>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitJurorRegistry<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + JurorRegistry::INIT_SPACE,
        seeds = [b"juror-registry"],
        bump
    )]
    pub juror_registry: Account<'info, JurorRegistry>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StakeForJury<'info> {
    #[account(
        init,
        payer = juror,
        space = 8 + JurorStake::INIT_SPACE,
        seeds = [b"juror-stake", juror.key().as_ref()],
        bump
    )]
    pub juror_stake: Account<'info, JurorStake>,

    #[account(
        seeds = [b"dispute-config"],
        bump = dispute_config.bump
    )]
    pub dispute_config: Account<'info, DisputeConfig>,

    #[account(
        mut,
        seeds = [b"juror-registry"],
        bump = juror_registry.bump,
        realloc = 8 + 32 + 4 + 4 + (juror_registry.juror_list.len() + 1) * 32 + 1,
        realloc::payer = juror,
        realloc::zero = false
    )]
    pub juror_registry: Account<'info, JurorRegistry>,

    #[account(
        mut,
        constraint = juror_token_account.owner == juror.key(),
        constraint = juror_token_account.mint == dispute_config.staking_token_mint
    )]
    pub juror_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = jury_vault.mint == dispute_config.staking_token_mint
    )]
    pub jury_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub juror: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UnstakeFromJury<'info> {
    #[account(
        mut,
        seeds = [b"juror-stake", juror.key().as_ref()],
        bump = juror_stake.bump
    )]
    pub juror_stake: Account<'info, JurorStake>,

    #[account(
        seeds = [b"dispute-config"],
        bump = dispute_config.bump
    )]
    pub dispute_config: Account<'info, DisputeConfig>,

    #[account(
        mut,
        seeds = [b"juror-registry"],
        bump = juror_registry.bump
    )]
    pub juror_registry: Account<'info, JurorRegistry>,

    #[account(
        mut,
        constraint = juror_token_account.owner == juror.key(),
        constraint = juror_token_account.mint == dispute_config.staking_token_mint
    )]
    pub juror_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = jury_vault.mint == dispute_config.staking_token_mint
    )]
    pub jury_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub juror: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SelectJurors<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + DisputeJurorSelection::INIT_SPACE,
        seeds = [b"juror-selection", dispute.key().as_ref()],
        bump
    )]
    pub juror_selection: Account<'info, DisputeJurorSelection>,

    pub dispute: Account<'info, Dispute>,

    #[account(
        seeds = [b"dispute-config"],
        bump = dispute_config.bump
    )]
    pub dispute_config: Account<'info, DisputeConfig>,

    #[account(
        seeds = [b"juror-registry"],
        bump = juror_registry.bump
    )]
    pub juror_registry: Account<'info, JurorRegistry>,

    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CastStakedVote<'info> {
    #[account(
        init,
        payer = juror,
        space = 8 + StakedVoteRecord::INIT_SPACE,
        seeds = [b"staked-vote", juror_selection.dispute.as_ref(), juror.key().as_ref()],
        bump
    )]
    pub staked_vote_record: Account<'info, StakedVoteRecord>,

    #[account(
        mut,
        seeds = [b"juror-selection", juror_selection.dispute.as_ref()],
        bump = juror_selection.bump
    )]
    pub juror_selection: Account<'info, DisputeJurorSelection>,

    #[account(
        mut,
        seeds = [b"juror-stake", juror.key().as_ref()],
        bump = juror_stake.bump
    )]
    pub juror_stake: Account<'info, JurorStake>,

    #[account(
        mut,
        constraint = dispute.key() == juror_selection.dispute
    )]
    pub dispute: Account<'info, Dispute>,

    #[account(
        seeds = [b"dispute-config"],
        bump = dispute_config.bump
    )]
    pub dispute_config: Account<'info, DisputeConfig>,

    #[account(mut)]
    pub juror: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveStakedDispute<'info> {
    #[account(
        mut,
        seeds = [b"juror-selection", dispute.key().as_ref()],
        bump = juror_selection.bump
    )]
    pub juror_selection: Account<'info, DisputeJurorSelection>,

    #[account(mut)]
    pub dispute: Account<'info, Dispute>,

    #[account(mut)]
    pub escrow: Account<'info, crate::Escrow>,

    #[account(mut)]
    pub job: Account<'info, crate::Job>,

    /// CHECK: client potentially receiving refund
    #[account(mut)]
    pub client: AccountInfo<'info>,

    /// CHECK: freelancer potentially receiving payment
    #[account(mut)]
    pub freelancer: AccountInfo<'info>,

    pub resolver: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimStakingReward<'info> {
    #[account(
        seeds = [b"juror-selection", dispute.key().as_ref()],
        bump = juror_selection.bump
    )]
    pub juror_selection: Account<'info, DisputeJurorSelection>,

    pub dispute: Account<'info, Dispute>,

    #[account(
        mut,
        seeds = [b"staked-vote", dispute.key().as_ref(), juror.key().as_ref()],
        bump = staked_vote_record.bump
    )]
    pub staked_vote_record: Account<'info, StakedVoteRecord>,

    #[account(
        mut,
        seeds = [b"juror-stake", juror.key().as_ref()],
        bump = juror_stake.bump
    )]
    pub juror_stake: Account<'info, JurorStake>,

    #[account(
        seeds = [b"dispute-config"],
        bump = dispute_config.bump
    )]
    pub dispute_config: Account<'info, DisputeConfig>,

    #[account(
        mut,
        constraint = jury_vault.mint == dispute_config.staking_token_mint
    )]
    pub jury_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = juror_token_account.owner == juror.key(),
        constraint = juror_token_account.mint == dispute_config.staking_token_mint
    )]
    pub juror_token_account: Account<'info, TokenAccount>,

    pub juror: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

// ==================== STATE ACCOUNTS ====================

#[account]
#[derive(InitSpace)]
pub struct DisputeConfig {
    pub admin: Pubkey,
    pub staking_token_mint: Pubkey,
    pub min_stake_amount: u64,
    pub juror_count: u8,
    pub voting_period: i64,
    pub slash_percentage: u8,
    pub reward_percentage: u8,
    pub quorum_percentage: u8,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct JurorRegistry {
    pub admin: Pubkey,
    pub total_jurors: u32,
    #[max_len(100)]
    pub juror_list: Vec<Pubkey>,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct JurorStake {
    pub juror: Pubkey,
    pub amount: u64,
    pub staked_at: i64,
    pub active: bool,
    pub disputes_participated: u32,
    pub disputes_correct: u32,
    pub active_dispute_count: u32,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct DisputeJurorSelection {
    pub dispute: Pubkey,
    #[max_len(11)]
    pub selected_jurors: Vec<Pubkey>,
    pub selection_seed: [u8; 32],
    pub voting_deadline: i64,
    pub votes_cast: u8,
    pub quorum_met: bool,
    pub resolved: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct StakedVoteRecord {
    pub dispute: Pubkey,
    pub juror: Pubkey,
    pub vote_for_client: bool,
    pub voted_at: i64,
    pub stake_locked: u64,
    pub reward_claimed: bool,
    pub slashed: bool,
    pub bump: u8,
}

// ==================== EVENTS ====================

#[event]
pub struct DisputeConfigInitialized {
    pub admin: Pubkey,
    pub staking_token_mint: Pubkey,
    pub min_stake_amount: u64,
    pub juror_count: u8,
    pub timestamp: i64,
}

#[event]
pub struct JurorStaked {
    pub juror: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct JurorUnstaked {
    pub juror: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct JurorsSelected {
    pub dispute: Pubkey,
    pub juror_count: u8,
    pub voting_deadline: i64,
    pub timestamp: i64,
}

#[event]
pub struct StakedVoteCast {
    pub dispute: Pubkey,
    pub juror: Pubkey,
    pub vote_for_client: bool,
    pub stake_locked: u64,
    pub timestamp: i64,
}

#[event]
pub struct StakedDisputeResolved {
    pub dispute: Pubkey,
    pub winner_is_client: bool,
    pub votes_for_client: u32,
    pub votes_for_freelancer: u32,
    pub timestamp: i64,
}

#[event]
pub struct StakingRewardClaimed {
    pub dispute: Pubkey,
    pub juror: Pubkey,
    pub reward_amount: u64,
    pub slashed: bool,
    pub timestamp: i64,
}

// ==================== ERRORS ====================

#[error_code]
pub enum StakingError {
    #[msg("Invalid stake amount")]
    InvalidStakeAmount,
    #[msg("Juror count must be between 3 and 11")]
    InvalidJurorCount,
    #[msg("Voting period must be at least 1 hour")]
    VotingPeriodTooShort,
    #[msg("Slash percentage must not exceed 50%")]
    SlashPercentageTooHigh,
    #[msg("Invalid reward percentage")]
    InvalidRewardPercentage,
    #[msg("Invalid quorum percentage (must be 50-100)")]
    InvalidQuorumPercentage,
    #[msg("Insufficient stake amount")]
    InsufficientStakeAmount,
    #[msg("Juror registry is full (max 100)")]
    RegistryFull,
    #[msg("Stake is not active")]
    StakeNotActive,
    #[msg("Cannot unstake with active disputes pending")]
    ActiveDisputesPending,
    #[msg("Not enough jurors in registry")]
    NotEnoughJurors,
    #[msg("Juror selection failed")]
    JurorSelectionFailed,
    #[msg("Not a selected juror for this dispute")]
    NotSelectedJuror,
    #[msg("Dispute already resolved")]
    DisputeAlreadyResolved,
    #[msg("Voting period has expired")]
    VotingPeriodExpired,
    #[msg("Calculation overflow")]
    CalculationOverflow,
    #[msg("Quorum not met")]
    QuorumNotMet,
    #[msg("Voting period has not ended")]
    VotingPeriodNotEnded,
    #[msg("Dispute not yet resolved")]
    DisputeNotYetResolved,
    #[msg("Reward already claimed")]
    RewardAlreadyClaimed,
}
