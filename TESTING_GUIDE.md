# 🧪 END-TO-END TESTING GUIDE
## Freelance DApp - Complete Workflow Testing

**Date:** 2026-01-05
**Purpose:** Verify all critical workflows function correctly
**Estimated Time:** 45-60 minutes

---

## 📋 PRE-REQUISITES

### 1. Environment Setup ✅

**Check these before starting:**

```bash
# 1. Verify Solana CLI is installed
solana --version
# Should show: solana-cli 1.17.x or higher

# 2. Check you're on devnet
solana config get
# Should show: RPC URL: https://api.devnet.solana.com

# 3. Verify Anchor
anchor --version
# Should show: anchor-cli 0.30.x

# 4. Check your wallet has SOL
solana balance
# Should show: at least 5-10 SOL (devnet)
# If not, run: solana airdrop 5
```

### 2. Application Setup

```bash
# 1. Navigate to project directory
cd /home/networkprogram/freelance-dapp

# 2. Install dependencies (if not done)
npm install

# 3. Build smart contract
anchor build

# 4. Get program ID
solana address -k target/deploy/freelance_marketplace-keypair.json

# 5. Update program ID in code if needed
# Check: programs/freelance-marketplace/src/lib.rs (line 1)
# Check: Anchor.toml

# 6. Deploy to devnet
anchor deploy --provider.cluster devnet

# 7. Generate IDL
anchor idl init --filepath target/idl/freelance_marketplace.json $(solana address -k target/deploy/freelance_marketplace-keypair.json)

# Or update if already deployed:
# anchor idl upgrade --filepath target/idl/freelance_marketplace.json $(solana address -k target/deploy/freelance_marketplace-keypair.json)

# 8. Start the frontend
npm run dev
```

### 3. Browser Setup

- **Phantom Wallet** installed (or Solflare)
- Switch to **Devnet** in wallet settings
- Have **2 wallet accounts** ready (Client + Freelancer)
- Airdrop SOL to both wallets: `solana airdrop 5 <ADDRESS>`

---

## 🧪 TEST SCENARIOS

## TEST 1: Complete Job Workflow (Happy Path) ⭐ MAIN TEST

**Participants:** 1 Client, 1 Freelancer
**Duration:** ~15 minutes
**Goal:** Test entire flow from job creation to completion with review

### Step-by-Step Instructions:

#### **PHASE 1: Job Creation (Client)**

1. **Connect Wallet as Client**
   ```
   - Open http://localhost:3000
   - Click "Connect Wallet" (top right)
   - Select Phantom
   - Approve connection
   - ✅ Verify: Wallet address displayed, balance shown
   ```

2. **Create a New Job**
   ```
   - Click "Post Job" in navbar
   - Fill in form:
     * Title: "Build a DeFi Dashboard"
     * Description: "Create a React dashboard to display DeFi stats..."
     * Budget: "2.5" SOL
     * Deadline: Select tomorrow's date
     * Category: "Development"
     * Skills: "React, TypeScript, Web3"
   - Click "Create Job & Deposit"

   ✅ Verify:
   - Transaction confirmation appears
   - "Job created successfully!" alert
   - Redirects to /jobs page
   - Your new job appears in list
   ```

3. **View Job Detail**
   ```
   - Click on your created job
   - Check sidebar:
     * ✅ Payment Status: "Pending Deposit" (orange)
     * ✅ Job Progress: Stage 1 "Job Posted" (active)
     * ✅ Budget: 2.5 SOL displayed
     * ✅ Status chip: "Open" (green)
   ```

#### **PHASE 2: Bidding (Freelancer)**

4. **Switch to Freelancer Wallet**
   ```
   - Disconnect current wallet
   - Connect with second wallet (Freelancer)
   - ✅ Verify: Different address shown
   ```

5. **Find and Bid on Job**
   ```
   - Go to "Browse Jobs" or /jobs
   - Find the job "Build a DeFi Dashboard"
   - Click to open job detail
   - Click "Submit Bid" button

   - In Bid Dialog, fill:
     * Proposed Budget: "2.0" SOL
     * Timeline: "7" days
     * Proposal: "I have 5 years experience with React and Web3..."
     * (Optional) Upload CV
   - Click "Submit Bid"

   ✅ Verify:
   - "Bid submitted successfully!" alert
   - Bid appears in "Your Bids" section
   - Job shows "1 bid" chip
   ```

