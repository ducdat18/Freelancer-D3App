use anchor_lang::prelude::*;

// ==================== ON-CHAIN REFERRAL SYSTEM ====================

/// Initialize referral program configuration
pub fn init_referral_config(
    ctx: Context<InitReferralConfig>,
    level1_percentage: u8,
    level2_percentage: u8,
    max_levels: u8,
) -> Result<()> {
    require!(level1_percentage <= 20, ReferralError::PercentageTooHigh);
    require!(level2_percentage <= 10, ReferralError::PercentageTooHigh);
    require!(max_levels >= 1 && max_levels <= 3, ReferralError::InvalidMaxLevels);

    let config = &mut ctx.accounts.referral_config;
    let clock = Clock::get()?;

    config.admin = ctx.accounts.admin.key();
    config.level1_percentage = level1_percentage;
    config.level2_percentage = level2_percentage;
    config.max_levels = max_levels;
    config.total_referrals = 0;
    config.total_commissions_paid = 0;
    config.active = true;
    config.bump = ctx.bumps.referral_config;

    emit!(ReferralConfigInitialized {
        admin: config.admin,
        level1_percentage,
        level2_percentage,
        max_levels,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Register a new user with a referral link (referrer's wallet address)
pub fn register_referral(ctx: Context<RegisterReferral>) -> Result<()> {
    let referral = &mut ctx.accounts.referral_account;
    let config = &mut ctx.accounts.referral_config;
    let clock = Clock::get()?;

    require!(config.active, ReferralError::ProgramInactive);
    require!(
        ctx.accounts.referrer.key() != ctx.accounts.user.key(),
        ReferralError::CannotReferSelf
    );

    referral.user = ctx.accounts.user.key();
    referral.referrer = Some(ctx.accounts.referrer.key());
    referral.referral_count = 0;
    referral.total_earnings = 0;
    referral.registered_at = clock.unix_timestamp;
    referral.bump = ctx.bumps.referral_account;

    // Increment referrer's count if their account exists
    if let Some(referrer_account) = &mut ctx.accounts.referrer_referral_account {
        referrer_account.referral_count = referrer_account.referral_count
            .checked_add(1).ok_or(ReferralError::Overflow)?;
    }

    config.total_referrals = config.total_referrals
        .checked_add(1).ok_or(ReferralError::Overflow)?;

    emit!(ReferralRegistered {
        user: referral.user,
        referrer: ctx.accounts.referrer.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Distribute referral commission from a completed job payment
pub fn distribute_referral_commission(
    ctx: Context<DistributeReferralCommission>,
    job_amount: u64,
) -> Result<()> {
    let config = &ctx.accounts.referral_config;
    let payout = &mut ctx.accounts.referral_payout;
    let clock = Clock::get()?;

    require!(config.active, ReferralError::ProgramInactive);

    // Calculate level 1 commission
    let commission = job_amount
        .checked_mul(config.level1_percentage as u64).ok_or(ReferralError::Overflow)?
        .checked_div(100).ok_or(ReferralError::Overflow)?;

    require!(commission > 0, ReferralError::CommissionTooSmall);

    // Transfer commission from treasury/escrow to referrer
    **ctx.accounts.fee_source.to_account_info().try_borrow_mut_lamports()? -= commission;
    **ctx.accounts.referrer.to_account_info().try_borrow_mut_lamports()? += commission;

    payout.job = ctx.accounts.job.key();
    payout.referrer = ctx.accounts.referrer.key();
    payout.referred_user = ctx.accounts.referred_user.key();
    payout.amount = commission;
    payout.level = 1;
    payout.paid = true;
    payout.paid_at = Some(clock.unix_timestamp);
    payout.bump = ctx.bumps.referral_payout;

    // Update referrer's total earnings
    if let Some(referrer_account) = &mut ctx.accounts.referrer_referral_account {
        referrer_account.total_earnings = referrer_account.total_earnings
            .checked_add(commission).ok_or(ReferralError::Overflow)?;
    }

    emit!(ReferralCommissionPaid {
        job: payout.job,
        referrer: payout.referrer,
        referred_user: payout.referred_user,
        amount: commission,
        level: 1,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Distribute level 2 referral commission
pub fn distribute_level2_commission(
    ctx: Context<DistributeLevel2Commission>,
    job_amount: u64,
) -> Result<()> {
    let config = &ctx.accounts.referral_config;
    let payout = &mut ctx.accounts.referral_payout;
    let clock = Clock::get()?;

    require!(config.active, ReferralError::ProgramInactive);
    require!(config.max_levels >= 2, ReferralError::LevelNotSupported);

    let commission = job_amount
        .checked_mul(config.level2_percentage as u64).ok_or(ReferralError::Overflow)?
        .checked_div(100).ok_or(ReferralError::Overflow)?;

    require!(commission > 0, ReferralError::CommissionTooSmall);

    **ctx.accounts.fee_source.to_account_info().try_borrow_mut_lamports()? -= commission;
    **ctx.accounts.level2_referrer.to_account_info().try_borrow_mut_lamports()? += commission;

    payout.job = ctx.accounts.job.key();
    payout.referrer = ctx.accounts.level2_referrer.key();
    payout.referred_user = ctx.accounts.referred_user.key();
    payout.amount = commission;
    payout.level = 2;
    payout.paid = true;
    payout.paid_at = Some(clock.unix_timestamp);
    payout.bump = ctx.bumps.referral_payout;

    emit!(ReferralCommissionPaid {
        job: payout.job,
        referrer: payout.referrer,
        referred_user: payout.referred_user,
        amount: commission,
        level: 2,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// ==================== CONTEXT STRUCTS ====================

#[derive(Accounts)]
pub struct InitReferralConfig<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + ReferralConfig::INIT_SPACE,
        seeds = [b"referral-config"],
        bump
    )]
    pub referral_config: Account<'info, ReferralConfig>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterReferral<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + ReferralAccount::INIT_SPACE,
        seeds = [b"referral", user.key().as_ref()],
        bump
    )]
    pub referral_account: Account<'info, ReferralAccount>,
    #[account(
        mut,
        seeds = [b"referral-config"],
        bump = referral_config.bump
    )]
    pub referral_config: Account<'info, ReferralConfig>,
    /// CHECK: Referrer wallet address
    pub referrer: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [b"referral", referrer.key().as_ref()],
        bump = referrer_referral_account.bump
    )]
    pub referrer_referral_account: Option<Account<'info, ReferralAccount>>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DistributeReferralCommission<'info> {
    #[account(
        seeds = [b"referral-config"],
        bump = referral_config.bump
    )]
    pub referral_config: Account<'info, ReferralConfig>,
    #[account(
        init,
        payer = authority,
        space = 8 + ReferralPayout::INIT_SPACE,
        seeds = [b"referral-payout", job.key().as_ref(), referrer.key().as_ref()],
        bump
    )]
    pub referral_payout: Account<'info, ReferralPayout>,
    #[account(
        mut,
        seeds = [b"referral", referrer.key().as_ref()],
        bump = referrer_referral_account.bump
    )]
    pub referrer_referral_account: Option<Account<'info, ReferralAccount>>,
    /// CHECK: Job account
    pub job: AccountInfo<'info>,
    /// CHECK: Referrer wallet to receive commission
    #[account(mut)]
    pub referrer: AccountInfo<'info>,
    /// CHECK: The referred user
    pub referred_user: AccountInfo<'info>,
    /// CHECK: Fee source (escrow or treasury)
    #[account(mut)]
    pub fee_source: AccountInfo<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DistributeLevel2Commission<'info> {
    #[account(
        seeds = [b"referral-config"],
        bump = referral_config.bump
    )]
    pub referral_config: Account<'info, ReferralConfig>,
    #[account(
        init,
        payer = authority,
        space = 8 + ReferralPayout::INIT_SPACE,
        seeds = [b"referral-payout", job.key().as_ref(), level2_referrer.key().as_ref()],
        bump
    )]
    pub referral_payout: Account<'info, ReferralPayout>,
    /// CHECK: Job account
    pub job: AccountInfo<'info>,
    /// CHECK: Level 2 referrer wallet
    #[account(mut)]
    pub level2_referrer: AccountInfo<'info>,
    /// CHECK: The referred user
    pub referred_user: AccountInfo<'info>,
    /// CHECK: Fee source
    #[account(mut)]
    pub fee_source: AccountInfo<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// ==================== STATE ACCOUNTS ====================

