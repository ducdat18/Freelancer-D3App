# 🗳️ Dispute Voting System - Complete Guide

## 📋 Overview

The Freelance DApp uses a **community-driven dispute resolution system** where trusted users vote to resolve conflicts between clients and freelancers.

---

## 🎯 Who Can Vote?

### Arbitrator Requirements

To vote on disputes, you must meet **ALL** of these criteria:

✅ **Average Rating ≥ 4.0 stars**
- Your reputation score must be at least 4.0/5.0
- Build reputation by completing jobs successfully

✅ **At Least 5 Completed Reviews**
- You need 5+ reviews from past jobs
- Reviews come from clients (if you're a freelancer) or freelancers (if you're a client)

✅ **Not Involved in the Dispute**
- You cannot be the client OR freelancer in that specific dispute
- This ensures unbiased voting

### How to Check Your Eligibility

1. Go to **Profile** → View your reputation
2. Check: `Average Rating` and `Total Reviews`
3. If you meet requirements, you'll see "✅ You Can Vote" on dispute cards

---

## 🔍 How to Vote

### Step 1: Navigate to Disputes Page

**Option A: From Header**
- Click **"Disputes"** in the navigation menu

**Option B: From Job Detail Page**
- If a job is disputed, click **"View All Disputes & Vote"** button

### Step 2: Review the Dispute

Each dispute card shows:

```
┌─────────────────────────────────────────┐
│ 📦 Disputed Job #abc123...              │
│ Status: Voting in Progress              │
├─────────────────────────────────────────┤
│ ⚠️ Dispute Reason:                      │
│ "Client rejected unfairly without..."   │
├─────────────────────────────────────────┤
│ 📦 Submitted Work (Review Required)     │
│ [View Deliverable] button               │
├─────────────────────────────────────────┤
│ Client: abc...xyz                       │
│ Freelancer: def...ghi                   │
├─────────────────────────────────────────┤
│ 📊 Current Votes: 3 / 5 needed          │
│ For Client: 1 vote (33.3%)              │
│ For Freelancer: 2 votes (66.7%)         │
│ [Progress Bar]                          │
├─────────────────────────────────────────┤
│ ✅ You Can Vote on This Dispute         │
│ [Vote for Client] [Vote for Freelancer]│
└─────────────────────────────────────────┘
```

### Step 3: Review Evidence

**Click "View Deliverable"** to see:
- 🖼️ **Image/File Preview** in a modal dialog
- 📄 **IPFS Hash** for verification
- 📅 **Submission Timestamp**
- 🔗 **"Open in New Tab"** option

**Read the Dispute Reason:**
- Client's explanation for rejection
- Freelancer's counter-argument

**Check Job Details:**
- Click **"View Job Details"** to see full context
- Review original job description
- Check agreed budget and timeline

### Step 4: Cast Your Vote

**If you believe the CLIENT is right:**
- Click **"Vote for Client"** (green button)
- Example: Work quality is poor, doesn't meet requirements

**If you believe the FREELANCER is right:**
- Click **"Vote for Freelancer"** (red button)
- Example: Work is good, client is being unreasonable

**Transaction Confirmation:**
- Your wallet will prompt for signature
- Confirm the transaction
- Wait for blockchain confirmation (~5-10 seconds)

### Step 5: Vote Recorded

✅ **Success Message:**
```
Vote submitted successfully! Transaction: abc12345...
```

Your vote is now **permanent** and **on-chain**.

---

## 📊 Voting Progress

### Vote Tracking

- **Total Votes Needed:** 5 votes minimum
- **Current Status:** Shown in real-time
- **Vote Distribution:** Bar chart shows Client vs Freelancer votes

### Status Types

🟡 **Open** - Dispute just created, 0 votes
- Waiting for arbitrators to review

🔵 **Voting in Progress** - 1-4 votes received
- More votes needed to resolve

🟢 **Resolved** - 5+ votes, winner determined
- Escrow released to winner

---

## 💰 Arbitrator Rewards

### Fee Distribution

When you vote on a dispute that gets resolved:

✅ **2% of Escrow Amount** distributed to ALL arbitrators
- Example: 10 SOL escrow → 0.2 SOL total fee
- Split among all voters (e.g., 5 voters = 0.04 SOL each)

✅ **Claim Your Fee:**
- Go to **"Arbitrator Fees"** page (in navigation)
- See all disputes you voted on
- Click **"Claim Fee"** for resolved disputes

---

## 🔐 Smart Contract Logic

### Vote Validation

```rust
pub fn vote_dispute(ctx: Context<VoteDispute>, vote_for_client: bool) -> Result<()> {
    let dispute = &mut ctx.accounts.dispute;
    let voter_reputation = &ctx.accounts.voter_reputation;
    
    // ✅ Check 1: Dispute is still open
    require!(dispute.status == DisputeStatus::Open, ErrorCode::DisputeNotOpen);
    
    // ✅ Check 2: Voter has high reputation
    require!(voter_reputation.average_rating >= 4.0, ErrorCode::InsufficientReputation);
    require!(voter_reputation.total_reviews >= 5, ErrorCode::InsufficientReputation);
    
    // ✅ Check 3: Voter is not involved
    let voter = ctx.accounts.voter.key();
    require!(
        voter != dispute.client && voter != dispute.freelancer,
        ErrorCode::CannotVoteOwnDispute
    );
    
    // ✅ Record vote
    if vote_for_client {
        dispute.votes_for_client += 1;
    } else {
        dispute.votes_for_freelancer += 1;
    }
    
    Ok(())
}
```

