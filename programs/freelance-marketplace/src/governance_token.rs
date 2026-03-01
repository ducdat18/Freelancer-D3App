use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};

// ==================== GOVERNANCE TOKEN & TOKENOMICS ====================

/// Initialize the platform configuration
pub fn init_platform_config(
    ctx: Context<InitPlatformConfig>,
    fee_percentage: u8,
    buyback_percentage: u8,
) -> Result<()> {
    require!(fee_percentage <= 10, GovernanceTokenError::FeeTooHigh);
    require!(buyback_percentage <= 100, GovernanceTokenError::InvalidBuybackPercentage);

    let config = &mut ctx.accounts.platform_config;
    let clock = Clock::get()?;

    config.admin = ctx.accounts.admin.key();
    config.token_mint = ctx.accounts.token_mint.key();
    config.treasury = ctx.accounts.treasury.key();
    config.total_staked = 0;
    config.fee_percentage = fee_percentage;
    config.buyback_percentage = buyback_percentage;
    config.accumulated_fees = 0;
    config.total_fees_collected = 0;
    config.total_burned = 0;
    config.last_distribution = clock.unix_timestamp;
    config.bump = ctx.bumps.platform_config;

    emit!(PlatformConfigInitialized {
        admin: config.admin,
        token_mint: config.token_mint,
        fee_percentage,
        buyback_percentage,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Stake platform tokens for yield and governance power
pub fn stake_tokens(
    ctx: Context<StakeTokens>,
    amount: u64,
    lock_period: i64,
) -> Result<()> {
    require!(amount > 0, GovernanceTokenError::InvalidAmount);
    require!(lock_period >= 0, GovernanceTokenError::InvalidLockPeriod);

    let clock = Clock::get()?;
    let stake = &mut ctx.accounts.token_stake;
    let config = &mut ctx.accounts.platform_config;

    // Transfer tokens from user to stake vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.user_token_account.to_account_info(),
        to: ctx.accounts.stake_vault.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    token::transfer(CpiContext::new(cpi_program, cpi_accounts), amount)?;

    stake.user = ctx.accounts.user.key();
    stake.amount = stake.amount.checked_add(amount).ok_or(GovernanceTokenError::Overflow)?;
    stake.staked_at = clock.unix_timestamp;
    stake.last_claimed = clock.unix_timestamp;
    stake.lock_until = clock.unix_timestamp.checked_add(lock_period).ok_or(GovernanceTokenError::Overflow)?;
    stake.accumulated_rewards = 0;
    stake.bump = ctx.bumps.token_stake;

    config.total_staked = config.total_staked.checked_add(amount).ok_or(GovernanceTokenError::Overflow)?;

    emit!(TokensStaked {
        user: stake.user,
        amount,
        lock_period,
        total_staked: config.total_staked,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Unstake tokens after lock period expires
pub fn unstake_tokens(ctx: Context<UnstakeTokens>) -> Result<()> {
    let clock = Clock::get()?;
    let stake = &mut ctx.accounts.token_stake;
    let config = &mut ctx.accounts.platform_config;

    require!(stake.user == ctx.accounts.user.key(), GovernanceTokenError::Unauthorized);
    require!(clock.unix_timestamp >= stake.lock_until, GovernanceTokenError::StillLocked);
    require!(stake.amount > 0, GovernanceTokenError::NothingToUnstake);

    let amount = stake.amount;

    // Transfer tokens from stake vault back to user using PDA signer
    let seeds = &[b"stake-vault" as &[u8], &[ctx.bumps.stake_vault]];
    let signer_seeds = &[&seeds[..]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.stake_vault.to_account_info(),
        to: ctx.accounts.user_token_account.to_account_info(),
        authority: ctx.accounts.stake_vault.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    token::transfer(
        CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds),
        amount,
    )?;

    config.total_staked = config.total_staked.checked_sub(amount).ok_or(GovernanceTokenError::Overflow)?;
    stake.amount = 0;

    emit!(TokensUnstaked {
        user: stake.user,
        amount,
        total_staked: config.total_staked,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Claim accumulated staking rewards (fee-sharing in stablecoin)
pub fn claim_staking_rewards(ctx: Context<ClaimStakingRewards>) -> Result<()> {
    let clock = Clock::get()?;
    let stake = &mut ctx.accounts.token_stake;
    let config = &ctx.accounts.platform_config;

    require!(stake.user == ctx.accounts.user.key(), GovernanceTokenError::Unauthorized);
    require!(stake.amount > 0, GovernanceTokenError::NothingToUnstake);

    // Calculate user's share of accumulated fees
    // share = (user_stake / total_staked) * accumulated_fees * (100 - buyback_percentage) / 100
    let fee_share_pct = 100u64.checked_sub(config.buyback_percentage as u64).ok_or(GovernanceTokenError::Overflow)?;
    let distributable_fees = config.accumulated_fees
        .checked_mul(fee_share_pct).ok_or(GovernanceTokenError::Overflow)?
        .checked_div(100).ok_or(GovernanceTokenError::Overflow)?;

    if config.total_staked == 0 || distributable_fees == 0 {
        return err!(GovernanceTokenError::NoRewardsAvailable);
    }

    let user_reward = distributable_fees
        .checked_mul(stake.amount).ok_or(GovernanceTokenError::Overflow)?
        .checked_div(config.total_staked).ok_or(GovernanceTokenError::Overflow)?;

    require!(user_reward > 0, GovernanceTokenError::NoRewardsAvailable);

    // Transfer reward from treasury to user
    let treasury_seeds = &[b"platform-treasury" as &[u8], &[ctx.bumps.treasury]];
    let signer_seeds = &[&treasury_seeds[..]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.treasury.to_account_info(),
        to: ctx.accounts.user_reward_account.to_account_info(),
        authority: ctx.accounts.treasury.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    token::transfer(
        CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds),
        user_reward,
    )?;

    stake.accumulated_rewards = stake.accumulated_rewards.checked_add(user_reward).ok_or(GovernanceTokenError::Overflow)?;
    stake.last_claimed = clock.unix_timestamp;

    emit!(StakingRewardsClaimed {
        user: stake.user,
        amount: user_reward,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Collect platform fee from completed job escrow
pub fn collect_platform_fee(ctx: Context<CollectPlatformFee>, job_amount: u64) -> Result<()> {
    let config = &mut ctx.accounts.platform_config;
    let clock = Clock::get()?;

    require!(
        ctx.accounts.authority.key() == config.admin,
        GovernanceTokenError::Unauthorized
    );

    // Calculate fee: job_amount * fee_percentage / 100
    let fee = job_amount
        .checked_mul(config.fee_percentage as u64).ok_or(GovernanceTokenError::Overflow)?
        .checked_div(100).ok_or(GovernanceTokenError::Overflow)?;

    config.accumulated_fees = config.accumulated_fees.checked_add(fee).ok_or(GovernanceTokenError::Overflow)?;
    config.total_fees_collected = config.total_fees_collected.checked_add(fee).ok_or(GovernanceTokenError::Overflow)?;

    emit!(PlatformFeeCollected {
        job_amount,
        fee_amount: fee,
        total_accumulated: config.accumulated_fees,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Execute buyback and burn of platform tokens
pub fn execute_buyback_burn(ctx: Context<ExecuteBuybackBurn>, burn_amount: u64) -> Result<()> {
    let config = &mut ctx.accounts.platform_config;
    let clock = Clock::get()?;

    require!(
        ctx.accounts.admin.key() == config.admin,
        GovernanceTokenError::Unauthorized
    );
    require!(burn_amount > 0, GovernanceTokenError::InvalidAmount);

    // Burn tokens from the buyback account
    let cpi_accounts = anchor_spl::token::Burn {
        mint: ctx.accounts.token_mint.to_account_info(),
        from: ctx.accounts.buyback_token_account.to_account_info(),
        authority: ctx.accounts.admin.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    anchor_spl::token::burn(CpiContext::new(cpi_program, cpi_accounts), burn_amount)?;

    config.total_burned = config.total_burned.checked_add(burn_amount).ok_or(GovernanceTokenError::Overflow)?;

    emit!(TokensBurned {
        amount: burn_amount,
        total_burned: config.total_burned,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Freelancer stakes quality collateral on a project
pub fn stake_quality_collateral(
    ctx: Context<StakeQualityCollateral>,
    amount: u64,
) -> Result<()> {
    require!(amount > 0, GovernanceTokenError::InvalidAmount);

    let clock = Clock::get()?;
    let quality_stake = &mut ctx.accounts.quality_stake;

    // Transfer tokens from freelancer to quality vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.staker_token_account.to_account_info(),
        to: ctx.accounts.quality_vault.to_account_info(),
        authority: ctx.accounts.staker.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    token::transfer(CpiContext::new(cpi_program, cpi_accounts), amount)?;

    quality_stake.job = ctx.accounts.job.key();
    quality_stake.staker = ctx.accounts.staker.key();
    quality_stake.amount = amount;
    quality_stake.staked_at = clock.unix_timestamp;
    quality_stake.released = false;
    quality_stake.slashed = false;
    quality_stake.bump = ctx.bumps.quality_stake;

    emit!(QualityCollateralStaked {
        job: quality_stake.job,
        staker: quality_stake.staker,
        amount,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Release quality collateral after successful job completion
pub fn release_quality_collateral(ctx: Context<ReleaseQualityCollateral>) -> Result<()> {
    let quality_stake = &mut ctx.accounts.quality_stake;
    let clock = Clock::get()?;

    require!(!quality_stake.released, GovernanceTokenError::AlreadyReleased);
    require!(!quality_stake.slashed, GovernanceTokenError::AlreadySlashed);

    let amount = quality_stake.amount;

    // Transfer tokens back to staker
    let job_key = ctx.accounts.job.key();
    let seeds = &[b"quality-vault" as &[u8], job_key.as_ref(), &[ctx.bumps.quality_vault]];
    let signer_seeds = &[&seeds[..]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.quality_vault.to_account_info(),
        to: ctx.accounts.staker_token_account.to_account_info(),
        authority: ctx.accounts.quality_vault.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    token::transfer(
        CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds),
        amount,
    )?;

    quality_stake.released = true;

    emit!(QualityCollateralReleased {
        job: quality_stake.job,
        staker: quality_stake.staker,
        amount,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Slash quality collateral on dispute loss
pub fn slash_quality_collateral(ctx: Context<SlashQualityCollateral>) -> Result<()> {
    let quality_stake = &mut ctx.accounts.quality_stake;
    let clock = Clock::get()?;

    require!(!quality_stake.released, GovernanceTokenError::AlreadyReleased);
    require!(!quality_stake.slashed, GovernanceTokenError::AlreadySlashed);

    let amount = quality_stake.amount;

    // Transfer slashed tokens to the injured party
    let job_key = ctx.accounts.job.key();
    let seeds = &[b"quality-vault" as &[u8], job_key.as_ref(), &[ctx.bumps.quality_vault]];
    let signer_seeds = &[&seeds[..]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.quality_vault.to_account_info(),
        to: ctx.accounts.beneficiary_token_account.to_account_info(),
        authority: ctx.accounts.quality_vault.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    token::transfer(
        CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds),
        amount,
    )?;

    quality_stake.slashed = true;

    emit!(QualityCollateralSlashed {
        job: quality_stake.job,
        staker: quality_stake.staker,
        beneficiary: ctx.accounts.beneficiary.key(),
        amount,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// ==================== CONTEXT STRUCTS ====================

#[derive(Accounts)]
pub struct InitPlatformConfig<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + PlatformConfig::INIT_SPACE,
        seeds = [b"platform-config"],
        bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    pub token_mint: Account<'info, Mint>,
    /// CHECK: Treasury token account
    pub treasury: AccountInfo<'info>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StakeTokens<'info> {
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + TokenStake::INIT_SPACE,
        seeds = [b"token-stake", user.key().as_ref()],
        bump
    )]
    pub token_stake: Account<'info, TokenStake>,
    #[account(
        mut,
        seeds = [b"platform-config"],
        bump = platform_config.bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"stake-vault"],
        bump
    )]
    pub stake_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UnstakeTokens<'info> {
    #[account(
        mut,
        seeds = [b"token-stake", user.key().as_ref()],
        bump = token_stake.bump
    )]
    pub token_stake: Account<'info, TokenStake>,
    #[account(
        mut,
        seeds = [b"platform-config"],
        bump = platform_config.bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"stake-vault"],
        bump
    )]
    pub stake_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimStakingRewards<'info> {
    #[account(
        mut,
        seeds = [b"token-stake", user.key().as_ref()],
        bump = token_stake.bump
    )]
    pub token_stake: Account<'info, TokenStake>,
    #[account(
        seeds = [b"platform-config"],
        bump = platform_config.bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    #[account(
        mut,
        seeds = [b"platform-treasury"],
        bump
    )]
    pub treasury: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_reward_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CollectPlatformFee<'info> {
    #[account(
        mut,
        seeds = [b"platform-config"],
        bump = platform_config.bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ExecuteBuybackBurn<'info> {
    #[account(
        mut,
        seeds = [b"platform-config"],
        bump = platform_config.bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    #[account(mut)]
    pub token_mint: Account<'info, Mint>,
    #[account(mut)]
    pub buyback_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct StakeQualityCollateral<'info> {
    #[account(
        init,
        payer = staker,
        space = 8 + QualityStake::INIT_SPACE,
        seeds = [b"quality-stake", job.key().as_ref()],
        bump
    )]
    pub quality_stake: Account<'info, QualityStake>,
    /// CHECK: Job account reference
    pub job: AccountInfo<'info>,
    #[account(mut)]
    pub staker_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"quality-vault", job.key().as_ref()],
        bump
    )]
    pub quality_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub staker: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReleaseQualityCollateral<'info> {
    #[account(
        mut,
        seeds = [b"quality-stake", job.key().as_ref()],
        bump = quality_stake.bump
    )]
    pub quality_stake: Account<'info, QualityStake>,
    /// CHECK: Job account reference
    pub job: AccountInfo<'info>,
    #[account(mut)]
    pub staker_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"quality-vault", job.key().as_ref()],
        bump
    )]
    pub quality_vault: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SlashQualityCollateral<'info> {
    #[account(
        mut,
        seeds = [b"quality-stake", job.key().as_ref()],
        bump = quality_stake.bump
    )]
    pub quality_stake: Account<'info, QualityStake>,
    /// CHECK: Job account reference
    pub job: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [b"quality-vault", job.key().as_ref()],
        bump
    )]
    pub quality_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub beneficiary_token_account: Account<'info, TokenAccount>,
    /// CHECK: Beneficiary wallet
    pub beneficiary: AccountInfo<'info>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

// ==================== STATE ACCOUNTS ====================

#[account]
#[derive(InitSpace)]
pub struct PlatformConfig {
    pub admin: Pubkey,
    pub token_mint: Pubkey,
    pub treasury: Pubkey,
    pub total_staked: u64,
    pub fee_percentage: u8,
    pub buyback_percentage: u8,
    pub accumulated_fees: u64,
    pub total_fees_collected: u64,
    pub total_burned: u64,
    pub last_distribution: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct TokenStake {
    pub user: Pubkey,
    pub amount: u64,
    pub staked_at: i64,
    pub last_claimed: i64,
    pub lock_until: i64,
    pub accumulated_rewards: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct QualityStake {
    pub job: Pubkey,
    pub staker: Pubkey,
    pub amount: u64,
    pub staked_at: i64,
    pub released: bool,
    pub slashed: bool,
    pub bump: u8,
}

// ==================== EVENTS ====================

#[event]
pub struct PlatformConfigInitialized {
    pub admin: Pubkey,
    pub token_mint: Pubkey,
    pub fee_percentage: u8,
    pub buyback_percentage: u8,
    pub timestamp: i64,
}

#[event]
pub struct TokensStaked {
    pub user: Pubkey,
    pub amount: u64,
    pub lock_period: i64,
    pub total_staked: u64,
    pub timestamp: i64,
}

#[event]
pub struct TokensUnstaked {
    pub user: Pubkey,
    pub amount: u64,
    pub total_staked: u64,
    pub timestamp: i64,
}

#[event]
pub struct StakingRewardsClaimed {
    pub user: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct PlatformFeeCollected {
    pub job_amount: u64,
    pub fee_amount: u64,
    pub total_accumulated: u64,
    pub timestamp: i64,
}

#[event]
pub struct TokensBurned {
    pub amount: u64,
    pub total_burned: u64,
    pub timestamp: i64,
}

#[event]
pub struct QualityCollateralStaked {
    pub job: Pubkey,
    pub staker: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct QualityCollateralReleased {
    pub job: Pubkey,
    pub staker: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct QualityCollateralSlashed {
    pub job: Pubkey,
    pub staker: Pubkey,
    pub beneficiary: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

// ==================== ERROR CODES ====================

#[error_code]
pub enum GovernanceTokenError {
    #[msg("Fee percentage too high (max 10%)")]
    FeeTooHigh,
    #[msg("Invalid buyback percentage")]
    InvalidBuybackPercentage,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Invalid lock period")]
    InvalidLockPeriod,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Tokens still locked")]
    StillLocked,
    #[msg("Nothing to unstake")]
    NothingToUnstake,
    #[msg("No rewards available")]
    NoRewardsAvailable,
    #[msg("Collateral already released")]
    AlreadyReleased,
    #[msg("Collateral already slashed")]
    AlreadySlashed,
}
