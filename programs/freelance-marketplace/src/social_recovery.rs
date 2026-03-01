use anchor_lang::prelude::*;

// ==================== SOCIAL RECOVERY ====================
// Guardian-based account recovery system
// Allows users to designate trusted guardians who can collectively
// approve transferring control to a new wallet (replacing lost keys)

/// Set up social recovery with guardians
pub fn setup_recovery(
    ctx: Context<SetupRecovery>,
    guardians: Vec<Pubkey>,
    threshold: u8,
    timelock_period: i64,
) -> Result<()> {
    require!(guardians.len() >= 2 && guardians.len() <= MAX_GUARDIANS, RecoveryError::InvalidGuardianCount);
    require!(threshold >= 2 && (threshold as usize) <= guardians.len(), RecoveryError::InvalidThreshold);
    require!(timelock_period >= MIN_TIMELOCK, RecoveryError::TimelockTooShort);
    require!(timelock_period <= MAX_TIMELOCK, RecoveryError::TimelockTooLong);

    // Ensure no duplicates and owner not a guardian
    let owner_key = ctx.accounts.owner.key();
    for (i, g) in guardians.iter().enumerate() {
        require!(*g != owner_key, RecoveryError::OwnerCannotBeGuardian);
        for j in (i + 1)..guardians.len() {
            require!(*g != guardians[j], RecoveryError::DuplicateGuardian);
        }
    }

    let config = &mut ctx.accounts.recovery_config;
    let clock = Clock::get()?;

    config.owner = owner_key;
    config.guardians = guardians.clone();
    config.threshold = threshold;
    config.timelock_period = timelock_period;
    config.active = true;
    config.created_at = clock.unix_timestamp;
    config.updated_at = clock.unix_timestamp;
    config.bump = ctx.bumps.recovery_config;

    emit!(RecoverySetup {
        owner: config.owner,
        guardian_count: guardians.len() as u8,
        threshold,
        timelock_period,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Update guardians (only owner can do this)
pub fn update_guardians(
    ctx: Context<UpdateGuardians>,
    new_guardians: Vec<Pubkey>,
    new_threshold: u8,
) -> Result<()> {
    let config = &mut ctx.accounts.recovery_config;
    let clock = Clock::get()?;

    require!(config.owner == ctx.accounts.owner.key(), RecoveryError::Unauthorized);
    require!(config.active, RecoveryError::RecoveryNotActive);
    require!(new_guardians.len() >= 2 && new_guardians.len() <= MAX_GUARDIANS, RecoveryError::InvalidGuardianCount);
    require!(new_threshold >= 2 && (new_threshold as usize) <= new_guardians.len(), RecoveryError::InvalidThreshold);

    config.guardians = new_guardians;
    config.threshold = new_threshold;
    config.updated_at = clock.unix_timestamp;

    emit!(GuardiansUpdated {
        owner: config.owner,
        new_guardian_count: config.guardians.len() as u8,
        new_threshold,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Initiate recovery process (by a guardian)
pub fn initiate_recovery(
    ctx: Context<InitiateRecovery>,
    new_owner: Pubkey,
) -> Result<()> {
    let config = &ctx.accounts.recovery_config;
    let request = &mut ctx.accounts.recovery_request;
    let clock = Clock::get()?;

    require!(config.active, RecoveryError::RecoveryNotActive);

    // Verify initiator is a guardian
    let initiator = ctx.accounts.guardian.key();
    require!(
        config.guardians.contains(&initiator),
        RecoveryError::NotAGuardian
    );
    require!(new_owner != config.owner, RecoveryError::SameOwner);

    request.owner = config.owner;
    request.new_owner = new_owner;
    request.initiated_by = initiator;
    request.approvals = vec![initiator]; // Initiator counts as first approval
    request.initiated_at = clock.unix_timestamp;
    request.executable_at = clock.unix_timestamp
        .checked_add(config.timelock_period).ok_or(RecoveryError::Overflow)?;
    request.executed = false;
    request.cancelled = false;
    request.bump = ctx.bumps.recovery_request;

    emit!(RecoveryInitiated {
        owner: request.owner,
        new_owner: request.new_owner,
        initiated_by: initiator,
        executable_at: request.executable_at,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Approve recovery (by another guardian)
pub fn approve_recovery(ctx: Context<ApproveRecovery>) -> Result<()> {
    let config = &ctx.accounts.recovery_config;
    let request = &mut ctx.accounts.recovery_request;
    let clock = Clock::get()?;

    require!(!request.executed, RecoveryError::AlreadyExecuted);
    require!(!request.cancelled, RecoveryError::RecoveryCancelled);

    let approver = ctx.accounts.guardian.key();
    require!(
        config.guardians.contains(&approver),
        RecoveryError::NotAGuardian
    );
    require!(
        !request.approvals.contains(&approver),
        RecoveryError::AlreadyApproved
    );

    request.approvals.push(approver);

    emit!(RecoveryApproved {
        owner: request.owner,
        approver,
        approval_count: request.approvals.len() as u8,
        threshold: config.threshold,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Execute recovery after timelock and threshold met
pub fn execute_recovery(ctx: Context<ExecuteRecovery>) -> Result<()> {
    let config = &mut ctx.accounts.recovery_config;
    let request = &mut ctx.accounts.recovery_request;
    let clock = Clock::get()?;

    require!(!request.executed, RecoveryError::AlreadyExecuted);
    require!(!request.cancelled, RecoveryError::RecoveryCancelled);
    require!(
        clock.unix_timestamp >= request.executable_at,
        RecoveryError::TimelockNotExpired
    );
    require!(
        request.approvals.len() >= config.threshold as usize,
        RecoveryError::InsufficientApprovals
    );

    // Transfer ownership
    let old_owner = config.owner;
    config.owner = request.new_owner;
    config.updated_at = clock.unix_timestamp;
    request.executed = true;

    emit!(RecoveryExecuted {
        old_owner,
        new_owner: request.new_owner,
        approval_count: request.approvals.len() as u8,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Cancel recovery (only original owner can cancel)
pub fn cancel_recovery(ctx: Context<CancelRecovery>) -> Result<()> {
    let config = &ctx.accounts.recovery_config;
    let request = &mut ctx.accounts.recovery_request;
    let clock = Clock::get()?;

    require!(config.owner == ctx.accounts.owner.key(), RecoveryError::Unauthorized);
    require!(!request.executed, RecoveryError::AlreadyExecuted);
    require!(!request.cancelled, RecoveryError::RecoveryCancelled);

    request.cancelled = true;

    emit!(RecoveryCancelled {
        owner: config.owner,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// ==================== CONSTANTS ====================

pub const MAX_GUARDIANS: usize = 5;
pub const MIN_TIMELOCK: i64 = 3600;       // 1 hour minimum
pub const MAX_TIMELOCK: i64 = 7 * 86400;  // 7 days maximum

// ==================== CONTEXT STRUCTS ====================

#[derive(Accounts)]
pub struct SetupRecovery<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + RecoveryConfig::INIT_SPACE,
        seeds = [b"recovery-config", owner.key().as_ref()],
        bump
    )]
    pub recovery_config: Account<'info, RecoveryConfig>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateGuardians<'info> {
    #[account(
        mut,
        seeds = [b"recovery-config", owner.key().as_ref()],
        bump = recovery_config.bump
    )]
    pub recovery_config: Account<'info, RecoveryConfig>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct InitiateRecovery<'info> {
    #[account(
        seeds = [b"recovery-config", recovery_config.owner.as_ref()],
        bump = recovery_config.bump
    )]
    pub recovery_config: Account<'info, RecoveryConfig>,
    #[account(
        init,
        payer = guardian,
        space = 8 + RecoveryRequest::INIT_SPACE,
        seeds = [b"recovery-request", recovery_config.owner.as_ref()],
        bump
    )]
    pub recovery_request: Account<'info, RecoveryRequest>,
    #[account(mut)]
    pub guardian: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApproveRecovery<'info> {
    #[account(
        seeds = [b"recovery-config", recovery_config.owner.as_ref()],
        bump = recovery_config.bump
    )]
    pub recovery_config: Account<'info, RecoveryConfig>,
    #[account(
        mut,
        seeds = [b"recovery-request", recovery_config.owner.as_ref()],
        bump = recovery_request.bump
    )]
    pub recovery_request: Account<'info, RecoveryRequest>,
    pub guardian: Signer<'info>,
}

#[derive(Accounts)]
pub struct ExecuteRecovery<'info> {
    #[account(
        mut,
        seeds = [b"recovery-config", recovery_config.owner.as_ref()],
        bump = recovery_config.bump
    )]
    pub recovery_config: Account<'info, RecoveryConfig>,
    #[account(
        mut,
        seeds = [b"recovery-request", recovery_config.owner.as_ref()],
        bump = recovery_request.bump
    )]
    pub recovery_request: Account<'info, RecoveryRequest>,
    pub executor: Signer<'info>,
}

#[derive(Accounts)]
pub struct CancelRecovery<'info> {
    #[account(
        seeds = [b"recovery-config", owner.key().as_ref()],
        bump = recovery_config.bump
    )]
    pub recovery_config: Account<'info, RecoveryConfig>,
    #[account(
        mut,
        seeds = [b"recovery-request", owner.key().as_ref()],
        bump = recovery_request.bump
    )]
    pub recovery_request: Account<'info, RecoveryRequest>,
    pub owner: Signer<'info>,
}