#### **PHASE 3: Bid Selection (Client)**

6. **Switch Back to Client Wallet**
   ```
   - Disconnect freelancer wallet
   - Connect with client wallet again
   - Navigate to the job detail page
   ```

7. **Select the Bid**
   ```
   - Scroll to "Bids" section
   - See the freelancer's bid listed
   - Review proposal, budget, timeline
   - Click "Accept Bid" button
   - Approve transaction in Phantom

   ✅ Verify:
   - "Bid accepted successfully!" message
   - Job status changes to "In Progress" (blue chip)
   - "Selected Freelancer" card appears in sidebar
   - Payment Status: Still "Pending Deposit"
   - Job Progress: Stage 2 "Freelancer Selected" (active)
   ```

#### **PHASE 4: Work Submission (Freelancer)**

8. **Switch to Freelancer Wallet**
   ```
   - Disconnect client wallet
   - Connect freelancer wallet
   - Navigate to the job detail page
   ```

9. **Submit Deliverables** ✨ NEW FEATURE
   ```
   - Scroll to "Deliverable Submission" section
   - Should see DeliverableSubmit component

   - Add First Deliverable:
     * Description: "React Dashboard Components"
     * Click "Choose File"
     * Select a small file (< 50MB)
     * Click upload icon
     * ✅ File uploaded, shows in list

   - Add Second Deliverable (optional):
     * Description: "Documentation & Setup Guide"
     * Upload another file

   - Click "Submit Deliverables"
   - Approve transaction

   ✅ Verify:
   - "Work submitted successfully!" alert
   - DeliverableSubmit component replaced with:
     "✅ You have submitted your work! Waiting for client approval."
   - Job Progress: Stage 3 "Work In Progress" (active, shows "Work submitted")
   ```

#### **PHASE 5: Client Review & Approval** ✨ NEW FEATURE

10. **Switch to Client Wallet**
    ```
    - Disconnect freelancer
    - Connect client wallet
    - Navigate to job detail page
    ```

11. **Review Submitted Work**
    ```
    ✅ Verify you see:
    - Green alert: "✅ Freelancer has submitted work! Review the deliverables..."
    - "📦 Work Submitted" section showing:
      * Submission date
      * Deliverable URI (IPFS hash)
    - "Review & Complete Job" button is now ENABLED
    - Payment Status: "Pending Deposit" (if not deposited yet)
    ```

12. **Approve Work with Review** ✨ CRITICAL TEST
    ```
    - Click "Review & Complete Job" button
    - ApprovalModal opens

    In the modal you should see:
    - Job title: "Build a DeFi Dashboard"
    - Freelancer address
    - Amount: "2.5 SOL"
    - Deliverables list

    - Rate the freelancer:
      * Click stars to select: ⭐⭐⭐⭐⭐ (5 stars)

    - Write review:
      * "Excellent work! Dashboard is clean and well-documented.
         Fast delivery and great communication."
      * (Must be at least 10 characters)

    - Click "Approve & Release Payment"
    - Approve ALL transactions in Phantom (2-3 transactions):
      1. Deposit escrow (if needed)
      2. Complete job & release payment
      3. Submit review

    ✅ Verify:
    - "Job completed successfully! Payment released and review submitted." alert
    - Modal closes
    - Job status: "Completed" (gray chip)
    - Payment Status: "Funds Released" (green)
    - Job Progress: Stage 5 "Completed" (all stages green checkmarks)
    - Success box at bottom: "✅ Job completed successfully!"
    ```

13. **Verify Review on Blockchain**
    ```
    - Navigate to freelancer's profile:
      /profile/<FREELANCER_ADDRESS>

    ✅ Verify:
    - Total Reviews increased
    - Average rating updated
    - Your review appears in review list
    - Review text: "Excellent work! Dashboard is clean..."
    - Rating: 5 stars
    ```

#### **PHASE 6: Payment Verification (Freelancer)**

14. **Check Freelancer Received Payment**
    ```
    - Switch to freelancer wallet
    - Check balance: solana balance <FREELANCER_ADDRESS>

    ✅ Verify:
    - Balance increased by ~2.5 SOL (minus transaction fees)
    - Or check in Phantom wallet UI
    ```

### ✅ TEST 1 SUCCESS CRITERIA

