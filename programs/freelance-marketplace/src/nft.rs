use anchor_lang::prelude::*;

use crate::{ErrorCode, Reputation};

// ==================== NFT MANAGER ====================

/// Record an achievement NFT for completing milestones
/// Note: Actual NFT minting happens off-chain using Metaplex SDK
/// This function records the achievement on-chain for verification
pub fn mint_achievement_nft(
    ctx: Context<MintAchievementNFT>,
    achievement_type: AchievementType,
    metadata_uri: String,
    nft_mint: Pubkey,
) -> Result<()> {
    let reputation = &ctx.accounts.reputation;
    let clock = Clock::get()?;

    // Validate achievement eligibility
    require!(
        is_eligible_for_achievement(&achievement_type, reputation),
        ErrorCode::NotEligibleForAchievement
    );

    // Record achievement
    let achievement_record = &mut ctx.accounts.achievement_record;
    achievement_record.user = ctx.accounts.user.key();
    achievement_record.nft_mint = nft_mint;
    achievement_record.achievement_type = achievement_type;
    achievement_record.metadata_uri = metadata_uri;
    achievement_record.minted_at = clock.unix_timestamp;
    achievement_record.bump = ctx.bumps.achievement_record;

    emit!(AchievementMinted {
        user: ctx.accounts.user.key(),
        nft_mint,
        achievement_type,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Record a job completion NFT as proof of work
/// Note: Actual NFT minting happens off-chain using Metaplex SDK
/// This function records the job completion NFT on-chain for verification
pub fn mint_job_completion_nft(
    ctx: Context<MintJobCompletionNFT>,
    job_title: String,
    metadata_uri: String,
    nft_mint: Pubkey,
) -> Result<()> {
    let job = &ctx.accounts.job;
    let clock = Clock::get()?;

    // Verify job is completed and caller is the freelancer
    require!(
        job.status == crate::JobStatus::Completed,
        ErrorCode::JobNotCompleted
    );
    require!(
        job.selected_freelancer == Some(ctx.accounts.freelancer.key()),
        ErrorCode::Unauthorized
    );

    // Record job NFT
    let job_nft_record = &mut ctx.accounts.job_nft_record;
    job_nft_record.job = job.key();
    job_nft_record.freelancer = ctx.accounts.freelancer.key();
    job_nft_record.nft_mint = nft_mint;
    job_nft_record.job_title = job_title;
    job_nft_record.metadata_uri = metadata_uri;
    job_nft_record.minted_at = clock.unix_timestamp;
    job_nft_record.bump = ctx.bumps.job_nft_record;

    emit!(JobCompletionNFTMinted {
        job: job.key(),
        freelancer: ctx.accounts.freelancer.key(),
        nft_mint,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// ==================== HELPER FUNCTIONS ====================

fn is_eligible_for_achievement(achievement_type: &AchievementType, reputation: &Reputation) -> bool {
    match achievement_type {
        AchievementType::FirstJob => reputation.completed_jobs >= 1,
        AchievementType::TenJobs => reputation.completed_jobs >= 10,
        AchievementType::FiftyJobs => reputation.completed_jobs >= 50,
        AchievementType::HundredJobs => reputation.completed_jobs >= 100,
        AchievementType::TopRated => {
            reputation.average_rating >= 4.8 && reputation.total_reviews >= 20
        }
        AchievementType::HighEarner => reputation.total_earned >= 10_000_000_000, // 10 SOL
        AchievementType::TrustedArbitrator => {
            reputation.average_rating >= 4.5 && reputation.total_reviews >= 50
        }
    }
}

// ==================== CONTEXTS ====================

#[derive(Accounts)]
#[instruction(achievement_type: AchievementType)]
pub struct MintAchievementNFT<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + AchievementRecord::INIT_SPACE,
        seeds = [b"achievement", user.key().as_ref(), &achievement_type.to_seed()],
        bump
    )]
    pub achievement_record: Account<'info, AchievementRecord>,

    #[account(
        seeds = [b"reputation", user.key().as_ref()],
        bump = reputation.bump
    )]
    pub reputation: Account<'info, Reputation>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintJobCompletionNFT<'info> {
    #[account(
        init,
        payer = freelancer,
        space = 8 + JobNFTRecord::INIT_SPACE,
        seeds = [b"job-nft", job.key().as_ref(), freelancer.key().as_ref()],
        bump
    )]
    pub job_nft_record: Account<'info, JobNFTRecord>,

    pub job: Account<'info, crate::Job>,

    #[account(mut)]
    pub freelancer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// ==================== STATE ACCOUNTS ====================

#[account]
#[derive(InitSpace)]
pub struct AchievementRecord {
    pub user: Pubkey,
    pub nft_mint: Pubkey,
    pub achievement_type: AchievementType,
    #[max_len(200)]
    pub metadata_uri: String,
    pub minted_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct JobNFTRecord {
    pub job: Pubkey,
    pub freelancer: Pubkey,
    pub nft_mint: Pubkey,
    #[max_len(100)]
    pub job_title: String,
    #[max_len(200)]
    pub metadata_uri: String,
    pub minted_at: i64,
    pub bump: u8,
}

// ==================== ENUMS ====================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum AchievementType {
    FirstJob,          // Complete 1 job
    TenJobs,           // Complete 10 jobs
    FiftyJobs,         // Complete 50 jobs
    HundredJobs,       // Complete 100 jobs
    TopRated,          // 4.8+ rating with 20+ reviews
    HighEarner,        // Earn 10+ SOL
    TrustedArbitrator, // 4.5+ rating with 50+ reviews
}

impl AchievementType {
    pub fn to_seed(&self) -> [u8; 1] {
        match self {
            AchievementType::FirstJob => [0],
            AchievementType::TenJobs => [1],
            AchievementType::FiftyJobs => [2],
            AchievementType::HundredJobs => [3],
            AchievementType::TopRated => [4],
            AchievementType::HighEarner => [5],
            AchievementType::TrustedArbitrator => [6],
        }
    }

    pub fn to_name(&self) -> String {
        match self {
            AchievementType::FirstJob => "First Job Completed".to_string(),
            AchievementType::TenJobs => "10 Jobs Milestone".to_string(),
            AchievementType::FiftyJobs => "50 Jobs Milestone".to_string(),
            AchievementType::HundredJobs => "100 Jobs Champion".to_string(),
            AchievementType::TopRated => "Top Rated Professional".to_string(),
            AchievementType::HighEarner => "High Earner Badge".to_string(),
            AchievementType::TrustedArbitrator => "Trusted Arbitrator".to_string(),
        }
    }

    pub fn to_symbol(&self) -> String {
        match self {
            AchievementType::FirstJob => "FIRST".to_string(),
            AchievementType::TenJobs => "TEN".to_string(),
            AchievementType::FiftyJobs => "FIFTY".to_string(),
            AchievementType::HundredJobs => "HUNDRED".to_string(),
            AchievementType::TopRated => "TOPRATED".to_string(),
            AchievementType::HighEarner => "HIGHEARN".to_string(),
            AchievementType::TrustedArbitrator => "ARBITR".to_string(),
        }
    }
}

// ==================== EVENTS ====================

#[event]
pub struct AchievementMinted {
    pub user: Pubkey,
    pub nft_mint: Pubkey,
    pub achievement_type: AchievementType,
    pub timestamp: i64,
}

#[event]
pub struct JobCompletionNFTMinted {
    pub job: Pubkey,
    pub freelancer: Pubkey,
    pub nft_mint: Pubkey,
    pub timestamp: i64,
}
