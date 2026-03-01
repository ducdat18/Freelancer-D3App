use anchor_lang::prelude::*;

// ==================== SYBIL RESISTANCE (GITCOIN PASSPORT STYLE) ====================

/// Initialize Sybil resistance configuration
pub fn init_sybil_config(
    ctx: Context<InitSybilConfig>,
    min_score_to_bid: u16,
    min_score_to_post: u16,
) -> Result<()> {
    require!(min_score_to_bid <= 100, SybilError::InvalidScore);
    require!(min_score_to_post <= 100, SybilError::InvalidScore);

    let config = &mut ctx.accounts.sybil_config;
    let clock = Clock::get()?;

    config.admin = ctx.accounts.admin.key();
    config.oracle_authority = ctx.accounts.oracle_authority.key();
    config.min_score_to_bid = min_score_to_bid;
    config.min_score_to_post = min_score_to_post;
    config.active = true;
    config.total_verified_users = 0;
    config.bump = ctx.bumps.sybil_config;

    emit!(SybilConfigInitialized {
        admin: config.admin,
        oracle_authority: config.oracle_authority,
        min_score_to_bid,
        min_score_to_post,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Add an identity stamp (called by oracle after off-chain verification)
pub fn add_identity_stamp(
    ctx: Context<AddIdentityStamp>,
    stamp_type: u8,
    provider_hash: [u8; 32],
    weight: u8,
    expires_at: Option<i64>,
) -> Result<()> {
    let stamps = &mut ctx.accounts.identity_stamps;
    let config = &ctx.accounts.sybil_config;
    let clock = Clock::get()?;

    require!(
        ctx.accounts.oracle.key() == config.oracle_authority,
        SybilError::UnauthorizedOracle
    );
    require!(stamp_type <= 9, SybilError::InvalidStampType);
    require!(weight > 0 && weight <= 25, SybilError::InvalidWeight);
    require!(stamps.stamp_count < MAX_STAMPS as u8, SybilError::TooManyStamps);

    // Check for duplicate stamp type
    for i in 0..stamps.stamp_count as usize {
        require!(
            stamps.stamp_types[i] != stamp_type,
            SybilError::DuplicateStampType
        );
    }

    let idx = stamps.stamp_count as usize;
    stamps.stamp_types[idx] = stamp_type;
    stamps.stamp_provider_hashes[idx] = provider_hash;
    stamps.stamp_weights[idx] = weight;
    stamps.stamp_verified_at[idx] = clock.unix_timestamp;
    stamps.stamp_expires_at[idx] = expires_at.unwrap_or(0);
    stamps.stamp_count += 1;

    // Recalculate humanity score
    stamps.humanity_score = calculate_score(stamps);
    stamps.last_updated = clock.unix_timestamp;

    // Track if this is first time reaching threshold
    if stamps.humanity_score >= config.min_score_to_bid && !stamps.threshold_reached {
        stamps.threshold_reached = true;
    }

    emit!(IdentityStampAdded {
        user: stamps.user,
        stamp_type,
        weight,
        new_score: stamps.humanity_score,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Remove an identity stamp (oracle revocation)
pub fn remove_identity_stamp(
    ctx: Context<RemoveIdentityStamp>,
    stamp_type: u8,
) -> Result<()> {
    let stamps = &mut ctx.accounts.identity_stamps;
    let config = &ctx.accounts.sybil_config;
    let clock = Clock::get()?;

    require!(
        ctx.accounts.oracle.key() == config.oracle_authority,
        SybilError::UnauthorizedOracle
    );

    // Find the stamp
    let mut found_idx: Option<usize> = None;
    for i in 0..stamps.stamp_count as usize {
        if stamps.stamp_types[i] == stamp_type {
            found_idx = Some(i);
            break;
        }
    }

    let idx = found_idx.ok_or(SybilError::StampNotFound)?;
    let last = stamps.stamp_count as usize - 1;

    // Swap with last and decrement
    if idx < last {
        stamps.stamp_types[idx] = stamps.stamp_types[last];
        stamps.stamp_provider_hashes[idx] = stamps.stamp_provider_hashes[last];
        stamps.stamp_weights[idx] = stamps.stamp_weights[last];
        stamps.stamp_verified_at[idx] = stamps.stamp_verified_at[last];
        stamps.stamp_expires_at[idx] = stamps.stamp_expires_at[last];
    }
    stamps.stamp_count -= 1;

    stamps.humanity_score = calculate_score(stamps);
    stamps.last_updated = clock.unix_timestamp;

    emit!(IdentityStampRemoved {
        user: stamps.user,
        stamp_type,
        new_score: stamps.humanity_score,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Recalculate humanity score (can be called to expire stamps)
pub fn recalculate_humanity_score(ctx: Context<RecalculateScore>) -> Result<()> {
    let stamps = &mut ctx.accounts.identity_stamps;
    let clock = Clock::get()?;

    // Remove expired stamps
    let mut i = 0;
    while i < stamps.stamp_count as usize {
        if stamps.stamp_expires_at[i] > 0 && stamps.stamp_expires_at[i] < clock.unix_timestamp {
            let last = stamps.stamp_count as usize - 1;
            if i < last {
                stamps.stamp_types[i] = stamps.stamp_types[last];
                stamps.stamp_provider_hashes[i] = stamps.stamp_provider_hashes[last];
                stamps.stamp_weights[i] = stamps.stamp_weights[last];
                stamps.stamp_verified_at[i] = stamps.stamp_verified_at[last];
                stamps.stamp_expires_at[i] = stamps.stamp_expires_at[last];
            }
            stamps.stamp_count -= 1;
            // Don't increment i, check the swapped element
        } else {
            i += 1;
        }
    }

    stamps.humanity_score = calculate_score(stamps);
    stamps.last_updated = clock.unix_timestamp;

    emit!(HumanityScoreRecalculated {
        user: stamps.user,
        new_score: stamps.humanity_score,
        active_stamps: stamps.stamp_count,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Check if user passes sybil threshold (called by other instructions)
pub fn check_humanity_threshold(stamps: &IdentityStamps, min_score: u16) -> Result<()> {
    require!(stamps.humanity_score >= min_score, SybilError::ScoreBelowThreshold);
    Ok(())
}

// ==================== HELPER FUNCTIONS ====================

fn calculate_score(stamps: &IdentityStamps) -> u16 {
    let mut total: u16 = 0;
    for i in 0..stamps.stamp_count as usize {
        total = total.saturating_add(stamps.stamp_weights[i] as u16);
    }
    // Cap at 100
    if total > 100 { 100 } else { total }
}

// ==================== CONSTANTS ====================

pub const MAX_STAMPS: usize = 10;

// ==================== CONTEXT STRUCTS ====================

#[derive(Accounts)]
pub struct InitSybilConfig<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + SybilConfig::INIT_SPACE,
        seeds = [b"sybil-config"],
        bump
    )]
    pub sybil_config: Account<'info, SybilConfig>,
    /// CHECK: Oracle authority for stamp verification
    pub oracle_authority: AccountInfo<'info>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddIdentityStamp<'info> {
    #[account(
        init_if_needed,
        payer = oracle,
        space = 8 + IdentityStamps::INIT_SPACE,
        seeds = [b"identity-stamps", user.key().as_ref()],
        bump
    )]
    pub identity_stamps: Account<'info, IdentityStamps>,
    #[account(
        seeds = [b"sybil-config"],
        bump = sybil_config.bump
    )]
    pub sybil_config: Account<'info, SybilConfig>,
    /// CHECK: User whose stamps are being updated
    pub user: AccountInfo<'info>,
    #[account(mut)]
    pub oracle: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RemoveIdentityStamp<'info> {
    #[account(
        mut,
        seeds = [b"identity-stamps", identity_stamps.user.as_ref()],
        bump
    )]
    pub identity_stamps: Account<'info, IdentityStamps>,
    #[account(
        seeds = [b"sybil-config"],
        bump = sybil_config.bump
    )]
    pub sybil_config: Account<'info, SybilConfig>,
    pub oracle: Signer<'info>,
}

#[derive(Accounts)]
pub struct RecalculateScore<'info> {
    #[account(
        mut,
        seeds = [b"identity-stamps", identity_stamps.user.as_ref()],
        bump
    )]
    pub identity_stamps: Account<'info, IdentityStamps>,
}