- [x] Job created successfully
- [x] Freelancer submitted bid
- [x] Client selected bid
- [x] Job status changed to "In Progress"
- [x] Freelancer submitted deliverables ✨
- [x] Client saw work submission ✨
- [x] ApprovalModal opened correctly ✨
- [x] Client submitted rating & review ✨
- [x] Payment released to freelancer
- [x] Review saved on blockchain ✨
- [x] Job status: "Completed"
- [x] All status indicators updated correctly
- [x] Escrow status progressed: Pending → Locked → Released

---

## TEST 2: Dispute Resolution Workflow

**Participants:** 1 Client, 1 Freelancer, 1+ Arbitrators
**Duration:** ~20 minutes
**Goal:** Test dispute opening, voting, and resolution

### Prerequisites:
- Have at least 1 job "In Progress" with work submitted
- Have 5+ wallet accounts with:
  - Average rating ≥ 4.0
  - Total reviews ≥ 5
  (Or create test reviews to meet requirements)

### Steps:

1. **Open Dispute (Client or Freelancer)**
   ```
   - Navigate to job detail page
   - (Need to add dispute button - currently not in UI)
   - Alternative: Use scripts/test directly

   OR test from disputes page:
   - Go to /disputes
   - See if any disputes exist
   ```

2. **Vote on Dispute (Arbitrators)**
   ```
   - Switch to arbitrator wallet (high reputation)
   - Go to /disputes
   - Find the dispute
   - Click "Vote Client" or "Vote Freelancer"
   - Approve transaction

   ✅ Verify:
   - "Vote submitted successfully!" message
   - Vote count increases
   - "Claimed" chip appears for you
   - Cannot vote again (button disabled)
   ```

3. **Resolve Dispute**
   ```
   - After 5+ votes, majority decides winner
   - Funds released to winner
   - Dispute status: "Resolved"
   ```

4. **Claim Arbitrator Fee**
   ```
   - Go to /arbitrator/fees
   - See list of disputes you voted on
   - Find this dispute
   - Click "Claim" button
   - Approve transaction

   ✅ Verify:
   - Fee claimed successfully (2% of escrow / total votes)
   - Status changes to "Claimed" with green chip
   - Your balance increased
   ```

### ✅ TEST 2 SUCCESS CRITERIA

- [ ] Dispute opened successfully
- [ ] Arbitrators could vote
- [ ] Votes counted correctly
- [ ] Majority vote determined winner
- [ ] Funds released to winner
- [ ] Arbitrators claimed fees
- [ ] Cannot vote twice
- [ ] Cannot vote on own dispute

---

## TEST 3: Notifications & Real-time Updates

**Duration:** ~10 minutes
**Goal:** Test notification system

### Steps:

1. **Test New Bid Notification**
   ```
   - As Client, create a job
   - As Freelancer (different browser/window), submit bid
   - Wait 30 seconds (polling interval)

   ✅ Verify (Client side):
   - Notification appears: "New Bid Received"
   - Click notification → navigates to job page
   - Notification badge shows count
   ```

2. **Test Transaction Notifications**
   ```
   - Perform any blockchain action (create job, submit bid, etc.)

   ✅ Verify:
   - Notification appears with transaction signature
   - Click "View on Explorer" link
   - Opens Solana Explorer with correct transaction
   ```

3. **Test Notification Dropdown**
   ```
   - Click notification icon (bell) in navbar
   - Dropdown opens showing recent notifications

   ✅ Verify:
   - Shows all recent notifications
   - Unread count displayed
   - "Mark all as read" works
   - Individual delete works
   ```

### ✅ TEST 3 SUCCESS CRITERIA

- [ ] New bid notification appears (30s delay)
- [ ] Transaction notifications show explorer link
- [ ] Notification dropdown functional
- [ ] Mark as read/delete works
- [ ] Badge count updates correctly

---

## TEST 4: Escrow Status Indicators

**Duration:** ~5 minutes
**Goal:** Verify escrow status updates correctly

### Test Escrow States:

1. **Pending State**
   ```
   - Create job
   - Do NOT deposit escrow
   - View job detail page

   ✅ Verify:
   - Payment Status: "⏳ Pending Deposit" (orange)
   - Shows escrow amount
   ```

2. **Locked State**
   ```
   - After freelancer selected and work in progress
   - Client deposits escrow (or during completion)

   ✅ Verify:
   - Payment Status: "🔒 Funds Locked" (blue)
   - Shows animated progress bar
   - Message: "Awaiting job completion and approval"
   ```

