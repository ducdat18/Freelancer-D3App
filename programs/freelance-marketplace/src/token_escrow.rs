use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{ErrorCode, Job, JobStatus};

// ==================== TOKEN ESCROW MANAGER ====================

/// Deposit SPL tokens into escrow for a job
pub fn deposit_token_escrow(ctx: Context<DepositTokenEscrow>, amount: u64) -> Result<()> {
    let job = &mut ctx.accounts.job;
    let token_escrow = &mut ctx.accounts.token_escrow;
    let clock = Clock::get()?;

    require!(job.client == ctx.accounts.client.key(), ErrorCode::Unauthorized);
    require!(amount >= job.budget, ErrorCode::InsufficientEscrow);
    require!(token_escrow.amount == 0, ErrorCode::EscrowAlreadyFunded);

    // Transfer SPL tokens to escrow PDA
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.client_token_account.to_account_info(),
                to: ctx.accounts.escrow_token_account.to_account_info(),
                authority: ctx.accounts.client.to_account_info(),
            },
        ),
        amount,
    )?;

    token_escrow.job = job.key();
    token_escrow.client = job.client;
    token_escrow.freelancer = job.selected_freelancer.unwrap();
    token_escrow.token_mint = ctx.accounts.token_mint.key();
    token_escrow.amount = amount;
    token_escrow.locked = true;
    token_escrow.released = false;
    token_escrow.disputed = false;
    token_escrow.created_at = clock.unix_timestamp;
    token_escrow.bump = ctx.bumps.token_escrow;

    job.escrow_amount = amount;
    job.updated_at = clock.unix_timestamp;

    emit!(TokenEscrowDeposited {
        escrow: token_escrow.key(),
        job: job.key(),
        token_mint: token_escrow.token_mint,
        amount,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Release SPL token escrow payment to freelancer
pub fn release_token_escrow(ctx: Context<ReleaseTokenEscrow>) -> Result<()> {
    let token_escrow = &mut ctx.accounts.token_escrow;
    let job = &mut ctx.accounts.job;
    let clock = Clock::get()?;

    require!(job.client == ctx.accounts.client.key(), ErrorCode::Unauthorized);
    require!(token_escrow.job == job.key(), ErrorCode::InvalidEscrow);
    require!(token_escrow.locked, ErrorCode::EscrowNotLocked);
    require!(!token_escrow.released, ErrorCode::EscrowAlreadyReleased);
    require!(!token_escrow.disputed, ErrorCode::EscrowDisputed);

    // Transfer SPL tokens from escrow to freelancer
    let job_key = job.key();
    let seeds = &[
        b"token-escrow".as_ref(),
        job_key.as_ref(),
        &[token_escrow.bump],
    ];
    let signer = &[&seeds[..]];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.freelancer_token_account.to_account_info(),
                authority: token_escrow.to_account_info(),
            },
            signer,
        ),
        token_escrow.amount,
    )?;

    token_escrow.released = true;
    token_escrow.locked = false;
    job.status = JobStatus::Completed;
    job.updated_at = clock.unix_timestamp;

    emit!(TokenEscrowReleased {
        escrow: token_escrow.key(),
        job: job.key(),
        freelancer: token_escrow.freelancer,
        token_mint: token_escrow.token_mint,
        amount: token_escrow.amount,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Open dispute for token escrow
pub fn open_token_dispute(ctx: Context<OpenTokenDispute>, reason: String) -> Result<()> {
    let token_escrow = &mut ctx.accounts.token_escrow;
    let job = &mut ctx.accounts.job;
    let token_dispute = &mut ctx.accounts.token_dispute;
    let clock = Clock::get()?;

    let initiator = ctx.accounts.initiator.key();
    require!(
        initiator == token_escrow.client || initiator == token_escrow.freelancer,
        ErrorCode::Unauthorized
    );
    require!(!token_escrow.disputed, ErrorCode::EscrowAlreadyDisputed);
    require!(reason.len() <= 500, ErrorCode::ReasonTooLong);

    token_dispute.job = job.key();
    token_dispute.escrow = token_escrow.key();
    token_dispute.client = token_escrow.client;
    token_dispute.freelancer = token_escrow.freelancer;
    token_dispute.initiator = initiator;
    token_dispute.token_mint = token_escrow.token_mint;
    token_dispute.reason = reason;
    token_dispute.status = crate::DisputeStatus::Open;
    token_dispute.votes_for_client = 0;
    token_dispute.votes_for_freelancer = 0;
    token_dispute.created_at = clock.unix_timestamp;
    token_dispute.resolved_at = None;
    token_dispute.bump = ctx.bumps.token_dispute;

    token_escrow.disputed = true;
    job.status = JobStatus::Disputed;
    job.updated_at = clock.unix_timestamp;

    emit!(TokenDisputeOpened {
        dispute: token_dispute.key(),
        job: job.key(),
        initiator,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Resolve token dispute and distribute tokens
pub fn resolve_token_dispute(ctx: Context<ResolveTokenDispute>) -> Result<()> {
    let token_dispute = &mut ctx.accounts.token_dispute;
    let token_escrow = &mut ctx.accounts.token_escrow;
    let job = &mut ctx.accounts.job;
    let clock = Clock::get()?;

    require!(
        token_dispute.status == crate::DisputeStatus::Open,
        ErrorCode::DisputeNotOpen
    );

    let total_votes = token_dispute.votes_for_client + token_dispute.votes_for_freelancer;
    require!(total_votes >= 5, ErrorCode::InsufficientVotes);

    let winner_is_client = token_dispute.votes_for_client > token_dispute.votes_for_freelancer;

    // Transfer tokens to winner
    let job_key = job.key();
    let seeds = &[
        b"token-escrow".as_ref(),
        job_key.as_ref(),
        &[token_escrow.bump],
    ];
    let signer = &[&seeds[..]];

    if winner_is_client {
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_token_account.to_account_info(),
                    to: ctx.accounts.client_token_account.to_account_info(),
                    authority: token_escrow.to_account_info(),
                },
                signer,
            ),
            token_escrow.amount,
        )?;
        token_dispute.status = crate::DisputeStatus::ResolvedClient;
    } else {
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_token_account.to_account_info(),
                    to: ctx.accounts.freelancer_token_account.to_account_info(),
                    authority: token_escrow.to_account_info(),
                },
                signer,
            ),
            token_escrow.amount,
        )?;
        token_dispute.status = crate::DisputeStatus::ResolvedFreelancer;
    }

    token_dispute.resolved_at = Some(clock.unix_timestamp);
    token_escrow.released = true;
    token_escrow.locked = false;
    job.status = JobStatus::Completed;
    job.updated_at = clock.unix_timestamp;

    emit!(TokenDisputeResolved {
        dispute: token_dispute.key(),
        winner_is_client,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// ==================== CONTEXTS ====================

#[derive(Accounts)]
pub struct DepositTokenEscrow<'info> {
    #[account(
        init,
        payer = client,
        space = 8 + TokenEscrow::INIT_SPACE,
        seeds = [b"token-escrow", job.key().as_ref()],
        bump
    )]
    pub token_escrow: Account<'info, TokenEscrow>,

    #[account(mut)]
    pub job: Account<'info, Job>,

    pub token_mint: Account<'info, token::Mint>,

    #[account(
        mut,
        constraint = client_token_account.owner == client.key(),
        constraint = client_token_account.mint == token_mint.key()
    )]
    pub client_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = client,
        token::mint = token_mint,
        token::authority = token_escrow,
        seeds = [b"escrow-vault", job.key().as_ref()],
        bump
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub client: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReleaseTokenEscrow<'info> {
    #[account(mut)]
    pub token_escrow: Account<'info, TokenEscrow>,

    #[account(mut)]
    pub job: Account<'info, Job>,

    #[account(
        mut,
        constraint = escrow_token_account.mint == token_escrow.token_mint,
        constraint = escrow_token_account.owner == token_escrow.key()
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = freelancer_token_account.owner == token_escrow.freelancer,
        constraint = freelancer_token_account.mint == token_escrow.token_mint
    )]
    pub freelancer_token_account: Account<'info, TokenAccount>,

    pub client: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct OpenTokenDispute<'info> {
    #[account(
        init,
        payer = initiator,
        space = 8 + TokenDispute::INIT_SPACE,
        seeds = [b"token-dispute", job.key().as_ref()],
        bump
    )]
    pub token_dispute: Account<'info, TokenDispute>,

    #[account(mut)]
    pub token_escrow: Account<'info, TokenEscrow>,

    #[account(mut)]
    pub job: Account<'info, Job>,

    #[account(mut)]
    pub initiator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveTokenDispute<'info> {
    #[account(mut)]
    pub token_dispute: Account<'info, TokenDispute>,

    #[account(mut)]
    pub token_escrow: Account<'info, TokenEscrow>,

    #[account(mut)]
    pub job: Account<'info, Job>,

    #[account(
        mut,
        constraint = escrow_token_account.mint == token_escrow.token_mint
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = client_token_account.owner == token_escrow.client,
        constraint = client_token_account.mint == token_escrow.token_mint
    )]
    pub client_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = freelancer_token_account.owner == token_escrow.freelancer,
        constraint = freelancer_token_account.mint == token_escrow.token_mint
    )]
    pub freelancer_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