// ==================== STATE ACCOUNTS ====================

#[account]
#[derive(InitSpace)]
pub struct RecoveryConfig {
    pub owner: Pubkey,
    #[max_len(5)]
    pub guardians: Vec<Pubkey>,
    pub threshold: u8,
    pub timelock_period: i64,
    pub active: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct RecoveryRequest {
    pub owner: Pubkey,
    pub new_owner: Pubkey,
    pub initiated_by: Pubkey,
    #[max_len(5)]
    pub approvals: Vec<Pubkey>,
    pub initiated_at: i64,
    pub executable_at: i64,
    pub executed: bool,
    pub cancelled: bool,
    pub bump: u8,
}

// ==================== EVENTS ====================

#[event]
pub struct RecoverySetup {
    pub owner: Pubkey,
    pub guardian_count: u8,
    pub threshold: u8,
    pub timelock_period: i64,
    pub timestamp: i64,
}

#[event]
pub struct GuardiansUpdated {
    pub owner: Pubkey,
    pub new_guardian_count: u8,
    pub new_threshold: u8,
    pub timestamp: i64,
}

#[event]
pub struct RecoveryInitiated {
    pub owner: Pubkey,
    pub new_owner: Pubkey,
    pub initiated_by: Pubkey,
    pub executable_at: i64,
    pub timestamp: i64,
}

#[event]
pub struct RecoveryApproved {
    pub owner: Pubkey,
    pub approver: Pubkey,
    pub approval_count: u8,
    pub threshold: u8,
    pub timestamp: i64,
}

#[event]
pub struct RecoveryExecuted {
    pub old_owner: Pubkey,
    pub new_owner: Pubkey,
    pub approval_count: u8,
    pub timestamp: i64,
}

#[event]
pub struct RecoveryCancelled {
    pub owner: Pubkey,
    pub timestamp: i64,
}

// ==================== ERROR CODES ====================

#[error_code]
pub enum RecoveryError {
    #[msg("Invalid guardian count (2-5)")]
    InvalidGuardianCount,
    #[msg("Invalid threshold (min 2, max guardian count)")]
    InvalidThreshold,
    #[msg("Timelock too short (min 1 hour)")]
    TimelockTooShort,
    #[msg("Timelock too long (max 7 days)")]
    TimelockTooLong,
    #[msg("Owner cannot be a guardian")]
    OwnerCannotBeGuardian,
    #[msg("Duplicate guardian")]
    DuplicateGuardian,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Recovery not active")]
    RecoveryNotActive,
    #[msg("Not a guardian")]
    NotAGuardian,
    #[msg("Same owner address")]
    SameOwner,
    #[msg("Already executed")]
    AlreadyExecuted,
    #[msg("Recovery cancelled")]
    RecoveryCancelled,
    #[msg("Already approved")]
    AlreadyApproved,
    #[msg("Timelock not expired")]
    TimelockNotExpired,
    #[msg("Insufficient approvals")]
    InsufficientApprovals,
    #[msg("Arithmetic overflow")]
    Overflow,
}