// ==================== STATE ACCOUNTS ====================

#[account]
#[derive(InitSpace)]
pub struct SybilConfig {
    pub admin: Pubkey,
    pub oracle_authority: Pubkey,
    pub min_score_to_bid: u16,
    pub min_score_to_post: u16,
    pub active: bool,
    pub total_verified_users: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct IdentityStamps {
    pub user: Pubkey,
    pub stamp_count: u8,
    pub stamp_types: [u8; 10],              // StampType as u8
    pub stamp_provider_hashes: [[u8; 32]; 10], // Privacy-preserving hashes
    pub stamp_weights: [u8; 10],            // Points per stamp
    pub stamp_verified_at: [i64; 10],
    pub stamp_expires_at: [i64; 10],        // 0 = no expiration
    pub humanity_score: u16,                // 0-100
    pub threshold_reached: bool,
    pub last_updated: i64,
    pub bump: u8,
}

// ==================== ENUMS ====================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum StampType {
    PhoneVerified = 0,
    EmailVerified = 1,
    GitHubConnected = 2,
    LinkedInConnected = 3,
    TwitterConnected = 4,
    GovernmentId = 5,
    BiometricVerified = 6,
    ExistingReputation = 7,   // Has SBTs on-chain
    StakingActive = 8,        // Has staked tokens
    ReferralVerified = 9,     // Was referred by verified user
}

// ==================== EVENTS ====================

#[event]
pub struct SybilConfigInitialized {
    pub admin: Pubkey,
    pub oracle_authority: Pubkey,
    pub min_score_to_bid: u16,
    pub min_score_to_post: u16,
    pub timestamp: i64,
}

#[event]
pub struct IdentityStampAdded {
    pub user: Pubkey,
    pub stamp_type: u8,
    pub weight: u8,
    pub new_score: u16,
    pub timestamp: i64,
}

#[event]
pub struct IdentityStampRemoved {
    pub user: Pubkey,
    pub stamp_type: u8,
    pub new_score: u16,
    pub timestamp: i64,
}

#[event]
pub struct HumanityScoreRecalculated {
    pub user: Pubkey,
    pub new_score: u16,
    pub active_stamps: u8,
    pub timestamp: i64,
}

// ==================== ERROR CODES ====================

#[error_code]
pub enum SybilError {
    #[msg("Invalid score value (0-100)")]
    InvalidScore,
    #[msg("Unauthorized oracle")]
    UnauthorizedOracle,
    #[msg("Invalid stamp type")]
    InvalidStampType,
    #[msg("Invalid weight (1-25)")]
    InvalidWeight,
    #[msg("Too many stamps (max 10)")]
    TooManyStamps,
    #[msg("Duplicate stamp type")]
    DuplicateStampType,
    #[msg("Stamp not found")]
    StampNotFound,
    #[msg("Humanity score below threshold")]
    ScoreBelowThreshold,
}
