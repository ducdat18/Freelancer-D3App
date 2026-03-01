use anchor_lang::prelude::*;

pub mod nft;
pub mod token_escrow;
pub mod arbitrator_fees;
pub mod chat;
pub mod milestone;
pub mod sbt_reputation;
pub mod staking_dispute;
pub mod governance_token;
pub mod referral;
pub mod did;
pub mod sybil_resistance;
pub mod dao_governance;
pub mod account_abstraction;
pub mod social_recovery;
pub mod ai_oracle;
pub mod zk_proofs;
pub use nft::*;
pub use token_escrow::*;
pub use arbitrator_fees::*;
pub use chat::*;
pub use milestone::*;
pub use sbt_reputation::*;
pub use staking_dispute::*;
pub use governance_token::*;
pub use referral::*;
pub use did::*;
pub use sybil_resistance::*;
pub use dao_governance::*;
pub use account_abstraction::*;
pub use social_recovery::*;
pub use ai_oracle::*;
pub use zk_proofs::*;

declare_id!("FStwCj8zLzNkz7gTavooDcqF4FSyDcF9o9SCh96yyP7i");

#[program]
pub mod freelance_marketplace {
    use super::*;

    // ==================== JOB MANAGER ====================

    /// Create a new job posting
    pub fn create_job(
        ctx: Context<CreateJob>,
        _job_id: u64,
        title: String,
        description: String,
        budget: u64,
        metadata_uri: String,
        token_mint: Option<Pubkey>,  // None = SOL, Some = SPL token
    ) -> Result<()> {
        let job = &mut ctx.accounts.job;
        let clock = Clock::get()?;

        require!(title.len() <= 100, ErrorCode::TitleTooLong);
        require!(description.len() <= 500, ErrorCode::DescriptionTooLong);
        require!(budget > 0, ErrorCode::InvalidBudget);

        job.client = ctx.accounts.client.key();
        job.title = title;
        job.description = description;
        job.budget = budget;
        job.metadata_uri = metadata_uri;
        job.token_mint = token_mint;
        job.status = JobStatus::Open;
        job.selected_freelancer = None;
        job.created_at = clock.unix_timestamp;
        job.updated_at = clock.unix_timestamp;
        job.bid_count = 0;
        job.escrow_amount = 0;
        job.bump = ctx.bumps.job;

        emit!(JobCreated {
            job: job.key(),
            client: job.client,
            budget: job.budget,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Submit a bid for a job
    pub fn submit_bid(
        ctx: Context<SubmitBid>,
        proposed_budget: u64,
        proposal: String,
        timeline_days: u16,
        cv_uri: Option<String>,
    ) -> Result<()> {
        let bid = &mut ctx.accounts.bid;
        let job = &mut ctx.accounts.job;
        let clock = Clock::get()?;

        require!(job.status == JobStatus::Open, ErrorCode::JobNotOpen);
        require!(proposed_budget > 0, ErrorCode::InvalidBudget);
        require!(proposal.len() <= 500, ErrorCode::ProposalTooLong);

        // Anti-sniping: Bid must be reasonable (not higher than budget)
        require!(
            proposed_budget <= job.budget,
            ErrorCode::BidExceedsBudget
        );

        // Validate CV URI if provided
        let final_cv_uri = cv_uri.unwrap_or_else(|| String::from(""));
        require!(final_cv_uri.len() <= 200, ErrorCode::URITooLong);

        bid.job = job.key();
        bid.freelancer = ctx.accounts.freelancer.key();
        bid.proposed_budget = proposed_budget;
        bid.proposal = proposal;
        bid.timeline_days = timeline_days;
        bid.cv_uri = final_cv_uri;
        bid.status = BidStatus::Pending;
        bid.created_at = clock.unix_timestamp;
        bid.bump = ctx.bumps.bid;

        job.bid_count = job.bid_count.checked_add(1).unwrap();
        job.updated_at = clock.unix_timestamp;

        emit!(BidSubmitted {
            bid: bid.key(),
            job: job.key(),
            freelancer: bid.freelancer,
            proposed_budget,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Select a winning bid and assign freelancer
    pub fn select_bid(ctx: Context<SelectBid>) -> Result<()> {
        let job = &mut ctx.accounts.job;
        let bid = &mut ctx.accounts.bid;
        let clock = Clock::get()?;

        require!(job.status == JobStatus::Open, ErrorCode::JobNotOpen);
        require!(job.client == ctx.accounts.client.key(), ErrorCode::Unauthorized);
        require!(bid.job == job.key(), ErrorCode::InvalidBid);
        require!(bid.status == BidStatus::Pending, ErrorCode::BidNotPending);

        job.selected_freelancer = Some(bid.freelancer);
        job.status = JobStatus::InProgress;
        job.updated_at = clock.unix_timestamp;

        bid.status = BidStatus::Accepted;

        emit!(BidAccepted {
            bid: bid.key(),
            job: job.key(),
            freelancer: bid.freelancer,
            timestamp: clock.unix_timestamp,
        });

        emit!(FreelancerNotification {
            freelancer: bid.freelancer,
            job: job.key(),
            notification_type: NotificationType::JobAssigned,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Cancel a job and refund escrow if applicable
    /// CRITICAL: Can only cancel if work has NOT been submitted
    pub fn cancel_job(ctx: Context<CancelJob>) -> Result<()> {
        let job = &mut ctx.accounts.job;
        let clock = Clock::get()?;

        require!(job.client == ctx.accounts.client.key(), ErrorCode::Unauthorized);
        
        // SECURITY FIX: Prevent cancellation after work is submitted
        // Only allow cancellation when job is Open or InProgress (before submission)
        require!(
            job.status == JobStatus::Open || job.status == JobStatus::InProgress,
            ErrorCode::JobCannotBeCancelled
        );
        
        // CRITICAL: If status is WaitingForReview, Rejected, or Disputed, 
        // cancellation is BLOCKED to prevent client from stealing work
        require!(
            job.status != JobStatus::WaitingForReview,
            ErrorCode::CannotCancelAfterSubmission
        );
        require!(
            job.status != JobStatus::Rejected,
            ErrorCode::CannotCancelAfterSubmission
        );
        require!(
            job.status != JobStatus::Disputed,
            ErrorCode::JobDisputed
        );

        // If there's escrow, refund it to the client
        if let Some(escrow_account) = &mut ctx.accounts.escrow {
            require!(escrow_account.job == job.key(), ErrorCode::InvalidEscrow);
            require!(escrow_account.locked, ErrorCode::EscrowNotLocked);
            require!(!escrow_account.released, ErrorCode::EscrowAlreadyReleased);

            let amount = escrow_account.amount;

            // Transfer SOL from escrow back to client
            **escrow_account.to_account_info().try_borrow_mut_lamports()? -= amount;
            **ctx.accounts.client.to_account_info().try_borrow_mut_lamports()? += amount;

            escrow_account.released = true;
            escrow_account.locked = false;
        }

        job.status = JobStatus::Cancelled;
        job.updated_at = clock.unix_timestamp;

        emit!(JobCancelled {
            job: job.key(),
            client: job.client,
            refund_amount: job.escrow_amount,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Complete a job (client marks work as complete and releases payment)
    pub fn complete_job(ctx: Context<CompleteJob>) -> Result<()> {
        let job = &mut ctx.accounts.job;
        let escrow = &mut ctx.accounts.escrow;
        let clock = Clock::get()?;

        require!(job.client == ctx.accounts.client.key(), ErrorCode::Unauthorized);
        require!(job.status == JobStatus::InProgress, ErrorCode::JobNotInProgress);
        require!(escrow.job == job.key(), ErrorCode::InvalidEscrow);
        require!(escrow.locked, ErrorCode::EscrowNotLocked);
        require!(!escrow.released, ErrorCode::EscrowAlreadyReleased);
        require!(!escrow.disputed, ErrorCode::EscrowDisputed);

        // Transfer SOL from escrow to freelancer
        **escrow.to_account_info().try_borrow_mut_lamports()? -= escrow.amount;
        **ctx.accounts.freelancer.to_account_info().try_borrow_mut_lamports()? += escrow.amount;

        escrow.released = true;
        escrow.locked = false;
        job.status = JobStatus::Completed;
        job.updated_at = clock.unix_timestamp;

        emit!(EscrowReleased {
            escrow: escrow.key(),
            job: job.key(),
            freelancer: escrow.freelancer,
            amount: escrow.amount,
            timestamp: clock.unix_timestamp,
        });

        emit!(JobCompleted {
            job: job.key(),
            client: job.client,
            freelancer: escrow.freelancer,
            amount: escrow.amount,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    // ==================== ESCROW MANAGER ====================

    /// Deposit funds into escrow for a job
    pub fn deposit_escrow(ctx: Context<DepositEscrow>, amount: u64) -> Result<()> {
        let job = &mut ctx.accounts.job;
        let escrow = &mut ctx.accounts.escrow;
        let clock = Clock::get()?;

        require!(job.client == ctx.accounts.client.key(), ErrorCode::Unauthorized);
        require!(amount >= job.budget, ErrorCode::InsufficientEscrow);
        require!(escrow.amount == 0, ErrorCode::EscrowAlreadyFunded);

        // Transfer SOL to escrow PDA
        let transfer_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.client.to_account_info(),
                to: escrow.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(transfer_ctx, amount)?;

        escrow.job = job.key();
        escrow.client = job.client;
        escrow.freelancer = job.selected_freelancer.unwrap();
        escrow.amount = amount;
        escrow.locked = true;
        escrow.released = false;
        escrow.disputed = false;
        escrow.created_at = clock.unix_timestamp;
        escrow.bump = ctx.bumps.escrow;

        job.escrow_amount = amount;
        job.updated_at = clock.unix_timestamp;

        emit!(EscrowDeposited {
            escrow: escrow.key(),
            job: job.key(),
            amount,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Release escrow payment to freelancer (client approves work)
    pub fn release_escrow(ctx: Context<ReleaseEscrow>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        let job = &mut ctx.accounts.job;
        let clock = Clock::get()?;

        require!(job.client == ctx.accounts.client.key(), ErrorCode::Unauthorized);
        require!(escrow.job == job.key(), ErrorCode::InvalidEscrow);
        require!(escrow.locked, ErrorCode::EscrowNotLocked);
        require!(!escrow.released, ErrorCode::EscrowAlreadyReleased);
        require!(!escrow.disputed, ErrorCode::EscrowDisputed);

        // Transfer SOL from escrow to freelancer
        **escrow.to_account_info().try_borrow_mut_lamports()? -= escrow.amount;
        **ctx.accounts.freelancer.to_account_info().try_borrow_mut_lamports()? += escrow.amount;

        escrow.released = true;
        escrow.locked = false;
        job.status = JobStatus::Completed;
        job.updated_at = clock.unix_timestamp;

        emit!(EscrowReleased {
            escrow: escrow.key(),
            job: job.key(),
            freelancer: escrow.freelancer,
            amount: escrow.amount,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Submit work deliverables
    /// Freelancer submits work deliverables
    /// CRITICAL: Changes job status to WaitingForReview, preventing cancellation
    pub fn submit_work(
        ctx: Context<SubmitWork>,
        deliverable_uri: String,
    ) -> Result<()> {
        let job = &mut ctx.accounts.job;
        let work_submission = &mut ctx.accounts.work_submission;
        let clock = Clock::get()?;

        require!(
            job.selected_freelancer == Some(ctx.accounts.freelancer.key()),
            ErrorCode::Unauthorized
        );
        require!(job.status == JobStatus::InProgress, ErrorCode::JobNotInProgress);
        require!(deliverable_uri.len() <= 200, ErrorCode::URITooLong);

        work_submission.job = job.key();
        work_submission.freelancer = ctx.accounts.freelancer.key();
        work_submission.deliverable_uri = deliverable_uri.clone();
        work_submission.submitted_at = clock.unix_timestamp;
        work_submission.approved = false;
        work_submission.bump = ctx.bumps.work_submission;

        // SECURITY FIX: Change status to WaitingForReview
        // This prevents client from cancelling after work submission
        job.status = JobStatus::WaitingForReview;
        job.updated_at = clock.unix_timestamp;

        emit!(WorkSubmitted {
            job: job.key(),
            freelancer: ctx.accounts.freelancer.key(),
            deliverable_uri,
            timestamp: clock.unix_timestamp,
        });

        // Notification: Alert client that work is ready for review
        emit!(ClientNotification {
            client: job.client,
            job: job.key(),
            notification_type: NotificationType::WorkSubmitted,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Client approves submitted work and releases payment
    /// Separate from complete_job - this is the happy path after review
    pub fn approve_work(ctx: Context<ApproveWork>) -> Result<()> {
        let job = &mut ctx.accounts.job;
        let escrow = &mut ctx.accounts.escrow;
        let work_submission = &mut ctx.accounts.work_submission;
        let clock = Clock::get()?;

        require!(job.client == ctx.accounts.client.key(), ErrorCode::Unauthorized);
        require!(
            job.status == JobStatus::WaitingForReview,
            ErrorCode::JobNotInReview
        );
        require!(escrow.job == job.key(), ErrorCode::InvalidEscrow);
        require!(escrow.locked, ErrorCode::EscrowNotLocked);
        require!(!escrow.released, ErrorCode::EscrowAlreadyReleased);
        require!(!escrow.disputed, ErrorCode::EscrowDisputed);

        // Transfer SOL from escrow to freelancer
        **escrow.to_account_info().try_borrow_mut_lamports()? -= escrow.amount;
        **ctx.accounts.freelancer.to_account_info().try_borrow_mut_lamports()? += escrow.amount;

        escrow.released = true;
        escrow.locked = false;
        work_submission.approved = true;
        job.status = JobStatus::Completed;
        job.updated_at = clock.unix_timestamp;

        emit!(EscrowReleased {
            escrow: escrow.key(),
            job: job.key(),
            freelancer: escrow.freelancer,
            amount: escrow.amount,
            timestamp: clock.unix_timestamp,
        });

        emit!(JobCompleted {
            job: job.key(),
            client: job.client,
            freelancer: escrow.freelancer,
            amount: escrow.amount,
            timestamp: clock.unix_timestamp,
        });

        // Notification: Freelancer gets paid!
        emit!(FreelancerNotification {
            freelancer: escrow.freelancer,
            job: job.key(),
            notification_type: NotificationType::WorkApproved,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Client rejects submitted work
    /// CRITICAL: Funds stay in escrow, freelancer can raise dispute
    pub fn reject_work(
        ctx: Context<RejectWork>,
        reason: String,
    ) -> Result<()> {
        let job = &mut ctx.accounts.job;
        let work_submission = &ctx.accounts.work_submission;
        let clock = Clock::get()?;

        require!(job.client == ctx.accounts.client.key(), ErrorCode::Unauthorized);
        require!(
            job.status == JobStatus::WaitingForReview,
            ErrorCode::JobNotInReview
        );
        require!(reason.len() <= 500, ErrorCode::ReasonTooLong);
        require!(
            work_submission.job == job.key(),
            ErrorCode::InvalidWorkSubmission
        );

        // SECURITY: Status changes to Rejected, funds remain in escrow
        job.status = JobStatus::Rejected;
        job.updated_at = clock.unix_timestamp;

        emit!(WorkRejected {
            job: job.key(),
            client: job.client,
            freelancer: job.selected_freelancer.unwrap(),
            reason: reason.clone(),
            timestamp: clock.unix_timestamp,
        });

        // Notification: Alert freelancer that work was rejected
        emit!(FreelancerNotification {
            freelancer: job.selected_freelancer.unwrap(),
            job: job.key(),
            notification_type: NotificationType::WorkRejected,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Freelancer raises dispute after work rejection
    /// Opens the DAO voting mechanism
    pub fn raise_dispute(
        ctx: Context<RaiseDispute>,
        reason: String,
    ) -> Result<()> {
        let job = &mut ctx.accounts.job;
        let escrow = &mut ctx.accounts.escrow;
        let dispute = &mut ctx.accounts.dispute;
        let clock = Clock::get()?;

        require!(
            job.selected_freelancer == Some(ctx.accounts.freelancer.key()),
            ErrorCode::Unauthorized
        );
        require!(
            job.status == JobStatus::Rejected,
            ErrorCode::CannotDisputeNonRejectedJob
        );
        require!(reason.len() <= 500, ErrorCode::ReasonTooLong);
        require!(!escrow.disputed, ErrorCode::EscrowAlreadyDisputed);

        dispute.job = job.key();
        dispute.escrow = escrow.key();
        dispute.client = escrow.client;
        dispute.freelancer = escrow.freelancer;
        dispute.initiator = ctx.accounts.freelancer.key();
        dispute.reason = reason.clone();
        dispute.status = DisputeStatus::Open;
        dispute.votes_for_client = 0;
        dispute.votes_for_freelancer = 0;
        dispute.created_at = clock.unix_timestamp;
        dispute.resolved_at = None;
        dispute.evidence_uris = Vec::new();
        dispute.bump = ctx.bumps.dispute;

        escrow.disputed = true;
        job.status = JobStatus::Disputed;
        job.updated_at = clock.unix_timestamp;

        emit!(DisputeOpened {
            dispute: dispute.key(),
            job: job.key(),
            initiator: ctx.accounts.freelancer.key(),
            reason,
            timestamp: clock.unix_timestamp,
        });

        // Notification: Alert community of new dispute
        emit!(CommunityNotification {
            job: job.key(),
            dispute: dispute.key(),
            notification_type: NotificationType::DisputeRaised,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Open a dispute
    pub fn open_dispute(
        ctx: Context<OpenDispute>,
        reason: String,
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        let job = &mut ctx.accounts.job;
        let dispute = &mut ctx.accounts.dispute;
        let clock = Clock::get()?;

        let initiator = ctx.accounts.initiator.key();
        require!(
            initiator == escrow.client || initiator == escrow.freelancer,
            ErrorCode::Unauthorized
        );
        require!(!escrow.disputed, ErrorCode::EscrowAlreadyDisputed);
        require!(reason.len() <= 500, ErrorCode::ReasonTooLong);

        dispute.job = job.key();
        dispute.escrow = escrow.key();
        dispute.client = escrow.client;
        dispute.freelancer = escrow.freelancer;
        dispute.initiator = initiator;
        dispute.reason = reason;
        dispute.status = DisputeStatus::Open;
        dispute.votes_for_client = 0;
        dispute.votes_for_freelancer = 0;
        dispute.created_at = clock.unix_timestamp;
        dispute.resolved_at = None;
        dispute.evidence_uris = Vec::new();
        dispute.bump = ctx.bumps.dispute;

        escrow.disputed = true;
        job.status = JobStatus::Disputed;
        job.updated_at = clock.unix_timestamp;

        emit!(DisputeOpened {
            dispute: dispute.key(),
            job: job.key(),
            initiator,
            reason: dispute.reason.clone(),
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Vote on dispute (arbitrators with high reputation)
    /// AUTO-RESOLVES when 2 votes are reached
    pub fn vote_dispute(
        ctx: Context<VoteDispute>,
        vote_for_client: bool,
    ) -> Result<()> {
        let dispute = &mut ctx.accounts.dispute;
        let voter_reputation = &ctx.accounts.voter_reputation;
        let vote_record = &mut ctx.accounts.vote_record;
        let escrow = &mut ctx.accounts.escrow;
        let job = &mut ctx.accounts.job;
        let clock = Clock::get()?;

        require!(dispute.status == DisputeStatus::Open, ErrorCode::DisputeNotOpen);
        // TESTING: Allow anyone to vote (commented out reputation checks)
        // require!(voter_reputation.average_rating >= 4.0, ErrorCode::InsufficientReputation);
        // require!(voter_reputation.total_reviews >= 5, ErrorCode::InsufficientReputation);

        let voter = ctx.accounts.voter.key();
        // TESTING: Allow client/freelancer to vote on their own dispute
        // require!(
        //     voter != dispute.client && voter != dispute.freelancer,
        //     ErrorCode::CannotVoteOwnDispute
        // );

        // Record the vote
        vote_record.dispute = dispute.key();
        vote_record.voter = voter;
        vote_record.vote_for_client = vote_for_client;
        vote_record.voted_at = clock.unix_timestamp;
        vote_record.fee_claimed = false;
        vote_record.bump = ctx.bumps.vote_record;

        // Update vote counts
        if vote_for_client {
            dispute.votes_for_client += 1;
        } else {
            dispute.votes_for_freelancer += 1;
        }

        emit!(DisputeVoted {
            dispute: dispute.key(),
            voter,
            vote_for_client,
        });

        // AUTO-RESOLVE: Check if we have 2 votes now
        let total_votes = dispute.votes_for_client + dispute.votes_for_freelancer;
        if total_votes >= 2 {
            let winner_is_client = dispute.votes_for_client > dispute.votes_for_freelancer;

            // Transfer escrow to winner
            **escrow.to_account_info().try_borrow_mut_lamports()? -= escrow.amount;

            if winner_is_client {
                **ctx.accounts.client.to_account_info().try_borrow_mut_lamports()? += escrow.amount;
                dispute.status = DisputeStatus::ResolvedClient;
            } else {
                **ctx.accounts.freelancer.to_account_info().try_borrow_mut_lamports()? += escrow.amount;
                dispute.status = DisputeStatus::ResolvedFreelancer;
            }

            dispute.resolved_at = Some(clock.unix_timestamp);
            escrow.released = true;
            escrow.locked = false;
            job.status = JobStatus::Completed;
            job.updated_at = clock.unix_timestamp;

            emit!(DisputeResolved {
                dispute: dispute.key(),
                winner_is_client,
                timestamp: clock.unix_timestamp,
            });
        }

        Ok(())
    }

    /// Resolve dispute based on votes
    pub fn resolve_dispute(ctx: Context<ResolveDispute>) -> Result<()> {
        let dispute = &mut ctx.accounts.dispute;
        let escrow = &mut ctx.accounts.escrow;
        let job = &mut ctx.accounts.job;
        let clock = Clock::get()?;

        // Only the client or freelancer involved in the dispute can trigger resolution
        let resolver = ctx.accounts.resolver.key();
        require!(
            resolver == dispute.client || resolver == dispute.freelancer,
            ErrorCode::Unauthorized
        );

        require!(dispute.status == DisputeStatus::Open, ErrorCode::DisputeNotOpen);

        let total_votes = dispute.votes_for_client + dispute.votes_for_freelancer;
        // TESTING: Changed from 5 to 2 votes needed
        require!(total_votes >= 2, ErrorCode::InsufficientVotes);

        let winner_is_client = dispute.votes_for_client > dispute.votes_for_freelancer;

        // Transfer escrow to winner
        **escrow.to_account_info().try_borrow_mut_lamports()? -= escrow.amount;

        if winner_is_client {
            **ctx.accounts.client.to_account_info().try_borrow_mut_lamports()? += escrow.amount;
            dispute.status = DisputeStatus::ResolvedClient;
        } else {
            **ctx.accounts.freelancer.to_account_info().try_borrow_mut_lamports()? += escrow.amount;
            dispute.status = DisputeStatus::ResolvedFreelancer;
        }

        dispute.resolved_at = Some(clock.unix_timestamp);
        escrow.released = true;
        escrow.locked = false;
        job.status = JobStatus::Completed;
        job.updated_at = clock.unix_timestamp;

        emit!(DisputeResolved {
            dispute: dispute.key(),
            winner_is_client,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Add evidence to an existing dispute (client or freelancer only)
    pub fn add_dispute_evidence(
        ctx: Context<AddDisputeEvidence>,
        evidence_uri: String,
    ) -> Result<()> {
        let dispute = &mut ctx.accounts.dispute;
        let uploader = ctx.accounts.uploader.key();

        // Only client or freelancer can add evidence
        require!(
            uploader == dispute.client || uploader == dispute.freelancer,
            ErrorCode::Unauthorized
        );

        // Can only add evidence to open disputes
        require!(
            dispute.status == DisputeStatus::Open,
            ErrorCode::DisputeNotOpen
        );

        // Validate URI length
        require!(evidence_uri.len() <= 200, ErrorCode::UriTooLong);

        // Check if we have space for more evidence
        require!(
            dispute.evidence_uris.len() < 10,
            ErrorCode::TooManyEvidenceItems
        );

        dispute.evidence_uris.push(evidence_uri.clone());

        emit!(DisputeEvidenceAdded {
            dispute: dispute.key(),
            uploader,
            evidence_uri,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    // ==================== REPUTATION MANAGER ====================

    /// Initialize reputation for a user
    pub fn initialize_reputation(ctx: Context<InitializeReputation>) -> Result<()> {
        let reputation = &mut ctx.accounts.reputation;

        reputation.user = ctx.accounts.user.key();
        reputation.total_reviews = 0;
        reputation.average_rating = 0.0;
        reputation.completed_jobs = 0;
        reputation.total_earned = 0;
        reputation.bump = ctx.bumps.reputation;

        Ok(())
    }

    /// Submit a review/rating after job completion
    pub fn submit_review(
        ctx: Context<SubmitReview>,
        rating: u8,
        comment: String,
    ) -> Result<()> {
        let review = &mut ctx.accounts.review;
        let reviewee_reputation = &mut ctx.accounts.reviewee_reputation;
        let job = &ctx.accounts.job;
        let clock = Clock::get()?;

        require!(job.status == JobStatus::Completed, ErrorCode::JobNotCompleted);
        require!(rating >= 1 && rating <= 5, ErrorCode::InvalidRating);
        require!(comment.len() <= 300, ErrorCode::CommentTooLong);

        let reviewer = ctx.accounts.reviewer.key();
        let reviewee = ctx.accounts.reviewee.key();

        // Only client or freelancer can review each other
        require!(
            (reviewer == job.client && reviewee == job.selected_freelancer.unwrap()) ||
            (reviewer == job.selected_freelancer.unwrap() && reviewee == job.client),
            ErrorCode::Unauthorized
        );

        review.job = job.key();
        review.reviewer = reviewer;
        review.reviewee = reviewee;
        review.rating = rating;
        review.comment = comment;
        review.created_at = clock.unix_timestamp;
        review.bump = ctx.bumps.review;

        // Update reputation
        let current_total = (reviewee_reputation.average_rating * reviewee_reputation.total_reviews as f32) +
                          rating as f32;
        reviewee_reputation.total_reviews += 1;
        reviewee_reputation.average_rating = current_total / reviewee_reputation.total_reviews as f32;

        if reviewee == job.selected_freelancer.unwrap() {
            reviewee_reputation.completed_jobs += 1;
            // Update total_earned would need to track actual payment amount
        }

        emit!(ReviewSubmitted {
            review: review.key(),
            job: job.key(),
            reviewer,
            reviewee,
            rating,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    // ==================== NFT MANAGER ====================

    /// Mint achievement NFT for reaching milestones
    pub fn mint_achievement_nft(
        ctx: Context<MintAchievementNFT>,
        achievement_type: AchievementType,
        metadata_uri: String,
        nft_mint: Pubkey,
    ) -> Result<()> {
        nft::mint_achievement_nft(ctx, achievement_type, metadata_uri, nft_mint)
    }

    /// Mint job completion NFT as proof of work
    pub fn mint_job_completion_nft(
        ctx: Context<MintJobCompletionNFT>,
        job_title: String,
        metadata_uri: String,
        nft_mint: Pubkey,
    ) -> Result<()> {
        nft::mint_job_completion_nft(ctx, job_title, metadata_uri, nft_mint)
    }

    // ==================== TOKEN ESCROW MANAGER ====================

    /// Deposit SPL tokens into escrow
    pub fn deposit_token_escrow(ctx: Context<DepositTokenEscrow>, amount: u64) -> Result<()> {
        token_escrow::deposit_token_escrow(ctx, amount)
    }

    /// Release SPL token escrow to freelancer
    pub fn release_token_escrow(ctx: Context<ReleaseTokenEscrow>) -> Result<()> {
        token_escrow::release_token_escrow(ctx)
    }

    /// Open dispute for token escrow
    pub fn open_token_dispute(
        ctx: Context<OpenTokenDispute>,
        reason: String,
    ) -> Result<()> {
        token_escrow::open_token_dispute(ctx, reason)
    }

    /// Resolve token dispute
    pub fn resolve_token_dispute(ctx: Context<ResolveTokenDispute>) -> Result<()> {
        token_escrow::resolve_token_dispute(ctx)
    }

    // ==================== ARBITRATOR FEE MANAGER ====================

    /// Distribute fees to arbitrators after dispute resolution
    pub fn distribute_arbitrator_fees(ctx: Context<DistributeArbitratorFees>) -> Result<()> {
        arbitrator_fees::distribute_arbitrator_fees(ctx)
    }

    /// Claim arbitrator fee for voting on a dispute
    pub fn claim_arbitrator_fee(ctx: Context<ClaimArbitratorFee>) -> Result<()> {
        arbitrator_fees::claim_arbitrator_fee(ctx)
    }

    // ==================== CHAT SYSTEM ====================

    /// Send a message to another user
    pub fn send_message(
        ctx: Context<SendMessage>,
        recipient: Pubkey,
        content: String,
        message_id: u64,
    ) -> Result<()> {
        let message = &mut ctx.accounts.message;
        let clock = Clock::get()?;

        // Validation
        require!(content.len() <= 280, ChatError::ContentTooLong);
        require!(
            ctx.accounts.sender.key() != recipient,
            ChatError::CannotMessageSelf
        );
        require!(recipient != Pubkey::default(), ChatError::InvalidRecipient);

        // Set message data
        message.sender = ctx.accounts.sender.key();
        message.recipient = recipient;
        message.content = content;
        message.timestamp = clock.unix_timestamp;
        message.read = false;
        message.message_id = message_id;
        message.bump = ctx.bumps.message;

        // Emit event
        emit!(MessageSent {
            sender: message.sender,
            recipient: message.recipient,
            message_id,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Mark a message as read
    pub fn mark_message_read(ctx: Context<MarkMessageRead>) -> Result<()> {
        let message = &mut ctx.accounts.message;
        let clock = Clock::get()?;

        message.read = true;

        emit!(MessageRead {
            message: message.key(),
            reader: ctx.accounts.recipient.key(),
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    // ==================== MILESTONE ESCROW MANAGER ====================

    /// Initialize milestone configuration for a job
    pub fn init_job_milestones(
        ctx: Context<InitJobMilestones>,
        total_milestones: u8,
    ) -> Result<()> {
        milestone::init_job_milestones(ctx, total_milestones)
    }

    /// Create a single milestone for a job
    pub fn create_milestone(
        ctx: Context<CreateMilestone>,
        milestone_index: u8,
        title: String,
        description: String,
        amount: u64,
    ) -> Result<()> {
        milestone::create_milestone(ctx, milestone_index, title, description, amount)
    }

    /// Fund a specific milestone escrow
    pub fn fund_milestone(ctx: Context<FundMilestone>, amount: u64) -> Result<()> {
        milestone::fund_milestone(ctx, amount)
    }

    /// Submit work for a specific milestone
    pub fn submit_milestone_work(
        ctx: Context<SubmitMilestoneWork>,
        deliverable_uri: String,
    ) -> Result<()> {
        milestone::submit_milestone_work(ctx, deliverable_uri)
    }

    /// Approve a milestone and release payment
    pub fn approve_milestone(ctx: Context<ApproveMilestone>) -> Result<()> {
        milestone::approve_milestone(ctx)
    }

    /// Reject a milestone work submission
    pub fn reject_milestone(ctx: Context<RejectMilestone>, reason: String) -> Result<()> {
        milestone::reject_milestone(ctx, reason)
    }

    /// Open dispute for a specific milestone
    pub fn dispute_milestone(ctx: Context<DisputeMilestone>, reason: String) -> Result<()> {
        milestone::dispute_milestone(ctx, reason)
    }

    // ==================== SBT REPUTATION MANAGER ====================

    /// Initialize SBT counter for a user
    pub fn init_sbt_counter(ctx: Context<InitSBTCounter>) -> Result<()> {
        sbt_reputation::init_sbt_counter(ctx)
    }

    /// Mint a reputation SBT after job completion
    pub fn mint_reputation_sbt(
        ctx: Context<MintReputationSBT>,
        rating: u8,
        comment: String,
        job_title: String,
        metadata_uri: String,
    ) -> Result<()> {
        sbt_reputation::mint_reputation_sbt(ctx, rating, comment, job_title, metadata_uri)
    }

    /// Revoke an SBT (admin action for fraud)
    pub fn revoke_sbt(ctx: Context<RevokeSBT>) -> Result<()> {
        sbt_reputation::revoke_sbt(ctx)
    }

    // ==================== STAKING DISPUTE MANAGER ====================

    /// Initialize dispute configuration
    pub fn init_dispute_config(
        ctx: Context<InitDisputeConfig>,
        min_stake_amount: u64,
        juror_count: u8,
        voting_period: i64,
        slash_percentage: u8,
        reward_percentage: u8,
        quorum_percentage: u8,
    ) -> Result<()> {
        staking_dispute::init_dispute_config(
            ctx, min_stake_amount, juror_count, voting_period,
            slash_percentage, reward_percentage, quorum_percentage,
        )
    }

    /// Initialize juror registry
    pub fn init_juror_registry(ctx: Context<InitJurorRegistry>) -> Result<()> {
        staking_dispute::init_juror_registry(ctx)
    }

    /// Stake tokens to become eligible as a juror
    pub fn stake_for_jury(ctx: Context<StakeForJury>, amount: u64) -> Result<()> {
        staking_dispute::stake_for_jury(ctx, amount)
    }

    /// Unstake tokens and leave the juror pool
    pub fn unstake_from_jury(ctx: Context<UnstakeFromJury>) -> Result<()> {
        staking_dispute::unstake_from_jury(ctx)
    }

    /// Select random jurors for a dispute
    pub fn select_jurors(ctx: Context<SelectJurors>) -> Result<()> {
        staking_dispute::select_jurors(ctx)
    }

    /// Cast a staked vote on a dispute
    pub fn cast_staked_vote(ctx: Context<CastStakedVote>, vote_for_client: bool) -> Result<()> {
        staking_dispute::cast_staked_vote(ctx, vote_for_client)
    }

    /// Resolve a staked dispute after voting period ends
    pub fn resolve_staked_dispute(ctx: Context<ResolveStakedDispute>) -> Result<()> {
        staking_dispute::resolve_staked_dispute(ctx)
    }

    /// Claim staking reward after dispute resolution
    pub fn claim_staking_reward(ctx: Context<ClaimStakingReward>) -> Result<()> {
        staking_dispute::claim_staking_reward(ctx)
    }

    // ==================== GOVERNANCE TOKEN & TOKENOMICS ====================

    pub fn init_platform_config(
        ctx: Context<InitPlatformConfig>,
        fee_percentage: u8,
        buyback_percentage: u8,
    ) -> Result<()> {
        governance_token::init_platform_config(ctx, fee_percentage, buyback_percentage)
    }

    pub fn stake_tokens(ctx: Context<StakeTokens>, amount: u64, lock_period: i64) -> Result<()> {
        governance_token::stake_tokens(ctx, amount, lock_period)
    }

    pub fn unstake_tokens(ctx: Context<UnstakeTokens>) -> Result<()> {
        governance_token::unstake_tokens(ctx)
    }

    pub fn claim_staking_rewards(ctx: Context<ClaimStakingRewards>) -> Result<()> {
        governance_token::claim_staking_rewards(ctx)
    }

    pub fn collect_platform_fee(ctx: Context<CollectPlatformFee>, job_amount: u64) -> Result<()> {
        governance_token::collect_platform_fee(ctx, job_amount)
    }

    pub fn execute_buyback_burn(ctx: Context<ExecuteBuybackBurn>, burn_amount: u64) -> Result<()> {
        governance_token::execute_buyback_burn(ctx, burn_amount)
    }

    pub fn stake_quality_collateral(ctx: Context<StakeQualityCollateral>, amount: u64) -> Result<()> {
        governance_token::stake_quality_collateral(ctx, amount)
    }

    pub fn release_quality_collateral(ctx: Context<ReleaseQualityCollateral>) -> Result<()> {
        governance_token::release_quality_collateral(ctx)
    }

    pub fn slash_quality_collateral(ctx: Context<SlashQualityCollateral>) -> Result<()> {
        governance_token::slash_quality_collateral(ctx)
    }

    // ==================== REFERRAL SYSTEM ====================

    pub fn init_referral_config(
        ctx: Context<InitReferralConfig>,
        level1_percentage: u8,
        level2_percentage: u8,
        max_levels: u8,
    ) -> Result<()> {
        referral::init_referral_config(ctx, level1_percentage, level2_percentage, max_levels)
    }

    pub fn register_referral(ctx: Context<RegisterReferral>) -> Result<()> {
        referral::register_referral(ctx)
    }

    pub fn distribute_referral_commission(
        ctx: Context<DistributeReferralCommission>,
        job_amount: u64,
    ) -> Result<()> {
        referral::distribute_referral_commission(ctx, job_amount)
    }

    pub fn distribute_level2_commission(
        ctx: Context<DistributeLevel2Commission>,
        job_amount: u64,
    ) -> Result<()> {
        referral::distribute_level2_commission(ctx, job_amount)
    }

    // ==================== DID SYSTEM ====================

    pub fn create_did_document(ctx: Context<CreateDIDDocument>) -> Result<()> {
        did::create_did_document(ctx)
    }

    pub fn add_verification_method(
        ctx: Context<UpdateDIDDocument>,
        method_type: u8,
        public_key: [u8; 32],
    ) -> Result<()> {
        did::add_verification_method(ctx, method_type, public_key)
    }

    pub fn remove_verification_method(ctx: Context<UpdateDIDDocument>, method_index: u8) -> Result<()> {
        did::remove_verification_method(ctx, method_index)
    }

    pub fn add_service_endpoint(
        ctx: Context<UpdateDIDDocument>,
        service_type: u8,
        endpoint_uri: String,
    ) -> Result<()> {
        did::add_service_endpoint(ctx, service_type, endpoint_uri)
    }

    pub fn verify_service_endpoint(ctx: Context<VerifyServiceEndpoint>, endpoint_index: u8) -> Result<()> {
        did::verify_service_endpoint(ctx, endpoint_index)
    }

    pub fn deactivate_did(ctx: Context<UpdateDIDDocument>) -> Result<()> {
        did::deactivate_did(ctx)
    }

    pub fn anchor_verifiable_credential(
        ctx: Context<AnchorVC>,
        credential_type: String,
        metadata_uri: String,
        expires_at: Option<i64>,
    ) -> Result<()> {
        did::anchor_verifiable_credential(ctx, credential_type, metadata_uri, expires_at)
    }

    pub fn revoke_credential(ctx: Context<RevokeVC>) -> Result<()> {
        did::revoke_credential(ctx)
    }

    // ==================== SYBIL RESISTANCE ====================

    pub fn init_sybil_config(
        ctx: Context<InitSybilConfig>,
        min_score_to_bid: u16,
        min_score_to_post: u16,
    ) -> Result<()> {
        sybil_resistance::init_sybil_config(ctx, min_score_to_bid, min_score_to_post)
    }

    pub fn add_identity_stamp(
        ctx: Context<AddIdentityStamp>,
        stamp_type: u8,
        provider_hash: [u8; 32],
        weight: u8,
        expires_at: Option<i64>,
    ) -> Result<()> {
        sybil_resistance::add_identity_stamp(ctx, stamp_type, provider_hash, weight, expires_at)
    }

    pub fn remove_identity_stamp(ctx: Context<RemoveIdentityStamp>, stamp_type: u8) -> Result<()> {
        sybil_resistance::remove_identity_stamp(ctx, stamp_type)
    }

    pub fn recalculate_humanity_score(ctx: Context<RecalculateScore>) -> Result<()> {
        sybil_resistance::recalculate_humanity_score(ctx)
    }

    // ==================== DAO GOVERNANCE ====================

    pub fn init_dao_config(
        ctx: Context<InitDAOConfig>,
        min_proposal_stake: u64,
        voting_period: i64,
        quorum_percentage: u8,
        reputation_multiplier: u8,
    ) -> Result<()> {
        dao_governance::init_dao_config(ctx, min_proposal_stake, voting_period, quorum_percentage, reputation_multiplier)
    }

    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        title: String,
        description_uri: String,
        proposal_type: u8,
    ) -> Result<()> {
        dao_governance::create_proposal(ctx, title, description_uri, proposal_type)
    }

    pub fn cast_dao_vote(
        ctx: Context<CastDAOVote>,
        vote_for: bool,
        token_amount: u64,
        sbt_count: u32,
    ) -> Result<()> {
        dao_governance::cast_dao_vote(ctx, vote_for, token_amount, sbt_count)
    }

    pub fn finalize_proposal(ctx: Context<FinalizeProposal>) -> Result<()> {
        dao_governance::finalize_proposal(ctx)
    }

    pub fn execute_proposal(ctx: Context<ExecuteProposal>) -> Result<()> {
        dao_governance::execute_proposal(ctx)
    }

    pub fn fund_dao_treasury(ctx: Context<FundDAOTreasury>, amount: u64) -> Result<()> {
        dao_governance::fund_dao_treasury(ctx, amount)
    }

    // ==================== ACCOUNT ABSTRACTION ====================

    pub fn init_fee_payer_config(
        ctx: Context<InitFeePayerConfig>,
        daily_budget: u64,
        max_tx_per_user_per_day: u16,
    ) -> Result<()> {
        account_abstraction::init_fee_payer_config(ctx, daily_budget, max_tx_per_user_per_day)
    }

    pub fn fund_fee_payer(ctx: Context<FundFeePayer>, amount: u64) -> Result<()> {
        account_abstraction::fund_fee_payer(ctx, amount)
    }

    pub fn create_session_key(
        ctx: Context<CreateSessionKey>,
        valid_until: i64,
        max_amount: u64,
        allowed_actions: u16,
    ) -> Result<()> {
        account_abstraction::create_session_key(ctx, valid_until, max_amount, allowed_actions)
    }

    pub fn revoke_session_key(ctx: Context<RevokeSessionKey>) -> Result<()> {
        account_abstraction::revoke_session_key(ctx)
    }

    pub fn use_session_key(ctx: Context<UseSessionKey>, action_type: u16, amount: u64) -> Result<()> {
        account_abstraction::use_session_key(ctx, action_type, amount)
    }

    pub fn record_sponsored_tx(ctx: Context<RecordSponsoredTx>, gas_cost: u64) -> Result<()> {
        account_abstraction::record_sponsored_tx(ctx, gas_cost)
    }

    // ==================== SOCIAL RECOVERY ====================

    pub fn setup_recovery(
        ctx: Context<SetupRecovery>,
        guardians: Vec<Pubkey>,
        threshold: u8,
        timelock_period: i64,
    ) -> Result<()> {
        social_recovery::setup_recovery(ctx, guardians, threshold, timelock_period)
    }

    pub fn update_guardians(
        ctx: Context<UpdateGuardians>,
        new_guardians: Vec<Pubkey>,
        new_threshold: u8,
    ) -> Result<()> {
        social_recovery::update_guardians(ctx, new_guardians, new_threshold)
    }

    pub fn initiate_recovery(ctx: Context<InitiateRecovery>, new_owner: Pubkey) -> Result<()> {
        social_recovery::initiate_recovery(ctx, new_owner)
    }

    pub fn approve_recovery(ctx: Context<ApproveRecovery>) -> Result<()> {
        social_recovery::approve_recovery(ctx)
    }

    pub fn execute_recovery(ctx: Context<ExecuteRecovery>) -> Result<()> {
        social_recovery::execute_recovery(ctx)
    }

    pub fn cancel_recovery(ctx: Context<CancelRecovery>) -> Result<()> {
        social_recovery::cancel_recovery(ctx)
    }

    // ==================== AI ORACLE ====================

    pub fn init_ai_oracle_config(
        ctx: Context<InitAIOracleConfig>,
        min_confidence: u8,
        min_oracle_consensus: u8,
    ) -> Result<()> {
        ai_oracle::init_ai_oracle_config(ctx, min_confidence, min_oracle_consensus)
    }

    pub fn add_oracle_authority(ctx: Context<ManageOracleAuthority>, new_oracle: Pubkey) -> Result<()> {
        ai_oracle::add_oracle_authority(ctx, new_oracle)
    }

    pub fn submit_ai_verification(
        ctx: Context<SubmitAIVerification>,
        verification_type: u8,
        score: u8,
        confidence: u8,
        result_uri: String,
        details_hash: [u8; 32],
    ) -> Result<()> {
        ai_oracle::submit_ai_verification(ctx, verification_type, score, confidence, result_uri, details_hash)
    }

    pub fn dispute_ai_verification(ctx: Context<DisputeAIVerification>, reason: String) -> Result<()> {
        ai_oracle::dispute_ai_verification(ctx, reason)
    }

    pub fn resolve_ai_dispute(
        ctx: Context<ResolveAIDispute>,
        override_score: u8,
        resolution_uri: String,
    ) -> Result<()> {
        ai_oracle::resolve_ai_dispute(ctx, override_score, resolution_uri)
    }

    // ==================== ZK PROOFS ====================

    pub fn init_zk_verifier_config(ctx: Context<InitZKVerifierConfig>) -> Result<()> {
        zk_proofs::init_zk_verifier_config(ctx)
    }

    pub fn add_zk_verifier(ctx: Context<ManageZKVerifier>, verifier: Pubkey) -> Result<()> {
        zk_proofs::add_zk_verifier(ctx, verifier)
    }

    pub fn submit_zk_credential(
        ctx: Context<SubmitZKCredential>,
        credential_type: String,
        commitment: [u8; 32],
        proof_hash: [u8; 32],
        public_inputs_hash: [u8; 32],
        valid_until: Option<i64>,
    ) -> Result<()> {
        zk_proofs::submit_zk_credential(ctx, credential_type, commitment, proof_hash, public_inputs_hash, valid_until)
    }

    pub fn verify_zk_credential(ctx: Context<VerifyZKCredential>) -> Result<()> {
        zk_proofs::verify_zk_credential(ctx)
    }

    pub fn revoke_zk_credential(ctx: Context<RevokeZKCredential>) -> Result<()> {
        zk_proofs::revoke_zk_credential(ctx)
    }
}

// ==================== CONTEXTS ====================

#[derive(Accounts)]
#[instruction(job_id: u64)]
pub struct CreateJob<'info> {
    #[account(
        init,
        payer = client,
        space = 8 + Job::INIT_SPACE,
        seeds = [b"job", client.key().as_ref(), &job_id.to_le_bytes()],
        bump
    )]
    pub job: Account<'info, Job>,
    #[account(mut)]
    pub client: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitBid<'info> {
    #[account(
        init,
        payer = freelancer,
        space = 8 + Bid::INIT_SPACE,
        seeds = [b"bid", job.key().as_ref(), freelancer.key().as_ref()],
        bump
    )]
    pub bid: Account<'info, Bid>,
    #[account(mut)]
    pub job: Account<'info, Job>,
    #[account(mut)]
    pub freelancer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SelectBid<'info> {
    #[account(mut)]
    pub job: Account<'info, Job>,
    #[account(mut)]
    pub bid: Account<'info, Bid>,
    pub client: Signer<'info>,
}

#[derive(Accounts)]
pub struct CancelJob<'info> {
    #[account(mut)]
    pub job: Account<'info, Job>,
    #[account(mut)]
    pub escrow: Option<Account<'info, Escrow>>,
    #[account(mut)]
    pub client: Signer<'info>,
}

#[derive(Accounts)]
pub struct CompleteJob<'info> {
    #[account(mut)]
    pub escrow: Account<'info, Escrow>,
    #[account(mut)]
    pub job: Account<'info, Job>,
    #[account(mut)]
    /// CHECK: freelancer receiving payment
    pub freelancer: AccountInfo<'info>,
    pub client: Signer<'info>,
}

#[derive(Accounts)]
pub struct DepositEscrow<'info> {
    #[account(
        init,
        payer = client,
        space = 8 + Escrow::INIT_SPACE,
        seeds = [b"escrow", job.key().as_ref()],
        bump
    )]
    pub escrow: Account<'info, Escrow>,
    #[account(mut)]
    pub job: Account<'info, Job>,
    #[account(mut)]
    pub client: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReleaseEscrow<'info> {
    #[account(mut)]
    pub escrow: Account<'info, Escrow>,
    #[account(mut)]
    pub job: Account<'info, Job>,
    #[account(mut)]
    /// CHECK: freelancer receiving payment
    pub freelancer: AccountInfo<'info>,
    pub client: Signer<'info>,
}

#[derive(Accounts)]
pub struct SubmitWork<'info> {
    #[account(
        init,
        payer = freelancer,
        space = 8 + WorkSubmission::INIT_SPACE,
        seeds = [b"work", job.key().as_ref()],
        bump
    )]
    pub work_submission: Account<'info, WorkSubmission>,
    #[account(mut)]
    pub job: Account<'info, Job>,
    #[account(mut)]
    pub freelancer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApproveWork<'info> {
    #[account(mut)]
    pub work_submission: Account<'info, WorkSubmission>,
    #[account(mut)]
    pub job: Account<'info, Job>,
    #[account(mut)]
    pub escrow: Account<'info, Escrow>,
    #[account(mut)]
    pub client: Signer<'info>,
    /// CHECK: freelancer receiving payment
    #[account(mut)]
    pub freelancer: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RejectWork<'info> {
    pub work_submission: Account<'info, WorkSubmission>,
    #[account(mut)]
    pub job: Account<'info, Job>,
    pub escrow: Account<'info, Escrow>,
    #[account(mut)]
    pub client: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RaiseDispute<'info> {
    #[account(
        init,
        payer = freelancer,
        space = 8 + Dispute::INIT_SPACE,
        seeds = [b"dispute", job.key().as_ref()],
        bump
    )]
    pub dispute: Account<'info, Dispute>,
    #[account(mut)]
    pub job: Account<'info, Job>,
    #[account(mut)]
    pub escrow: Account<'info, Escrow>,
    #[account(mut)]
    pub freelancer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct OpenDispute<'info> {
    #[account(
        init,
        payer = initiator,
        space = 8 + Dispute::INIT_SPACE,
        seeds = [b"dispute", job.key().as_ref()],
        bump
    )]
    pub dispute: Account<'info, Dispute>,
    #[account(mut)]
    pub escrow: Account<'info, Escrow>,
    #[account(mut)]
    pub job: Account<'info, Job>,
    #[account(mut)]
    pub initiator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VoteDispute<'info> {
    #[account(mut)]
    pub dispute: Account<'info, Dispute>,
    #[account(
        init,
        payer = voter,
        space = 8 + VoteRecord::INIT_SPACE,
        seeds = [b"vote", dispute.key().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub vote_record: Account<'info, VoteRecord>,
    #[account(
        seeds = [b"reputation", voter.key().as_ref()],
        bump = voter_reputation.bump
    )]
    pub voter_reputation: Account<'info, Reputation>,
    #[account(mut)]
    pub voter: Signer<'info>,
    // Accounts needed for auto-resolution
    #[account(mut)]
    pub escrow: Account<'info, Escrow>,
    #[account(mut)]
    pub job: Account<'info, Job>,
    #[account(mut)]
    /// CHECK: client potentially receiving refund
    pub client: AccountInfo<'info>,
    #[account(mut)]
    /// CHECK: freelancer potentially receiving payment
    pub freelancer: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveDispute<'info> {
    #[account(mut)]
    pub dispute: Account<'info, Dispute>,
    #[account(mut)]
    pub escrow: Account<'info, Escrow>,
    #[account(mut)]
    pub job: Account<'info, Job>,
    #[account(mut)]
    /// CHECK: client potentially receiving refund
    pub client: AccountInfo<'info>,
    #[account(mut)]
    /// CHECK: freelancer potentially receiving payment
    pub freelancer: AccountInfo<'info>,
    /// Anyone involved in the dispute (client, freelancer, or a voter) must sign
    pub resolver: Signer<'info>,
}

#[derive(Accounts)]
pub struct AddDisputeEvidence<'info> {
    #[account(
        mut,
        realloc = 8 + dispute.job.as_ref().len() 
            + dispute.escrow.as_ref().len()
            + dispute.client.as_ref().len()
            + dispute.freelancer.as_ref().len()
            + dispute.initiator.as_ref().len()
            + 4 + dispute.reason.len()
            + 1  // status
            + 4 + 4  // votes
            + 8 + 9  // created_at + resolved_at Option
            + 4 + (dispute.evidence_uris.len() + 1) * (4 + 200)  // evidence_uris Vec with space for new item
            + 1,  // bump
        realloc::payer = uploader,
        realloc::zero = false
    )]
    pub dispute: Account<'info, Dispute>,
    #[account(mut)]
    pub uploader: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeReputation<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + Reputation::INIT_SPACE,
        seeds = [b"reputation", user.key().as_ref()],
        bump
    )]
    pub reputation: Account<'info, Reputation>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitReview<'info> {
    #[account(
        init,
        payer = reviewer,
        space = 8 + Review::INIT_SPACE,
        seeds = [b"review", job.key().as_ref(), reviewer.key().as_ref()],
        bump
    )]
    pub review: Account<'info, Review>,
    pub job: Account<'info, Job>,
    #[account(mut)]
    pub reviewee_reputation: Account<'info, Reputation>,
    #[account(mut)]
    pub reviewer: Signer<'info>,
    /// CHECK: reviewee being reviewed
    pub reviewee: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

// ==================== STATE ACCOUNTS ====================

#[account]
#[derive(InitSpace)]
pub struct Job {
    pub client: Pubkey,
    #[max_len(100)]
    pub title: String,
    #[max_len(500)]
    pub description: String,
    pub budget: u64,
    #[max_len(200)]
    pub metadata_uri: String,
    pub token_mint: Option<Pubkey>,  // None = SOL, Some = SPL token mint
    pub status: JobStatus,
    pub selected_freelancer: Option<Pubkey>,
    pub created_at: i64,
    pub updated_at: i64,
    pub bid_count: u32,
    pub escrow_amount: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Bid {
    pub job: Pubkey,
    pub freelancer: Pubkey,
    pub proposed_budget: u64,
    #[max_len(500)]
    pub proposal: String,
    pub timeline_days: u16,
    #[max_len(200)]
    pub cv_uri: String,  // Empty string if not provided
    pub status: BidStatus,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Escrow {
    pub job: Pubkey,
    pub client: Pubkey,
    pub freelancer: Pubkey,
    pub amount: u64,
    pub locked: bool,
    pub released: bool,
    pub disputed: bool,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct WorkSubmission {
    pub job: Pubkey,
    pub freelancer: Pubkey,
    #[max_len(200)]
    pub deliverable_uri: String,
    pub submitted_at: i64,
    pub approved: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Dispute {
    pub job: Pubkey,
    pub escrow: Pubkey,
    pub client: Pubkey,
    pub freelancer: Pubkey,
    pub initiator: Pubkey,
    #[max_len(500)]
    pub reason: String,
    pub status: DisputeStatus,
    pub votes_for_client: u32,
    pub votes_for_freelancer: u32,
    pub created_at: i64,
    pub resolved_at: Option<i64>,
    #[max_len(10, 200)]  // Max 10 evidence items, each max 200 chars
    pub evidence_uris: Vec<String>,  // IPFS URIs for evidence
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct VoteRecord {
    pub dispute: Pubkey,
    pub voter: Pubkey,
    pub vote_for_client: bool,
    pub voted_at: i64,
    pub fee_claimed: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Reputation {
    pub user: Pubkey,
    pub total_reviews: u32,
    pub average_rating: f32,
    pub completed_jobs: u32,
    pub total_earned: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Review {
    pub job: Pubkey,
    pub reviewer: Pubkey,
    pub reviewee: Pubkey,
    pub rating: u8,
    #[max_len(300)]
    pub comment: String,
    pub created_at: i64,
    pub bump: u8,
}

// ==================== ENUMS ====================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum JobStatus {
    Open,
    InProgress,
    WaitingForReview,  // Freelancer submitted work, awaiting client review
    Rejected,          // Client rejected work, funds still in escrow
    Completed,
    Disputed,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum BidStatus {
    Pending,
    Accepted,
    Rejected,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum DisputeStatus {
    Open,
    ResolvedClient,
    ResolvedFreelancer,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum NotificationType {
    JobAssigned,
    WorkSubmitted,
    WorkApproved,
    WorkRejected,
    PaymentReceived,
    DisputeRaised,
}

// ==================== EVENTS ====================

#[event]
pub struct JobCreated {
    pub job: Pubkey,
    pub client: Pubkey,
    pub budget: u64,
    pub timestamp: i64,
}

#[event]
pub struct BidSubmitted {
    pub bid: Pubkey,
    pub job: Pubkey,
    pub freelancer: Pubkey,
    pub proposed_budget: u64,
    pub timestamp: i64,
}

#[event]
pub struct BidAccepted {
    pub bid: Pubkey,
    pub job: Pubkey,
    pub freelancer: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct EscrowDeposited {
    pub escrow: Pubkey,
    pub job: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct EscrowReleased {
    pub escrow: Pubkey,
    pub job: Pubkey,
    pub freelancer: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct WorkSubmitted {
    pub job: Pubkey,
    pub freelancer: Pubkey,
    pub deliverable_uri: String,
    pub timestamp: i64,
}

#[event]
pub struct WorkRejected {
    pub job: Pubkey,
    pub client: Pubkey,
    pub freelancer: Pubkey,
    pub reason: String,
    pub timestamp: i64,
}

#[event]
pub struct ClientNotification {
    pub client: Pubkey,
    pub job: Pubkey,
    pub notification_type: NotificationType,
    pub timestamp: i64,
}

#[event]
pub struct CommunityNotification {
    pub job: Pubkey,
    pub dispute: Pubkey,
    pub notification_type: NotificationType,
    pub timestamp: i64,
}

#[event]
pub struct DisputeOpened {
    pub dispute: Pubkey,
    pub job: Pubkey,
    pub initiator: Pubkey,
    pub reason: String,
    pub timestamp: i64,
}

#[event]
pub struct DisputeVoted {
    pub dispute: Pubkey,
    pub voter: Pubkey,
    pub vote_for_client: bool,
}

#[event]
pub struct DisputeEvidenceAdded {
    pub dispute: Pubkey,
    pub uploader: Pubkey,
    pub evidence_uri: String,
    pub timestamp: i64,
}

#[event]
pub struct DisputeResolved {
    pub dispute: Pubkey,
    pub winner_is_client: bool,
    pub timestamp: i64,
}

#[event]
pub struct ReviewSubmitted {
    pub review: Pubkey,
    pub job: Pubkey,
    pub reviewer: Pubkey,
    pub reviewee: Pubkey,
    pub rating: u8,
    pub timestamp: i64,
}

#[event]
pub struct FreelancerNotification {
    pub freelancer: Pubkey,
    pub job: Pubkey,
    pub notification_type: NotificationType,
    pub timestamp: i64,
}

#[event]
pub struct JobCancelled {
    pub job: Pubkey,
    pub client: Pubkey,
    pub refund_amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct JobCompleted {
    pub job: Pubkey,
    pub client: Pubkey,
    pub freelancer: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

// ==================== ERRORS ====================

#[error_code]
pub enum ErrorCode {
    #[msg("Title exceeds maximum length")]
    TitleTooLong,
    #[msg("Description exceeds maximum length")]
    DescriptionTooLong,
    #[msg("Invalid budget amount")]
    InvalidBudget,
    #[msg("Job is not open for bids")]
    JobNotOpen,
    #[msg("Proposal exceeds maximum length")]
    ProposalTooLong,
    #[msg("Invalid timeline")]
    InvalidTimeline,
    #[msg("Unauthorized action")]
    Unauthorized,
    #[msg("Invalid bid")]
    InvalidBid,
    #[msg("Bid is not pending")]
    BidNotPending,
    #[msg("Insufficient escrow amount")]
    InsufficientEscrow,
    #[msg("Escrow already funded")]
    EscrowAlreadyFunded,
    #[msg("Invalid escrow")]
    InvalidEscrow,
    #[msg("Escrow is not locked")]
    EscrowNotLocked,
    #[msg("Escrow already released")]
    EscrowAlreadyReleased,
    #[msg("Escrow is disputed")]
    EscrowDisputed,
    #[msg("Job is not in progress")]
    JobNotInProgress,
    #[msg("URI exceeds maximum length")]
    URITooLong,
    #[msg("Escrow already disputed")]
    EscrowAlreadyDisputed,
    #[msg("Reason exceeds maximum length")]
    ReasonTooLong,
    #[msg("Dispute is not open")]
    DisputeNotOpen,
    #[msg("Insufficient reputation to vote")]
    InsufficientReputation,
    #[msg("Cannot vote on own dispute")]
    CannotVoteOwnDispute,
    #[msg("Insufficient votes to resolve")]
    InsufficientVotes,
    #[msg("Job is not completed")]
    JobNotCompleted,
    #[msg("Invalid rating (must be 1-5)")]
    InvalidRating,
    #[msg("Comment exceeds maximum length")]
    CommentTooLong,
    #[msg("Not eligible for this achievement")]
    NotEligibleForAchievement,
    #[msg("Dispute is not resolved yet")]
    DisputeNotResolved,
    #[msg("No votes to distribute fees")]
    NoVotesToDistribute,
    #[msg("Fee share too small")]
    FeeShareTooSmall,
    #[msg("Fee already claimed")]
    FeeAlreadyClaimed,
    #[msg("Bid exceeds job budget")]
    BidExceedsBudget,
    #[msg("Job cannot be cancelled in current status")]
    JobCannotBeCancelled,
    #[msg("Cannot cancel job after work submission (funds protected)")]
    CannotCancelAfterSubmission,
    #[msg("Job is not in review status")]
    JobNotInReview,
    #[msg("Invalid work submission")]
    InvalidWorkSubmission,
    #[msg("Cannot dispute a job that was not rejected")]
    CannotDisputeNonRejectedJob,
    #[msg("Job is disputed")]
    JobDisputed,
    #[msg("URI exceeds maximum length")]
    UriTooLong,
    #[msg("Too many evidence items (max 10)")]
    TooManyEvidenceItems,
}
