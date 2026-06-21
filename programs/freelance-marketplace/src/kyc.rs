use anchor_lang::prelude::*;

// ==================== KYC INSTRUCTIONS ====================

pub fn submit_kyc(ctx: Context<SubmitKyc>, id_type: IdType) -> Result<()> {
    let record = &mut ctx.accounts.kyc_record;
    let clock = Clock::get()?;

    record.authority = ctx.accounts.user.key();
    record.status = KycStatus::Pending;
    record.id_type = id_type;
    record.submitted_at = clock.unix_timestamp;
    record.verified_at = 0;
    record.verification_hash = [0u8; 32];

    emit!(KycSubmitted {
        user: ctx.accounts.user.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// verification_hash = SHA-256(quantized_face_descriptor[128] || doc_type_byte || wallet_pubkey[32])
/// Computed entirely in the browser — no raw biometric data ever reaches the chain.
pub fn finalize_kyc(
    ctx: Context<FinalizeKyc>,
    id_type: IdType,
    verification_hash: [u8; 32],
    matched: bool,
) -> Result<()> {
    let record = &mut ctx.accounts.kyc_record;
    let clock = Clock::get()?;

    record.id_type = id_type;
    record.verification_hash = verification_hash;

    if matched {
        record.status = KycStatus::Verified;
        record.verified_at = clock.unix_timestamp;
    } else {
        record.status = KycStatus::Rejected;
        record.verified_at = 0;
    }

    emit!(KycFinalized {
        user: ctx.accounts.user.key(),
        verified: matched,
        verification_hash,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

pub fn reset_kyc(ctx: Context<ResetKyc>) -> Result<()> {
    let record = &mut ctx.accounts.kyc_record;
    let clock = Clock::get()?;

    record.status = KycStatus::Pending;
    record.submitted_at = clock.unix_timestamp;
    record.verified_at = 0;
    record.verification_hash = [0u8; 32];

    emit!(KycReset {
        user: ctx.accounts.user.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Close an existing KYC record using raw account access to handle legacy struct layouts.
/// Use this to migrate old accounts (created before verification_hash was added).
/// After closing, the user can call submit_kyc again to create a fresh record.
pub fn close_kyc_unchecked(ctx: Context<CloseKycUnchecked>) -> Result<()> {
    let record = &ctx.accounts.kyc_record;

    // Verify authority from raw bytes: authority is at bytes 8..40 (after 8-byte discriminator)
    {
        let data = record.data.borrow();
        require!(data.len() >= 40, KycError::Unauthorized);
        let mut authority_bytes = [0u8; 32];
        authority_bytes.copy_from_slice(&data[8..40]);
        let authority = Pubkey::from(authority_bytes);
        require_keys_eq!(authority, ctx.accounts.user.key(), KycError::Unauthorized);
    }

    // Transfer all lamports to user (closes the account)
    let balance = record.lamports();
    **record.try_borrow_mut_lamports()? -= balance;
    **ctx.accounts.user.try_borrow_mut_lamports()? += balance;

    // Zero out account data to mark as closed
    let mut data = record.try_borrow_mut_data()?;
    for b in data.iter_mut() {
        *b = 0;
    }

    Ok(())
}

// ==================== CONTEXTS ====================

#[derive(Accounts)]
pub struct SubmitKyc<'info> {
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + KycRecord::INIT_SPACE,
        seeds = [b"kyc", user.key().as_ref()],
        bump,
    )]
    pub kyc_record: Account<'info, KycRecord>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinalizeKyc<'info> {
    #[account(
        mut,
        realloc = 8 + KycRecord::INIT_SPACE,
        realloc::payer = user,
        realloc::zero = true,
        seeds = [b"kyc", user.key().as_ref()],
        bump,
        constraint = kyc_record.authority == user.key() @ KycError::Unauthorized,
    )]
    pub kyc_record: Account<'info, KycRecord>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResetKyc<'info> {
    #[account(
        mut,
        realloc = 8 + KycRecord::INIT_SPACE,
        realloc::payer = user,
        realloc::zero = false,
        seeds = [b"kyc", user.key().as_ref()],
        bump,
        constraint = kyc_record.authority == user.key() @ KycError::Unauthorized,
    )]
    pub kyc_record: Account<'info, KycRecord>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

/// Raw account access — bypasses Anchor deserialization for legacy struct migration.
#[derive(Accounts)]
pub struct CloseKycUnchecked<'info> {
    /// CHECK: raw account — authority verified manually from bytes 8..40
    #[account(
        mut,
        seeds = [b"kyc", user.key().as_ref()],
        bump,
    )]
    pub kyc_record: UncheckedAccount<'info>,
    #[account(mut)]
    pub user: Signer<'info>,
}

// ==================== ACCOUNT ====================

#[account]
#[derive(InitSpace)]
pub struct KycRecord {
    pub authority: Pubkey,
    pub status: KycStatus,
    pub id_type: IdType,
    pub submitted_at: i64,
    pub verified_at: i64,
    /// SHA-256(quantized_face_descriptor[128] || doc_type_byte || wallet_pubkey[32])
    /// Privacy: raw face distance is never stored on-chain.
    pub verification_hash: [u8; 32],
}

// ==================== TYPES ====================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, InitSpace)]
pub enum KycStatus {
    Pending,
    Verified,
    Rejected,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, InitSpace)]
pub enum IdType {
    NationalId,
    Passport,
    DriversLicense,
}

// ==================== EVENTS ====================

#[event]
pub struct KycSubmitted {
    pub user: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct KycFinalized {
    pub user: Pubkey,
    pub verified: bool,
    pub verification_hash: [u8; 32],
    pub timestamp: i64,
}

#[event]
pub struct KycReset {
    pub user: Pubkey,
    pub timestamp: i64,
}

// ==================== ERRORS ====================

#[error_code]
pub enum KycError {
    #[msg("Unauthorized KYC operation")]
    Unauthorized,
}