3. **Released State**
   ```
   - After job completed

   ✅ Verify:
   - Payment Status: "✅ Funds Released" (green)
   - Shows escrow amount
   ```

4. **Disputed State**
   ```
   - Open a dispute

   ✅ Verify:
   - Payment Status: "⚠️ In Dispute" (red)
   ```

5. **Refunded State**
   ```
   - Cancel job with escrow deposited

   ✅ Verify:
   - Payment Status: "🔓 Refunded" (gray)
   ```

### ✅ TEST 4 SUCCESS CRITERIA

- [ ] All 5 states display correctly
- [ ] Colors match expected (orange/blue/green/red/gray)
- [ ] Icons display properly
- [ ] Amount shown in all states
- [ ] Progress animation for "Locked" state

---

## TEST 5: Job Status Timeline

**Duration:** ~10 minutes
**Goal:** Verify timeline updates through all stages

### Steps:

1. **Stage 1: Job Posted**
   ```
   - Create new job
   - View job detail → Check sidebar timeline

   ✅ Verify:
   - Stage 1 active (blue circle, blue text)
   - Shows bid count: "X bids received" or "Waiting for bids..."
   - Stages 2-5 inactive (gray circles)
   ```

2. **Stage 2: Freelancer Selected**
   ```
   - Accept a bid

   ✅ Verify:
   - Stage 1 completed (green checkmark)
   - Stage 2 active (blue)
   - Description: "Freelancer assigned to job"
   ```

3. **Stage 3: Work In Progress**
   ```
   - Freelancer submits work

   ✅ Verify:
   - Stages 1-2 completed (green)
   - Stage 3 active (blue)
   - Description updates: "Work submitted by freelancer"
   ```

4. **Stage 4: Client Review**
   ```
   - Before approval

   ✅ Verify:
   - Stage 4 active
   - Description: "Awaiting client approval"
   ```

5. **Stage 5: Completed**
   ```
   - Client approves & releases payment

   ✅ Verify:
   - All 5 stages completed (green checkmarks)
   - Success box appears: "✅ Job completed successfully!"
   ```

6. **Special: Cancelled Job**
   ```
   - Cancel a job

   ✅ Verify:
   - Timeline replaced with:
     "❌ Job Cancelled" box (orange)
     Message: "This job was cancelled and any escrow funds were refunded."
   ```

7. **Special: Disputed Job**
   ```
   - Open dispute

   ✅ Verify:
   - Timeline replaced with:
     "⚖️ Under Dispute Resolution" box (red)
     Message: "This job is currently in dispute..."
   ```

### ✅ TEST 5 SUCCESS CRITERIA

- [ ] All 5 stages display correctly
- [ ] Progress updates in real-time
- [ ] Icons change color (gray → blue → green)
- [ ] Descriptions update contextually
- [ ] Cancelled/Disputed special views work

---

## 🐛 COMMON ISSUES & TROUBLESHOOTING

### Issue 1: "Program account not found"
**Cause:** Smart contract not deployed
**Fix:**
```bash
anchor build
anchor deploy --provider.cluster devnet
```

### Issue 2: "Transaction simulation failed"
**Cause:** Insufficient SOL or wrong cluster
**Fix:**
```bash
# Check balance
solana balance

# Airdrop if needed
solana airdrop 5

# Verify on devnet
solana config get
```

### Issue 3: "IDL not found"
**Cause:** IDL not uploaded
**Fix:**
```bash
anchor idl init --filepath target/idl/freelance_marketplace.json $(solana address -k target/deploy/freelance_marketplace-keypair.json)
```

### Issue 4: Work submission not showing
**Cause:** Work submission PDA not found
**Check:**
- Look in browser console for errors
- Verify `deriveWorkSubmissionPDA` matches smart contract seeds

### Issue 5: ApprovalModal not opening
**Cause:** `workSubmission` is null
**Fix:**
- Ensure freelancer actually submitted work
- Check browser console for fetch errors
- Verify work_submission account exists

### Issue 6: Review not saving
**Cause:** Reputation account not initialized
**Fix:**
- Initialize reputation first:
```typescript
const { initializeReputation } = useReputation();
await initializeReputation();
```

