use anchor_lang::prelude::*;

// ==================== ZERO-KNOWLEDGE PROOFS ====================
// Off-chain ZK proof generation + on-chain hash verification
// Enables selective disclosure of reputation data without revealing specifics
// Example: "Completed >50 jobs" without showing exact count

/// Initialize ZK verifier configuration
pub fn init_zk_verifier_config(
    ctx: Context<InitZKVerifierConfig>,
) -> Result<()> {
    let config = &mut ctx.accounts.zk_verifier_config;
    let clock = Clock::get()?;

    config.admin = ctx.accounts.admin.key();
    config.authorized_verifiers = vec![ctx.accounts.admin.key()];
    config.total_credentials = 0;
    config.active = true;
    config.bump = ctx.bumps.zk_verifier_config;

    emit!(ZKVerifierConfigInitialized {
        admin: config.admin,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Add an authorized ZK verifier
pub fn add_zk_verifier(
    ctx: Context<ManageZKVerifier>,
    verifier: Pubkey,
) -> Result<()> {
    let config = &mut ctx.accounts.zk_verifier_config;
    let clock = Clock::get()?;

    require!(config.admin == ctx.accounts.admin.key(), ZKError::Unauthorized);
    require!(config.authorized_verifiers.len() < MAX_VERIFIERS, ZKError::TooManyVerifiers);
    require!(!config.authorized_verifiers.contains(&verifier), ZKError::VerifierAlreadyExists);

    config.authorized_verifiers.push(verifier);

    emit!(ZKVerifierAdded {
        verifier,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Submit a ZK credential (user submits proof hash, commitment)
pub fn submit_zk_credential(
    ctx: Context<SubmitZKCredential>,
    credential_type: String,
    commitment: [u8; 32],
    proof_hash: [u8; 32],
    public_inputs_hash: [u8; 32],
    valid_until: Option<i64>,
    index: u32,
) -> Result<()> {
    let credential = &mut ctx.accounts.zk_credential;
    let counter = &mut ctx.accounts.user_zk_counter;
    let clock = Clock::get()?;

    require!(credential_type.len() <= 50, ZKError::CredentialTypeTooLong);

    credential.user = ctx.accounts.user.key();
    credential.credential_type = credential_type;
    credential.commitment = commitment;
    credential.proof_hash = proof_hash;
    credential.public_inputs_hash = public_inputs_hash;
    credential.verifier = Pubkey::default();
    credential.submitted_at = clock.unix_timestamp;
    credential.verified_at = None;
    credential.valid_until = valid_until;
    credential.verified = false;
    credential.revoked = false;
    credential.credential_index = counter.count;
    credential.bump = ctx.bumps.zk_credential;

    counter.count = counter.count.checked_add(1).ok_or(ZKError::Overflow)?;

    emit!(ZKCredentialSubmitted {
        user: credential.user,
        credential_type: credential.credential_type.clone(),
        credential_index: credential.credential_index,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Verify a ZK credential (authorized verifier confirms off-chain proof)
pub fn verify_zk_credential(
    ctx: Context<VerifyZKCredential>,
) -> Result<()> {
    let config = &ctx.accounts.zk_verifier_config;
    let credential = &mut ctx.accounts.zk_credential;
    let clock = Clock::get()?;

    require!(config.active, ZKError::VerifierInactive);
    require!(
        config.authorized_verifiers.contains(&ctx.accounts.verifier.key()),
        ZKError::UnauthorizedVerifier
    );
    require!(!credential.verified, ZKError::AlreadyVerified);
    require!(!credential.revoked, ZKError::CredentialRevoked);

    credential.verifier = ctx.accounts.verifier.key();
    credential.verified = true;
    credential.verified_at = Some(clock.unix_timestamp);

    emit!(ZKCredentialVerified {
        user: credential.user,
        verifier: credential.verifier,
        credential_index: credential.credential_index,
        credential_type: credential.credential_type.clone(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Revoke a ZK credential
pub fn revoke_zk_credential(
    ctx: Context<RevokeZKCredential>,
) -> Result<()> {
    let config = &ctx.accounts.zk_verifier_config;
    let credential = &mut ctx.accounts.zk_credential;
    let clock = Clock::get()?;

    // Either admin or the user themselves can revoke
    require!(
        ctx.accounts.authority.key() == config.admin ||
        ctx.accounts.authority.key() == credential.user,
        ZKError::Unauthorized
    );
    require!(!credential.revoked, ZKError::AlreadyRevoked);

    credential.revoked = true;

    emit!(ZKCredentialRevoked {
        user: credential.user,
        credential_index: credential.credential_index,
        revoked_by: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Check if a user has a valid verified ZK credential of a specific type
pub fn check_zk_credential(
    credential: &ZKCredential,
    expected_type: &str,
) -> Result<bool> {
    if !credential.verified || credential.revoked {
        return Ok(false);
    }
    if credential.credential_type != expected_type {
        return Ok(false);
    }
    // Check expiration
    if let Some(valid_until) = credential.valid_until {
        let clock = Clock::get()?;
        if clock.unix_timestamp > valid_until {
            return Ok(false);
        }
    }
    Ok(true)
}

// ==================== CONSTANTS ====================

pub const MAX_VERIFIERS: usize = 5;

// Supported credential type strings
pub const ZK_TYPE_REPUTATION_RANGE: &str = "reputation_range";
pub const ZK_TYPE_JOB_COUNT_RANGE: &str = "job_count_range";
pub const ZK_TYPE_EARNINGS_RANGE: &str = "earnings_range";
pub const ZK_TYPE_SKILL_VERIFIED: &str = "skill_verified";
pub const ZK_TYPE_AGE_RANGE: &str = "age_range";

// ==================== CONTEXT STRUCTS ====================

#[derive(Accounts)]
pub struct InitZKVerifierConfig<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + ZKVerifierConfig::INIT_SPACE,
        seeds = [b"zk-verifier-config"],
        bump
    )]
    pub zk_verifier_config: Account<'info, ZKVerifierConfig>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ManageZKVerifier<'info> {
    #[account(
        mut,
        seeds = [b"zk-verifier-config"],
        bump = zk_verifier_config.bump
    )]
    pub zk_verifier_config: Account<'info, ZKVerifierConfig>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(credential_type: String, commitment: [u8; 32], proof_hash: [u8; 32], public_inputs_hash: [u8; 32], valid_until: Option<i64>, index: u32)]
pub struct SubmitZKCredential<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + ZKCredential::INIT_SPACE,
        seeds = [b"zk-credential", user.key().as_ref(), &index.to_le_bytes()],
        bump
    )]
    pub zk_credential: Account<'info, ZKCredential>,
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserZKCounter::INIT_SPACE,
        seeds = [b"zk-counter", user.key().as_ref()],
        bump
    )]
    pub user_zk_counter: Account<'info, UserZKCounter>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifyZKCredential<'info> {
    #[account(
        mut,
        seeds = [b"zk-credential", zk_credential.user.as_ref(), &zk_credential.credential_index.to_le_bytes()],
        bump = zk_credential.bump
    )]
    pub zk_credential: Account<'info, ZKCredential>,
    #[account(
        seeds = [b"zk-verifier-config"],
        bump = zk_verifier_config.bump
    )]
    pub zk_verifier_config: Account<'info, ZKVerifierConfig>,
    pub verifier: Signer<'info>,
}

#[derive(Accounts)]
pub struct RevokeZKCredential<'info> {
    #[account(
        mut,
        seeds = [b"zk-credential", zk_credential.user.as_ref(), &zk_credential.credential_index.to_le_bytes()],
        bump = zk_credential.bump
    )]
    pub zk_credential: Account<'info, ZKCredential>,
    #[account(
        seeds = [b"zk-verifier-config"],
        bump = zk_verifier_config.bump
    )]
    pub zk_verifier_config: Account<'info, ZKVerifierConfig>,
    pub authority: Signer<'info>,
}

