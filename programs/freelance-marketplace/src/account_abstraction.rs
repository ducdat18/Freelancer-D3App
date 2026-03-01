use anchor_lang::prelude::*;

// ==================== ACCOUNT ABSTRACTION (SOLANA ADAPTATION) ====================
// Solana natively supports fee payers. This module adds:
// 1. Session Keys - delegated signing for time-limited operations
// 2. Fee Payer Config - platform-sponsored gas for eligible transactions
// 3. Transaction batching is handled natively by Solana transactions

/// Initialize fee payer configuration (platform gas sponsorship)
pub fn init_fee_payer_config(
    ctx: Context<InitFeePayerConfig>,
    daily_budget: u64,
    max_tx_per_user_per_day: u16,
) -> Result<()> {
    require!(daily_budget > 0, AAError::InvalidBudget);

    let config = &mut ctx.accounts.fee_payer_config;
    let clock = Clock::get()?;

    config.admin = ctx.accounts.admin.key();
    config.fee_payer = ctx.accounts.fee_payer.key();
    config.daily_budget = daily_budget;
    config.spent_today = 0;
    config.last_reset = clock.unix_timestamp;
    config.max_tx_per_user_per_day = max_tx_per_user_per_day;
    config.total_sponsored = 0;
    config.active = true;
    config.bump = ctx.bumps.fee_payer_config;

    emit!(FeePayerConfigInitialized {
        admin: config.admin,
        fee_payer: config.fee_payer,
        daily_budget,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Fund the fee payer pool with SOL
pub fn fund_fee_payer(ctx: Context<FundFeePayer>, amount: u64) -> Result<()> {
    require!(amount > 0, AAError::InvalidAmount);

    let ix = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.funder.key(),
        &ctx.accounts.fee_payer_pool.key(),
        amount,
    );
    anchor_lang::solana_program::program::invoke(
        &ix,
        &[
            ctx.accounts.funder.to_account_info(),
            ctx.accounts.fee_payer_pool.to_account_info(),
        ],
    )?;

    let config = &mut ctx.accounts.fee_payer_config;
    config.total_sponsored = config.total_sponsored
        .checked_add(amount).ok_or(AAError::Overflow)?;

    emit!(FeePayerFunded {
        funder: ctx.accounts.funder.key(),
        amount,
        total_pool: config.total_sponsored,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

/// Create a session key for delegated signing
pub fn create_session_key(
    ctx: Context<CreateSessionKey>,
    valid_until: i64,
    max_amount: u64,
    allowed_actions: u16,  // Bitmask of allowed action types
) -> Result<()> {
    let clock = Clock::get()?;

    require!(valid_until > clock.unix_timestamp, AAError::InvalidExpiration);
    require!(
        valid_until <= clock.unix_timestamp + MAX_SESSION_DURATION,
        AAError::SessionTooLong
    );

    let session = &mut ctx.accounts.session_key;
    let counter = &mut ctx.accounts.user_session_counter;

    require!(
        counter.active_sessions < MAX_ACTIVE_SESSIONS,
        AAError::TooManySessions
    );

    session.owner = ctx.accounts.owner.key();
    session.session_pubkey = ctx.accounts.session_signer.key();
    session.valid_until = valid_until;
    session.max_amount = max_amount;
    session.spent_amount = 0;
    session.allowed_actions = allowed_actions;
    session.active = true;
    session.created_at = clock.unix_timestamp;
    session.tx_count = 0;
    session.bump = ctx.bumps.session_key;

    counter.active_sessions += 1;
    counter.total_sessions = counter.total_sessions
        .checked_add(1).ok_or(AAError::Overflow)?;

    emit!(SessionKeyCreated {
        owner: session.owner,
        session_pubkey: session.session_pubkey,
        valid_until,
        max_amount,
        allowed_actions,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Revoke a session key
pub fn revoke_session_key(ctx: Context<RevokeSessionKey>) -> Result<()> {
    let session = &mut ctx.accounts.session_key;
    let counter = &mut ctx.accounts.user_session_counter;
    let clock = Clock::get()?;

    require!(
        ctx.accounts.authority.key() == session.owner,
        AAError::Unauthorized
    );
    require!(session.active, AAError::SessionAlreadyRevoked);

    session.active = false;

    if counter.active_sessions > 0 {
        counter.active_sessions -= 1;
    }

    emit!(SessionKeyRevoked {
        owner: session.owner,
        session_pubkey: session.session_pubkey,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Validate and use a session key for an operation
pub fn use_session_key(
    ctx: Context<UseSessionKey>,
    action_type: u16,
    amount: u64,
) -> Result<()> {
    let session = &mut ctx.accounts.session_key;
    let clock = Clock::get()?;

    // Validate session is active and not expired
    require!(session.active, AAError::SessionNotActive);
    require!(clock.unix_timestamp < session.valid_until, AAError::SessionExpired);

    // Validate action is allowed
    require!(
        session.allowed_actions & action_type != 0,
        AAError::ActionNotAllowed
    );

    // Validate amount within budget
    let new_spent = session.spent_amount
        .checked_add(amount).ok_or(AAError::Overflow)?;
    require!(new_spent <= session.max_amount, AAError::SessionBudgetExceeded);

    // Validate session signer
    require!(
        ctx.accounts.session_signer.key() == session.session_pubkey,
        AAError::InvalidSessionSigner
    );

    session.spent_amount = new_spent;
    session.tx_count = session.tx_count.checked_add(1).ok_or(AAError::Overflow)?;

    emit!(SessionKeyUsed {
        owner: session.owner,
        session_pubkey: session.session_pubkey,
        action_type,
        amount,
        remaining_budget: session.max_amount - new_spent,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Record a sponsored transaction (gas sponsorship tracking)
pub fn record_sponsored_tx(ctx: Context<RecordSponsoredTx>, gas_cost: u64) -> Result<()> {
    let config = &mut ctx.accounts.fee_payer_config;
    let user_usage = &mut ctx.accounts.user_gas_usage;
    let clock = Clock::get()?;

    require!(config.active, AAError::SponsorshipInactive);

    // Reset daily counter if new day
    let day_seconds: i64 = 86400;
    if clock.unix_timestamp - config.last_reset >= day_seconds {
        config.spent_today = 0;
        config.last_reset = clock.unix_timestamp;
    }
    if clock.unix_timestamp - user_usage.last_reset >= day_seconds {
        user_usage.tx_today = 0;
        user_usage.last_reset = clock.unix_timestamp;
    }

    // Check daily budget
    require!(
        config.spent_today.checked_add(gas_cost).ok_or(AAError::Overflow)? <= config.daily_budget,
        AAError::DailyBudgetExceeded
    );
    require!(
        user_usage.tx_today < config.max_tx_per_user_per_day,
        AAError::UserDailyLimitReached
    );

    config.spent_today = config.spent_today
        .checked_add(gas_cost).ok_or(AAError::Overflow)?;
    user_usage.tx_today += 1;
    user_usage.total_sponsored = user_usage.total_sponsored
        .checked_add(gas_cost).ok_or(AAError::Overflow)?;

    emit!(TransactionSponsored {
        user: user_usage.user,
        gas_cost,
        daily_remaining: config.daily_budget - config.spent_today,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// ==================== CONSTANTS ====================

pub const MAX_SESSION_DURATION: i64 = 7 * 24 * 3600; // 7 days max
pub const MAX_ACTIVE_SESSIONS: u8 = 5;

// Action type bitmask constants
pub const ACTION_CREATE_JOB: u16 = 1 << 0;
pub const ACTION_SUBMIT_BID: u16 = 1 << 1;
pub const ACTION_SUBMIT_WORK: u16 = 1 << 2;
pub const ACTION_APPROVE_WORK: u16 = 1 << 3;
pub const ACTION_SEND_MESSAGE: u16 = 1 << 4;
pub const ACTION_UPDATE_PROFILE: u16 = 1 << 5;
pub const ACTION_MILESTONE_OPS: u16 = 1 << 6;
pub const ACTION_DISPUTE_OPS: u16 = 1 << 7;

// ==================== CONTEXT STRUCTS ====================

#[derive(Accounts)]
pub struct InitFeePayerConfig<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + FeePayerConfig::INIT_SPACE,
        seeds = [b"fee-payer-config"],
        bump
    )]
    pub fee_payer_config: Account<'info, FeePayerConfig>,
    /// CHECK: Fee payer wallet
    pub fee_payer: AccountInfo<'info>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FundFeePayer<'info> {
    #[account(
        mut,
        seeds = [b"fee-payer-config"],
        bump = fee_payer_config.bump
    )]
    pub fee_payer_config: Account<'info, FeePayerConfig>,
    /// CHECK: Fee payer pool account
    #[account(mut)]
    pub fee_payer_pool: AccountInfo<'info>,
    #[account(mut)]
    pub funder: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateSessionKey<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + SessionKey::INIT_SPACE,
        seeds = [b"session-key", owner.key().as_ref(), session_signer.key().as_ref()],
        bump
    )]
    pub session_key: Account<'info, SessionKey>,
    #[account(
        init_if_needed,
        payer = owner,
        space = 8 + UserSessionCounter::INIT_SPACE,
        seeds = [b"user-session-counter", owner.key().as_ref()],
        bump
    )]
    pub user_session_counter: Account<'info, UserSessionCounter>,
    /// CHECK: The session signing key
    pub session_signer: AccountInfo<'info>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeSessionKey<'info> {
    #[account(
        mut,
        seeds = [b"session-key", session_key.owner.as_ref(), session_key.session_pubkey.as_ref()],
        bump = session_key.bump
    )]
    pub session_key: Account<'info, SessionKey>,
    #[account(
        mut,
        seeds = [b"user-session-counter", session_key.owner.as_ref()],
        bump
    )]
    pub user_session_counter: Account<'info, UserSessionCounter>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UseSessionKey<'info> {
    #[account(
        mut,
        seeds = [b"session-key", session_key.owner.as_ref(), session_signer.key().as_ref()],
        bump = session_key.bump
    )]
    pub session_key: Account<'info, SessionKey>,
    pub session_signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct RecordSponsoredTx<'info> {
    #[account(
        mut,
        seeds = [b"fee-payer-config"],
        bump = fee_payer_config.bump
    )]
    pub fee_payer_config: Account<'info, FeePayerConfig>,
    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + UserGasUsage::INIT_SPACE,
        seeds = [b"gas-usage", user.key().as_ref()],
        bump
    )]
    pub user_gas_usage: Account<'info, UserGasUsage>,
    /// CHECK: User receiving sponsored tx
    pub user: AccountInfo<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// ==================== STATE ACCOUNTS ====================

#[account]
#[derive(InitSpace)]
pub struct FeePayerConfig {
    pub admin: Pubkey,
    pub fee_payer: Pubkey,
    pub daily_budget: u64,
    pub spent_today: u64,
    pub last_reset: i64,
    pub max_tx_per_user_per_day: u16,
    pub total_sponsored: u64,
    pub active: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct SessionKey {
    pub owner: Pubkey,
    pub session_pubkey: Pubkey,
    pub valid_until: i64,
    pub max_amount: u64,
    pub spent_amount: u64,
    pub allowed_actions: u16,
    pub active: bool,
    pub created_at: i64,
    pub tx_count: u32,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct UserSessionCounter {
    pub user: Pubkey,
    pub active_sessions: u8,
    pub total_sessions: u32,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct UserGasUsage {
    pub user: Pubkey,
    pub tx_today: u16,
    pub total_sponsored: u64,
    pub last_reset: i64,
    pub bump: u8,
}

// ==================== EVENTS ====================

#[event]
pub struct FeePayerConfigInitialized {
    pub admin: Pubkey,
    pub fee_payer: Pubkey,
    pub daily_budget: u64,
    pub timestamp: i64,
}

#[event]
pub struct FeePayerFunded {
    pub funder: Pubkey,
    pub amount: u64,
    pub total_pool: u64,
    pub timestamp: i64,
}

#[event]
pub struct SessionKeyCreated {
    pub owner: Pubkey,
    pub session_pubkey: Pubkey,
    pub valid_until: i64,
    pub max_amount: u64,
    pub allowed_actions: u16,
    pub timestamp: i64,
}

#[event]
pub struct SessionKeyRevoked {
    pub owner: Pubkey,
    pub session_pubkey: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct SessionKeyUsed {
    pub owner: Pubkey,
    pub session_pubkey: Pubkey,
    pub action_type: u16,
    pub amount: u64,
    pub remaining_budget: u64,
    pub timestamp: i64,
}

#[event]
pub struct TransactionSponsored {
    pub user: Pubkey,
    pub gas_cost: u64,
    pub daily_remaining: u64,
    pub timestamp: i64,
}

// ==================== ERROR CODES ====================

#[error_code]
pub enum AAError {
    #[msg("Invalid budget")]
    InvalidBudget,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Invalid expiration time")]
    InvalidExpiration,
    #[msg("Session duration too long (max 7 days)")]
    SessionTooLong,
    #[msg("Too many active sessions (max 5)")]
    TooManySessions,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Session already revoked")]
    SessionAlreadyRevoked,
    #[msg("Session not active")]
    SessionNotActive,
    #[msg("Session expired")]
    SessionExpired,
    #[msg("Action not allowed by this session")]
    ActionNotAllowed,
    #[msg("Session budget exceeded")]
    SessionBudgetExceeded,
    #[msg("Invalid session signer")]
    InvalidSessionSigner,
    #[msg("Gas sponsorship inactive")]
    SponsorshipInactive,
    #[msg("Daily budget exceeded")]
    DailyBudgetExceeded,
    #[msg("User daily limit reached")]
    UserDailyLimitReached,
    #[msg("Arithmetic overflow")]
    Overflow,
}