### Issue 7: "Cannot vote - insufficient reputation"
**Cause:** Need rating ≥ 4.0 and reviews ≥ 5
**Fix:**
- Create test reviews first
- Or lower requirements in smart contract for testing

### Issue 8: Notifications not appearing
**Cause:** NotificationContext not wrapping app
**Fix:**
- Check `pages/_app.tsx` has `<NotificationProvider>`
- Clear localStorage: `localStorage.clear()`

---

## 📊 TESTING CHECKLIST

### Core Features:
- [ ] Job creation with IPFS metadata
- [ ] Bid submission with CV upload
- [ ] Bid selection
- [ ] Escrow deposit
- [ ] Work submission with deliverables ✨
- [ ] Work visibility for client ✨
- [ ] Client approval with rating ✨
- [ ] Review submission to blockchain ✨
- [ ] Payment release
- [ ] Job completion

### UI/UX Features:
- [ ] Escrow status indicator (5 states)
- [ ] Job status timeline (5 stages)
- [ ] Work submission display
- [ ] ApprovalModal functionality
- [ ] Transaction notifications
- [ ] New bid notifications (30s polling)
- [ ] Loading states
- [ ] Error handling
- [ ] Success messages

### Edge Cases:
- [ ] Cannot submit bid on own job
- [ ] Cannot submit work before selected
- [ ] Cannot approve without work submission
- [ ] Cannot vote on own dispute
- [ ] Cannot vote twice on dispute
- [ ] Cannot claim fee twice
- [ ] Rating validation (must be 1-5)
- [ ] Review length validation (min 10 chars)

### Dispute System:
- [ ] Open dispute
- [ ] Vote on dispute (multiple arbitrators)
- [ ] Resolve dispute (majority vote)
- [ ] Claim arbitrator fees
- [ ] Dispute status updates

---

## 📸 SCREENSHOTS TO CAPTURE (Optional)

For documentation/bug reports:

1. Job creation form
2. Job detail page (all states)
3. DeliverableSubmit component
4. Work submission display
5. ApprovalModal
6. Escrow status (all 5 states)
7. Job timeline (all 5 stages)
8. Notification dropdown
9. Arbitrator fees page
10. Completed job view

---

## ✅ FINAL VALIDATION

After completing all tests:

```bash
# Check all transactions on explorer
# Replace with your transactions
https://explorer.solana.com/tx/<SIGNATURE>?cluster=devnet

# Verify account data
solana account <JOB_PDA> --output json

# Check program logs
solana logs --url devnet | grep "freelance_marketplace"
```

### Success Metrics:
- ✅ **100% of critical workflows** passing
- ✅ **No console errors** (except expected warnings)
- ✅ **All transactions confirmed** on blockchain
- ✅ **UI updates in real-time**
- ✅ **Data persists** across page refreshes

---

## 📝 TEST REPORT TEMPLATE

After testing, fill this out:

```
TEST DATE: ___________
TESTER: ___________
ENVIRONMENT: Devnet
FRONTEND URL: http://localhost:3000
PROGRAM ID: ___________

TESTS PASSED: ___/5
CRITICAL BUGS: ___
MINOR ISSUES: ___

DETAILS:
[ ] TEST 1 - Complete Job Workflow: PASS/FAIL
    Notes:

[ ] TEST 2 - Dispute Resolution: PASS/FAIL
    Notes:

[ ] TEST 3 - Notifications: PASS/FAIL
    Notes:

[ ] TEST 4 - Escrow Status: PASS/FAIL
    Notes:

[ ] TEST 5 - Job Timeline: PASS/FAIL
    Notes:

BUGS FOUND:
1.
2.
3.

RECOMMENDATIONS:
1.
2.
3.

OVERALL STATUS: ✅ READY / ⚠️ NEEDS FIXES / ❌ MAJOR ISSUES
```

---

## 🎯 NEXT STEPS AFTER TESTING

If all tests pass:
1. ✅ Document any bugs found
2. ✅ Fix critical issues
3. ✅ Prepare for mainnet/testnet
4. ✅ Write user documentation
5. ✅ Set up monitoring/analytics

If tests fail:
1. ❌ Document exact error messages
2. ❌ Check browser console logs
3. ❌ Check Solana explorer for failed transactions
4. ❌ Review smart contract logs
5. ❌ File GitHub issues with reproduction steps

---

**Good luck with testing! 🚀**

If you encounter any issues, check the troubleshooting section or share the error messages for help.