// ==================== STATE ACCOUNTS ====================

#[account]
#[derive(InitSpace)]
pub struct TokenEscrow {
    pub job: Pubkey,
    pub client: Pubkey,
    pub freelancer: Pubkey,
    pub token_mint: Pubkey,
    pub amount: u64,
    pub locked: bool,
    pub released: bool,
    pub disputed: bool,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct TokenDispute {
    pub job: Pubkey,
    pub escrow: Pubkey,
    pub client: Pubkey,
    pub freelancer: Pubkey,
    pub initiator: Pubkey,
    pub token_mint: Pubkey,
    #[max_len(500)]
    pub reason: String,
    pub status: crate::DisputeStatus,
    pub votes_for_client: u32,
    pub votes_for_freelancer: u32,
    pub created_at: i64,
    pub resolved_at: Option<i64>,
    pub bump: u8,
}

// ==================== EVENTS ====================

#[event]
pub struct TokenEscrowDeposited {
    pub escrow: Pubkey,
    pub job: Pubkey,
    pub token_mint: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct TokenEscrowReleased {
    pub escrow: Pubkey,
    pub job: Pubkey,
    pub freelancer: Pubkey,
    pub token_mint: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct TokenDisputeOpened {
    pub dispute: Pubkey,
    pub job: Pubkey,
    pub initiator: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct TokenDisputeResolved {
    pub dispute: Pubkey,
    pub winner_is_client: bool,
    pub timestamp: i64,
}
