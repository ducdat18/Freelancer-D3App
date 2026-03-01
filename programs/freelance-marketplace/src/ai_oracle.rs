use anchor_lang::prelude::*;

// ==================== AI ORACLE INTEGRATION ====================
// Decentralized AI verification for work quality assessment
// Supports multiple oracle nodes with consensus mechanism

/// Initialize AI Oracle configuration
pub fn init_ai_oracle_config(
    ctx: Context<InitAIOracleConfig>,
    min_confidence: u8,
    min_oracle_consensus: u8,
) -> Result<()> {
    require!(min_confidence > 0 && min_confidence <= 100, AIOracleError::InvalidConfidence);
    require!(min_oracle_consensus >= 1 && min_oracle_consensus <= 5, AIOracleError::InvalidConsensus);

    let config = &mut ctx.accounts.ai_oracle_config;
    let clock = Clock::get()?;

    config.admin = ctx.accounts.admin.key();
    config.oracle_authorities = vec![ctx.accounts.primary_oracle.key()];
    config.min_confidence = min_confidence;
    config.min_oracle_consensus = min_oracle_consensus;
    config.total_verifications = 0;
    config.active = true;
    config.bump = ctx.bumps.ai_oracle_config;

    emit!(AIOracleConfigInitialized {
        admin: config.admin,
        primary_oracle: ctx.accounts.primary_oracle.key(),
        min_confidence,
        min_oracle_consensus,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Add an authorized oracle authority
pub fn add_oracle_authority(
    ctx: Context<ManageOracleAuthority>,
    new_oracle: Pubkey,
) -> Result<()> {
    let config = &mut ctx.accounts.ai_oracle_config;
    let clock = Clock::get()?;

    require!(config.admin == ctx.accounts.admin.key(), AIOracleError::Unauthorized);
    require!(config.oracle_authorities.len() < MAX_ORACLE_AUTHORITIES, AIOracleError::TooManyOracles);
    require!(!config.oracle_authorities.contains(&new_oracle), AIOracleError::OracleAlreadyExists);

    config.oracle_authorities.push(new_oracle);

    emit!(OracleAuthorityAdded {
        oracle: new_oracle,
        total_oracles: config.oracle_authorities.len() as u8,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Submit AI verification result for a job deliverable
pub fn submit_ai_verification(
    ctx: Context<SubmitAIVerification>,
    verification_type: u8,
    score: u8,
    confidence: u8,
    result_uri: String,
    details_hash: [u8; 32],
) -> Result<()> {
    let config = &ctx.accounts.ai_oracle_config;
    let result = &mut ctx.accounts.ai_verification_result;
    let clock = Clock::get()?;

    require!(config.active, AIOracleError::OracleInactive);
    require!(
        config.oracle_authorities.contains(&ctx.accounts.oracle.key()),
        AIOracleError::UnauthorizedOracle
    );
    require!(verification_type <= 5, AIOracleError::InvalidVerificationType);
    require!(score <= 100, AIOracleError::InvalidScore);
    require!(confidence <= 100, AIOracleError::InvalidConfidence);
    require!(result_uri.len() <= 200, AIOracleError::URITooLong);

    let oracle_idx = result.oracle_count as usize;
    require!(oracle_idx < MAX_ORACLE_AUTHORITIES, AIOracleError::TooManyVerifications);

    // Store individual oracle's result
    result.job = ctx.accounts.job.key();
    result.verification_type = verification_type;
    result.oracle_scores[oracle_idx] = score;
    result.oracle_confidences[oracle_idx] = confidence;
    result.oracle_keys[oracle_idx] = ctx.accounts.oracle.key();
    result.oracle_count += 1;
    result.result_uri = result_uri;
    result.details_hash = details_hash;
    result.last_updated = clock.unix_timestamp;

    // Calculate consensus if enough oracles have submitted
    if result.oracle_count >= config.min_oracle_consensus {
        let (avg_score, avg_confidence) = calculate_consensus(result);
        result.final_score = avg_score;
        result.final_confidence = avg_confidence;
        result.consensus_reached = true;

        // Auto-approve if score and confidence meet thresholds
        result.auto_approved = avg_score >= 70 && avg_confidence >= config.min_confidence;
    }

    if result.oracle_count == 1 {
        result.created_at = clock.unix_timestamp;
        result.bump = ctx.bumps.ai_verification_result;
    }

    emit!(AIVerificationSubmitted {
        job: result.job,
        oracle: ctx.accounts.oracle.key(),
        verification_type,
        score,
        confidence,
        oracle_count: result.oracle_count,
        consensus_reached: result.consensus_reached,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Dispute an AI verification result (triggers human review)
pub fn dispute_ai_verification(
    ctx: Context<DisputeAIVerification>,
    reason: String,
) -> Result<()> {
    let result = &mut ctx.accounts.ai_verification_result;
    let clock = Clock::get()?;

    require!(result.consensus_reached, AIOracleError::NoConsensusYet);
    require!(!result.disputed, AIOracleError::AlreadyDisputed);
    require!(reason.len() <= 500, AIOracleError::ReasonTooLong);

    result.disputed = true;
    result.dispute_reason = reason.clone();
    result.auto_approved = false; // Override auto-approval

    emit!(AIVerificationDisputed {
        job: result.job,
        disputed_by: ctx.accounts.disputer.key(),
        reason,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Resolve a disputed AI verification (admin/DAO decision)
pub fn resolve_ai_dispute(
    ctx: Context<ResolveAIDispute>,
    override_score: u8,
    resolution_uri: String,
) -> Result<()> {
    let result = &mut ctx.accounts.ai_verification_result;
    let clock = Clock::get()?;

    require!(result.disputed, AIOracleError::NotDisputed);
    require!(override_score <= 100, AIOracleError::InvalidScore);
    require!(resolution_uri.len() <= 200, AIOracleError::URITooLong);

    result.final_score = override_score;
    result.human_reviewed = true;
    result.resolution_uri = resolution_uri;
    result.auto_approved = override_score >= 70;

    emit!(AIDisputeResolved {
        job: result.job,
        resolver: ctx.accounts.resolver.key(),
        override_score,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// ==================== HELPER FUNCTIONS ====================

fn calculate_consensus(result: &AIVerificationResult) -> (u8, u8) {
    let count = result.oracle_count as usize;
    if count == 0 {
        return (0, 0);
    }

    let mut total_score: u32 = 0;
    let mut total_confidence: u32 = 0;

    for i in 0..count {
        total_score += result.oracle_scores[i] as u32;
        total_confidence += result.oracle_confidences[i] as u32;
    }

    let avg_score = (total_score / count as u32) as u8;
    let avg_confidence = (total_confidence / count as u32) as u8;

    (avg_score, avg_confidence)
}

// ==================== CONSTANTS ====================

pub const MAX_ORACLE_AUTHORITIES: usize = 5;

// ==================== CONTEXT STRUCTS ====================

#[derive(Accounts)]
pub struct InitAIOracleConfig<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + AIOracleConfig::INIT_SPACE,
        seeds = [b"ai-oracle-config"],
        bump
    )]
    pub ai_oracle_config: Account<'info, AIOracleConfig>,
    /// CHECK: Primary oracle authority
    pub primary_oracle: AccountInfo<'info>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ManageOracleAuthority<'info> {
    #[account(
        mut,
        seeds = [b"ai-oracle-config"],
        bump = ai_oracle_config.bump
    )]
    pub ai_oracle_config: Account<'info, AIOracleConfig>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct SubmitAIVerification<'info> {
    #[account(
        init_if_needed,
        payer = oracle,
        space = 8 + AIVerificationResult::INIT_SPACE,
        seeds = [b"ai-verification", job.key().as_ref()],
        bump
    )]
    pub ai_verification_result: Account<'info, AIVerificationResult>,
    #[account(
        seeds = [b"ai-oracle-config"],
        bump = ai_oracle_config.bump
    )]
    pub ai_oracle_config: Account<'info, AIOracleConfig>,
    /// CHECK: Job account reference
    pub job: AccountInfo<'info>,
    #[account(mut)]
    pub oracle: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DisputeAIVerification<'info> {
    #[account(
        mut,
        seeds = [b"ai-verification", ai_verification_result.job.as_ref()],
        bump = ai_verification_result.bump
    )]
    pub ai_verification_result: Account<'info, AIVerificationResult>,
    pub disputer: Signer<'info>,
}

#[derive(Accounts)]
pub struct ResolveAIDispute<'info> {
    #[account(
        mut,
        seeds = [b"ai-verification", ai_verification_result.job.as_ref()],
        bump = ai_verification_result.bump
    )]
    pub ai_verification_result: Account<'info, AIVerificationResult>,
    pub resolver: Signer<'info>,
}

// ==================== STATE ACCOUNTS ====================

#[account]
#[derive(InitSpace)]
pub struct AIOracleConfig {
    pub admin: Pubkey,
    #[max_len(5)]
    pub oracle_authorities: Vec<Pubkey>,
    pub min_confidence: u8,
    pub min_oracle_consensus: u8,
    pub total_verifications: u64,
    pub active: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct AIVerificationResult {
    pub job: Pubkey,
    pub verification_type: u8,
    // Multi-oracle results
    pub oracle_count: u8,
    pub oracle_scores: [u8; 5],
    pub oracle_confidences: [u8; 5],
    pub oracle_keys: [Pubkey; 5],
    // Consensus
    pub final_score: u8,
    pub final_confidence: u8,
    pub consensus_reached: bool,
    pub auto_approved: bool,
    // Metadata
    #[max_len(200)]
    pub result_uri: String,
    pub details_hash: [u8; 32],
    pub created_at: i64,
    pub last_updated: i64,
    // Dispute
    pub disputed: bool,
    #[max_len(500)]
    pub dispute_reason: String,
    pub human_reviewed: bool,
    #[max_len(200)]
    pub resolution_uri: String,
    pub bump: u8,
}

// ==================== ENUMS ====================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum VerificationType {
    CodeQuality = 0,
    DesignReview = 1,
    ContentModeration = 2,
    PlagiarismCheck = 3,
    SecurityAudit = 4,
    PerformanceTest = 5,
}

// ==================== EVENTS ====================

#[event]
pub struct AIOracleConfigInitialized {
    pub admin: Pubkey,
    pub primary_oracle: Pubkey,
    pub min_confidence: u8,
    pub min_oracle_consensus: u8,
    pub timestamp: i64,
}

#[event]
pub struct OracleAuthorityAdded {
    pub oracle: Pubkey,
    pub total_oracles: u8,
    pub timestamp: i64,
}

#[event]
pub struct AIVerificationSubmitted {
    pub job: Pubkey,
    pub oracle: Pubkey,
    pub verification_type: u8,
    pub score: u8,
    pub confidence: u8,
    pub oracle_count: u8,
    pub consensus_reached: bool,
    pub timestamp: i64,
}

#[event]
pub struct AIVerificationDisputed {
    pub job: Pubkey,
    pub disputed_by: Pubkey,
    pub reason: String,
    pub timestamp: i64,
}

#[event]
pub struct AIDisputeResolved {
    pub job: Pubkey,
    pub resolver: Pubkey,
    pub override_score: u8,
    pub timestamp: i64,
}

// ==================== ERROR CODES ====================

#[error_code]
pub enum AIOracleError {
    #[msg("Invalid confidence value (1-100)")]
    InvalidConfidence,
    #[msg("Invalid consensus requirement (1-5)")]
    InvalidConsensus,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Oracle inactive")]
    OracleInactive,
    #[msg("Unauthorized oracle")]
    UnauthorizedOracle,
    #[msg("Invalid verification type")]
    InvalidVerificationType,
    #[msg("Invalid score (0-100)")]
    InvalidScore,
    #[msg("URI too long (max 200)")]
    URITooLong,
    #[msg("Too many oracle authorities (max 5)")]
    TooManyOracles,
    #[msg("Oracle already exists")]
    OracleAlreadyExists,
    #[msg("Too many verifications")]
    TooManyVerifications,
    #[msg("No consensus yet")]
    NoConsensusYet,
    #[msg("Already disputed")]
    AlreadyDisputed,
    #[msg("Reason too long (max 500)")]
    ReasonTooLong,
    #[msg("Not disputed")]
    NotDisputed,
}