#[account]
#[derive(InitSpace)]
pub struct ReferralConfig {
    pub admin: Pubkey,
    pub level1_percentage: u8,
    pub level2_percentage: u8,
    pub max_levels: u8,
    pub total_referrals: u64,
    pub total_commissions_paid: u64,
    pub active: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ReferralAccount {
    pub user: Pubkey,
    pub referrer: Option<Pubkey>,
    pub referral_count: u32,
    pub total_earnings: u64,
    pub registered_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ReferralPayout {
    pub job: Pubkey,
    pub referrer: Pubkey,
    pub referred_user: Pubkey,
    pub amount: u64,
    pub level: u8,
    pub paid: bool,
    pub paid_at: Option<i64>,
    pub bump: u8,
}

// ==================== EVENTS ====================

#[event]
pub struct ReferralConfigInitialized {
    pub admin: Pubkey,
    pub level1_percentage: u8,
    pub level2_percentage: u8,
    pub max_levels: u8,
    pub timestamp: i64,
}

#[event]
pub struct ReferralRegistered {
    pub user: Pubkey,
    pub referrer: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ReferralCommissionPaid {
    pub job: Pubkey,
    pub referrer: Pubkey,
    pub referred_user: Pubkey,
    pub amount: u64,
    pub level: u8,
    pub timestamp: i64,
}

// ==================== ERROR CODES ====================

#[error_code]
pub enum ReferralError {
    #[msg("Referral percentage too high")]
    PercentageTooHigh,
    #[msg("Invalid max levels (must be 1-3)")]
    InvalidMaxLevels,
    #[msg("Referral program is inactive")]
    ProgramInactive,
    #[msg("Cannot refer yourself")]
    CannotReferSelf,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Commission too small to distribute")]
    CommissionTooSmall,
    #[msg("Referral level not supported")]
    LevelNotSupported,
}