// ==================== STATE ACCOUNTS ====================

#[account]
#[derive(InitSpace)]
pub struct ZKVerifierConfig {
    pub admin: Pubkey,
    #[max_len(5)]
    pub authorized_verifiers: Vec<Pubkey>,
    pub total_credentials: u64,
    pub active: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ZKCredential {
    pub user: Pubkey,
    #[max_len(50)]
    pub credential_type: String,
    pub commitment: [u8; 32],          // Pedersen commitment
    pub proof_hash: [u8; 32],          // Hash of ZK proof (verified off-chain)
    pub public_inputs_hash: [u8; 32],  // Hash of public inputs
    pub verifier: Pubkey,
    pub submitted_at: i64,
    pub verified_at: Option<i64>,
    pub valid_until: Option<i64>,
    pub verified: bool,
    pub revoked: bool,
    pub credential_index: u32,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct UserZKCounter {
    pub user: Pubkey,
    pub count: u32,
    pub bump: u8,
}

// ==================== EVENTS ====================

#[event]
pub struct ZKVerifierConfigInitialized {
    pub admin: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ZKVerifierAdded {
    pub verifier: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ZKCredentialSubmitted {
    pub user: Pubkey,
    pub credential_type: String,
    pub credential_index: u32,
    pub timestamp: i64,
}

#[event]
pub struct ZKCredentialVerified {
    pub user: Pubkey,
    pub verifier: Pubkey,
    pub credential_index: u32,
    pub credential_type: String,
    pub timestamp: i64,
}

#[event]
pub struct ZKCredentialRevoked {
    pub user: Pubkey,
    pub credential_index: u32,
    pub revoked_by: Pubkey,
    pub timestamp: i64,
}

// ==================== ERROR CODES ====================

#[error_code]
pub enum ZKError {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Too many verifiers (max 5)")]
    TooManyVerifiers,
    #[msg("Verifier already exists")]
    VerifierAlreadyExists,
    #[msg("Credential type too long (max 50)")]
    CredentialTypeTooLong,
    #[msg("Verifier inactive")]
    VerifierInactive,
    #[msg("Unauthorized verifier")]
    UnauthorizedVerifier,
    #[msg("Already verified")]
    AlreadyVerified,
    #[msg("Credential revoked")]
    CredentialRevoked,
    #[msg("Already revoked")]
    AlreadyRevoked,
    #[msg("Arithmetic overflow")]
    Overflow,
}