### Resolution Logic

```rust
pub fn resolve_dispute(ctx: Context<ResolveDispute>) -> Result<()> {
    let dispute = &mut ctx.accounts.dispute;
    
    // ✅ Check: At least 5 votes
    let total_votes = dispute.votes_for_client + dispute.votes_for_freelancer;
    require!(total_votes >= 5, ErrorCode::InsufficientVotes);
    
    // ✅ Determine winner (majority)
    let winner_is_client = dispute.votes_for_client > dispute.votes_for_freelancer;
    
    // ✅ Transfer escrow to winner
    if winner_is_client {
        // Transfer to client
    } else {
        // Transfer to freelancer
    }
    
    // ✅ Distribute 2% fee to arbitrators
    distribute_arbitrator_fees();
    
    dispute.status = DisputeStatus::Resolved;
    Ok(())
}
```

---

## 🎨 UI Improvements (Latest)

### ✅ Enhanced Dispute Cards

**Before:**
- ❌ Deliverable opened in new tab
- ❌ Reason text hard to read
- ❌ Voting buttons hidden
- ❌ No eligibility explanation

**After:**
- ✅ Deliverable preview in modal dialog
- ✅ High-contrast reason display with red border
- ✅ Prominent voting section with clear instructions
- ✅ Eligibility requirements shown if can't vote

### ✅ Better Contrast

**Fixed Issues:**
- ✅ "Under Dispute Resolution" now has black text on light red background
- ✅ "How Dispute Resolution Works" info box has better contrast
- ✅ Vote progress bar is larger and more visible
- ✅ All text meets WCAG accessibility standards

---

## 🚀 Complete Workflow Example

### Scenario: Client Rejects Work Unfairly

**1. Freelancer Raises Dispute**
```
Job Status: Rejected → Disputed
Escrow: Locked (10 SOL)
Reason: "Client rejected without valid reason. Work meets all requirements."
```

**2. Arbitrator Alice Reviews**
```
Alice's Stats:
- Rating: 4.5/5.0 ✅
- Reviews: 12 ✅
- Not involved: ✅

Alice clicks "View Deliverable"
→ Sees high-quality work
→ Reads dispute reason
→ Clicks "Vote for Freelancer"
```

**3. More Arbitrators Vote**
```
Bob (4.2 rating, 8 reviews): Votes for Freelancer
Carol (4.8 rating, 15 reviews): Votes for Freelancer
Dave (4.1 rating, 6 reviews): Votes for Client
Eve (4.6 rating, 20 reviews): Votes for Freelancer
```

**4. Resolution**
```
Final Votes:
- For Client: 1 vote (20%)
- For Freelancer: 4 votes (80%)

Winner: Freelancer ✅
Escrow Released: 10 SOL → Freelancer
Arbitrator Fees: 0.2 SOL split among 5 voters (0.04 SOL each)
```

**5. Claim Fees**
```
Alice goes to "Arbitrator Fees" page
Clicks "Claim Fee" for this dispute
Receives: 0.04 SOL
```

---

## 📱 Mobile Responsive

All voting UI is fully responsive:
- ✅ Buttons stack vertically on mobile
- ✅ Deliverable modal adapts to screen size
- ✅ Vote progress bar scales properly
- ✅ Touch-friendly button sizes

---

## 🔒 Security Features

### Vote Integrity

✅ **One Vote Per User**
- PDA: `["vote", dispute_key, voter_key]`
- Prevents double voting

✅ **Immutable Votes**
- Once cast, votes cannot be changed
- All votes recorded on-chain

✅ **Transparent Results**
- Anyone can verify vote counts
- Blockchain provides audit trail

---

## 📞 Support

**Can't Vote?**
- Build your reputation by completing more jobs
- Aim for 5-star ratings
- Get at least 5 reviews

**Dispute Not Showing?**
- Refresh the page
- Check you're on correct network (Devnet)
- Verify wallet is connected

**Vote Transaction Failed?**
- Check you have enough SOL for gas fees (~0.001 SOL)
- Ensure dispute is still open
- Verify you meet eligibility requirements

---

## 🎯 Best Practices for Arbitrators

### Do's ✅

- **Review ALL evidence** before voting
- **Download deliverables** to inspect quality
- **Read full dispute reason** carefully
- **Check job description** for context
- **Vote fairly and objectively**
- **Claim your fees** after resolution

### Don'ts ❌

- **Don't vote blindly** without reviewing evidence
- **Don't vote based on personal bias**
- **Don't rush** - take time to understand the dispute
- **Don't vote if unsure** - abstain if you can't decide
- **Don't expect immediate resolution** - need 5 votes total

---

## 📊 Statistics

Track your arbitrator performance:
- **Total Votes Cast:** See in profile
- **Fees Earned:** Check "Arbitrator Fees" page
- **Accuracy Rate:** Coming soon (track if you voted with majority)

---

**Built with ❤️ for fair and transparent freelancing**

