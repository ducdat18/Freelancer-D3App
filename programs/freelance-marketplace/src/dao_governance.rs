use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

// ==================== DAO GOVERNANCE (REPUTATION-WEIGHTED) ====================

/// Initialize DAO configuration
pub fn init_dao_config(
    ctx: Context<InitDAOConfig>,
    min_proposal_stake: u64,
    voting_period: i64,
    quorum_percentage: u8,
    reputation_multiplier: u8,
) -> Result<()> {
    require!(voting_period >= 3600, DAOError::VotingPeriodTooShort); // min 1 hour
    require!(quorum_percentage >= 10 && quorum_percentage <= 100, DAOError::InvalidQuorum);
    require!(reputation_multiplier <= 200, DAOError::InvalidMultiplier);

    let config = &mut ctx.accounts.dao_config;
    let clock = Clock::get()?;

    config.admin = ctx.accounts.admin.key();
    config.token_mint = ctx.accounts.token_mint.key();
    config.proposal_count = 0;
    config.min_proposal_stake = min_proposal_stake;
    config.voting_period = voting_period;
    config.quorum_percentage = quorum_percentage;
    config.reputation_multiplier = reputation_multiplier;
    config.total_proposals_executed = 0;
    config.bump = ctx.bumps.dao_config;

    emit!(DAOConfigInitialized {
        admin: config.admin,
        token_mint: config.token_mint,
        voting_period,
        quorum_percentage,
        reputation_multiplier,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Create a new governance proposal
pub fn create_proposal(
    ctx: Context<CreateProposal>,
    title: String,
    description_uri: String,
    proposal_type: u8,
) -> Result<()> {
    let config = &mut ctx.accounts.dao_config;
    let proposal = &mut ctx.accounts.proposal;
    let clock = Clock::get()?;

    require!(title.len() <= 100, DAOError::TitleTooLong);
    require!(description_uri.len() <= 200, DAOError::URITooLong);
    require!(proposal_type <= 4, DAOError::InvalidProposalType);

    // Stake tokens to create proposal
    if config.min_proposal_stake > 0 {
        let cpi_accounts = Transfer {
            from: ctx.accounts.proposer_token_account.to_account_info(),
            to: ctx.accounts.proposal_stake_vault.to_account_info(),
            authority: ctx.accounts.proposer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        token::transfer(CpiContext::new(cpi_program, cpi_accounts), config.min_proposal_stake)?;
    }

    let proposal_id = config.proposal_count;

    proposal.id = proposal_id;
    proposal.proposer = ctx.accounts.proposer.key();
    proposal.title = title;
    proposal.description_uri = description_uri;
    proposal.proposal_type = proposal_type;
    proposal.status = ProposalStatus::Active as u8;
    proposal.votes_for = 0;
    proposal.votes_against = 0;
    proposal.total_voters = 0;
    proposal.stake_amount = config.min_proposal_stake;
    proposal.created_at = clock.unix_timestamp;
    proposal.voting_ends_at = clock.unix_timestamp.checked_add(config.voting_period)
        .ok_or(DAOError::Overflow)?;
    proposal.executed = false;
    proposal.bump = ctx.bumps.proposal;

    config.proposal_count = config.proposal_count.checked_add(1).ok_or(DAOError::Overflow)?;

    emit!(ProposalCreated {
        proposal_id,
        proposer: proposal.proposer,
        title: proposal.title.clone(),
        proposal_type,
        voting_ends_at: proposal.voting_ends_at,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Cast a vote on a proposal (reputation-weighted)
pub fn cast_dao_vote(
    ctx: Context<CastDAOVote>,
    vote_for: bool,
    token_amount: u64,
    sbt_count: u32,
) -> Result<()> {
    let config = &ctx.accounts.dao_config;
    let proposal = &mut ctx.accounts.proposal;
    let vote = &mut ctx.accounts.dao_vote;
    let clock = Clock::get()?;

    require!(proposal.status == ProposalStatus::Active as u8, DAOError::ProposalNotActive);
    require!(clock.unix_timestamp < proposal.voting_ends_at, DAOError::VotingPeriodEnded);
    require!(token_amount > 0, DAOError::InvalidVoteWeight);

    // Calculate reputation-weighted vote power
    // weight = token_amount * (1 + sbt_count * reputation_multiplier / 100)
    let reputation_bonus = (sbt_count as u64)
        .checked_mul(config.reputation_multiplier as u64).ok_or(DAOError::Overflow)?
        .checked_div(100).ok_or(DAOError::Overflow)?;
    let multiplier = 1u64.checked_add(reputation_bonus).ok_or(DAOError::Overflow)?;
    let vote_weight = token_amount.checked_mul(multiplier).ok_or(DAOError::Overflow)?;

    vote.proposal = proposal.key();
    vote.voter = ctx.accounts.voter.key();
    vote.vote_weight = vote_weight;
    vote.vote_for = vote_for;
    vote.token_amount = token_amount;
    vote.sbt_count = sbt_count;
    vote.voted_at = clock.unix_timestamp;
    vote.bump = ctx.bumps.dao_vote;

    if vote_for {
        proposal.votes_for = proposal.votes_for.checked_add(vote_weight).ok_or(DAOError::Overflow)?;
    } else {
        proposal.votes_against = proposal.votes_against.checked_add(vote_weight).ok_or(DAOError::Overflow)?;
    }
    proposal.total_voters = proposal.total_voters.checked_add(1).ok_or(DAOError::Overflow)?;

    emit!(DAOVoteCast {
        proposal_id: proposal.id,
        voter: vote.voter,
        vote_for,
        vote_weight,
        token_amount,
        sbt_count,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Finalize a proposal after voting period ends
pub fn finalize_proposal(ctx: Context<FinalizeProposal>) -> Result<()> {
    let config = &ctx.accounts.dao_config;
    let proposal = &mut ctx.accounts.proposal;
    let clock = Clock::get()?;

    require!(proposal.status == ProposalStatus::Active as u8, DAOError::ProposalNotActive);
    require!(clock.unix_timestamp >= proposal.voting_ends_at, DAOError::VotingPeriodNotEnded);

    let total_votes = proposal.votes_for.checked_add(proposal.votes_against).ok_or(DAOError::Overflow)?;

    // Check quorum
    let quorum_met = if total_votes > 0 {
        // Simple quorum: enough voters participated
        proposal.total_voters >= (config.quorum_percentage as u32)
    } else {
        false
    };

    if quorum_met && proposal.votes_for > proposal.votes_against {
        proposal.status = ProposalStatus::Approved as u8;
    } else if !quorum_met {
        proposal.status = ProposalStatus::QuorumNotMet as u8;
    } else {
        proposal.status = ProposalStatus::Rejected as u8;
    }

    emit!(ProposalFinalized {
        proposal_id: proposal.id,
        status: proposal.status,
        votes_for: proposal.votes_for,
        votes_against: proposal.votes_against,
        total_voters: proposal.total_voters,
        quorum_met,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Execute an approved proposal
pub fn execute_proposal(ctx: Context<ExecuteProposal>) -> Result<()> {
    let proposal = &mut ctx.accounts.proposal;
    let config = &mut ctx.accounts.dao_config;
    let clock = Clock::get()?;

    require!(proposal.status == ProposalStatus::Approved as u8, DAOError::ProposalNotApproved);
    require!(!proposal.executed, DAOError::AlreadyExecuted);

    proposal.executed = true;
    proposal.status = ProposalStatus::Executed as u8;
    config.total_proposals_executed = config.total_proposals_executed
        .checked_add(1).ok_or(DAOError::Overflow)?;

    emit!(ProposalExecuted {
        proposal_id: proposal.id,
        executor: ctx.accounts.executor.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Fund the DAO treasury
pub fn fund_dao_treasury(ctx: Context<FundDAOTreasury>, amount: u64) -> Result<()> {
    let treasury = &mut ctx.accounts.dao_treasury;
    let clock = Clock::get()?;

    require!(amount > 0, DAOError::InvalidAmount);

    // Transfer SOL to treasury
    let ix = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.funder.key(),
        &treasury.key(),
        amount,
    );
    anchor_lang::solana_program::program::invoke(
        &ix,
        &[
            ctx.accounts.funder.to_account_info(),
            treasury.to_account_info(),
        ],
    )?;

    treasury.total_balance = treasury.total_balance.checked_add(amount).ok_or(DAOError::Overflow)?;
    treasury.last_deposit = clock.unix_timestamp;

    emit!(TreasuryFunded {
        funder: ctx.accounts.funder.key(),
        amount,
        total_balance: treasury.total_balance,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// ==================== CONTEXT STRUCTS ====================

#[derive(Accounts)]
pub struct InitDAOConfig<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + DAOConfig::INIT_SPACE,
        seeds = [b"dao-config"],
        bump
    )]
    pub dao_config: Account<'info, DAOConfig>,
    /// CHECK: Token mint for governance
    pub token_mint: AccountInfo<'info>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateProposal<'info> {
    #[account(
        init,
        payer = proposer,
        space = 8 + Proposal::INIT_SPACE,
        seeds = [b"proposal", &dao_config.proposal_count.to_le_bytes()],
        bump
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(
        mut,
        seeds = [b"dao-config"],
        bump = dao_config.bump
    )]
    pub dao_config: Account<'info, DAOConfig>,
    #[account(mut)]
    pub proposer_token_account: Account<'info, TokenAccount>,
    /// CHECK: Vault for proposal stake
    #[account(mut)]
    pub proposal_stake_vault: AccountInfo<'info>,
    #[account(mut)]
    pub proposer: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CastDAOVote<'info> {
    #[account(
        init,
        payer = voter,
        space = 8 + DAOVote::INIT_SPACE,
        seeds = [b"dao-vote", proposal.key().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub dao_vote: Account<'info, DAOVote>,
    #[account(
        mut,
        constraint = proposal.status == ProposalStatus::Active as u8 @ DAOError::ProposalNotActive
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(
        seeds = [b"dao-config"],
        bump = dao_config.bump
    )]
    pub dao_config: Account<'info, DAOConfig>,
    #[account(mut)]
    pub voter: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinalizeProposal<'info> {
    #[account(
        mut,
        constraint = proposal.status == ProposalStatus::Active as u8 @ DAOError::ProposalNotActive
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(
        seeds = [b"dao-config"],
        bump = dao_config.bump
    )]
    pub dao_config: Account<'info, DAOConfig>,
    pub finalizer: Signer<'info>,
}

#[derive(Accounts)]
pub struct ExecuteProposal<'info> {
    #[account(
        mut,
        constraint = proposal.status == ProposalStatus::Approved as u8 @ DAOError::ProposalNotApproved
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(
        mut,
        seeds = [b"dao-config"],
        bump = dao_config.bump
    )]
    pub dao_config: Account<'info, DAOConfig>,
    pub executor: Signer<'info>,
}

#[derive(Accounts)]
pub struct FundDAOTreasury<'info> {
    #[account(
        init_if_needed,
        payer = funder,
        space = 8 + DAOTreasury::INIT_SPACE,
        seeds = [b"dao-treasury"],
        bump
    )]
    pub dao_treasury: Account<'info, DAOTreasury>,
    #[account(mut)]
    pub funder: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// ==================== STATE ACCOUNTS ====================

#[account]
#[derive(InitSpace)]
pub struct DAOConfig {
    pub admin: Pubkey,
    pub token_mint: Pubkey,
    pub proposal_count: u64,
    pub min_proposal_stake: u64,
    pub voting_period: i64,
    pub quorum_percentage: u8,
    pub reputation_multiplier: u8,   // SBT reputation boosts voting power
    pub total_proposals_executed: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Proposal {
    pub id: u64,
    pub proposer: Pubkey,
    #[max_len(100)]
    pub title: String,
    #[max_len(200)]
    pub description_uri: String,
    pub proposal_type: u8,           // ProposalType as u8
    pub status: u8,                  // ProposalStatus as u8
    pub votes_for: u64,             // Weighted votes
    pub votes_against: u64,
    pub total_voters: u32,
    pub stake_amount: u64,
    pub created_at: i64,
    pub voting_ends_at: i64,
    pub executed: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct DAOVote {
    pub proposal: Pubkey,
    pub voter: Pubkey,
    pub vote_weight: u64,
    pub vote_for: bool,
    pub token_amount: u64,
    pub sbt_count: u32,
    pub voted_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct DAOTreasury {
    pub total_balance: u64,
    pub allocated: u64,
    pub last_deposit: i64,
    pub bump: u8,
}

// ==================== ENUMS ====================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ProposalType {
    ParameterChange = 0,
    TreasurySpend = 1,
    FeatureToggle = 2,
    ArbitratorElection = 3,
    EmergencyAction = 4,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ProposalStatus {
    Active = 0,
    Approved = 1,
    Rejected = 2,
    Executed = 3,
    QuorumNotMet = 4,
    Cancelled = 5,
}

// ==================== EVENTS ====================

#[event]
pub struct DAOConfigInitialized {
    pub admin: Pubkey,
    pub token_mint: Pubkey,
    pub voting_period: i64,
    pub quorum_percentage: u8,
    pub reputation_multiplier: u8,
    pub timestamp: i64,
}

#[event]
pub struct ProposalCreated {
    pub proposal_id: u64,
    pub proposer: Pubkey,
    pub title: String,
    pub proposal_type: u8,
    pub voting_ends_at: i64,
    pub timestamp: i64,
}

#[event]
pub struct DAOVoteCast {
    pub proposal_id: u64,
    pub voter: Pubkey,
    pub vote_for: bool,
    pub vote_weight: u64,
    pub token_amount: u64,
    pub sbt_count: u32,
    pub timestamp: i64,
}

#[event]
pub struct ProposalFinalized {
    pub proposal_id: u64,
    pub status: u8,
    pub votes_for: u64,
    pub votes_against: u64,
    pub total_voters: u32,
    pub quorum_met: bool,
    pub timestamp: i64,
}

#[event]
pub struct ProposalExecuted {
    pub proposal_id: u64,
    pub executor: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct TreasuryFunded {
    pub funder: Pubkey,
    pub amount: u64,
    pub total_balance: u64,
    pub timestamp: i64,
}

// ==================== ERROR CODES ====================

#[error_code]
pub enum DAOError {
    #[msg("Voting period too short (min 1 hour)")]
    VotingPeriodTooShort,
    #[msg("Invalid quorum percentage (10-100)")]
    InvalidQuorum,
    #[msg("Invalid reputation multiplier (max 200)")]
    InvalidMultiplier,
    #[msg("Title too long (max 100)")]
    TitleTooLong,
    #[msg("URI too long (max 200)")]
    URITooLong,
    #[msg("Invalid proposal type")]
    InvalidProposalType,
    #[msg("Proposal is not active")]
    ProposalNotActive,
    #[msg("Voting period has ended")]
    VotingPeriodEnded,
    #[msg("Voting period has not ended")]
    VotingPeriodNotEnded,
    #[msg("Invalid vote weight")]
    InvalidVoteWeight,
    #[msg("Proposal not approved")]
    ProposalNotApproved,
    #[msg("Proposal already executed")]
    AlreadyExecuted,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Arithmetic overflow")]
    Overflow,
}
