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
    record.face_distance_bp = 0;
    record.bump = ctx.bumps.kyc_record;

    emit!(KycSubmitted {
        user: ctx.accounts.user.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

pub fn finalize_kyc(
    ctx: Context<FinalizeKyc>,
    id_type: IdType,
    face_distance_bp: u32,
    matched: bool,
) -> Result<()> {
    let record = &mut ctx.accounts.kyc_record;
    let clock = Clock::get()?;

    record.id_type = id_type;
    record.face_distance_bp = face_distance_bp;

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
        face_distance_bp,
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
    record.face_distance_bp = 0;

    emit!(KycReset {
        user: ctx.accounts.user.key(),
        timestamp: clock.unix_timestamp,
    });

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
        seeds = [b"kyc", user.key().as_ref()],
        bump = kyc_record.bump,
        constraint = kyc_record.authority == user.key() @ KycError::Unauthorized,
    )]
    pub kyc_record: Account<'info, KycRecord>,
    #[account(mut)]
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct ResetKyc<'info> {
    #[account(
        mut,
        seeds = [b"kyc", user.key().as_ref()],
        bump = kyc_record.bump,
        constraint = kyc_record.authority == user.key() @ KycError::Unauthorized,
    )]
    pub kyc_record: Account<'info, KycRecord>,
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
    pub face_distance_bp: u32,
    pub bump: u8,
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
    pub face_distance_bp: u32,
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
