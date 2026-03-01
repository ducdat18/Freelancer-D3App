# Class Diagram Guide - Freelance Marketplace dApp

## Overview

This class diagram shows the complete structure of the Freelance Marketplace dApp with all classes, properties, and functions.

## How to View

**Option 1: Online (Easiest)**
1. Open https://www.plantuml.com/plantuml/uml/
2. Copy contents from `class-diagram-simple.puml`
3. Paste and view

**Option 2: VS Code**
1. Install "PlantUML" extension
2. Open `class-diagram-simple.puml`
3. Press `Alt+D` to preview

**Option 3: Command Line**
```bash
npm install -g node-plantuml
plantuml class-diagram-simple.puml
# Creates class-diagram-simple.png
```

---

## Main Components

### 1. Domain Entities (Green)
Core business objects stored on Solana blockchain:

#### **Job**
- Represents a job posting
- Properties: title, description, budget, deadline, client, freelancer, status
- Functions: isOpen(), canReceiveBids(), assignFreelancer(), validate()

#### **Bid**
- Freelancer's proposal for a job
- Properties: job, bidder, amount, timeline, proposal, status
- Functions: isAccepted(), isPending(), accept(), reject()

#### **Escrow**
- Locked funds for job payment
- Properties: job, client, freelancer, amount, deposited, released, disputed
- Functions: deposit(), release(), refund(), openDispute()

#### **WorkSubmission**
- Deliverables uploaded by freelancer
- Properties: escrow, freelancer, ipfsHash, description
- Functions: getIPFSUrl(), isValid()

#### **Dispute**
- Conflict resolution between client and freelancer
- Properties: escrow, reason, votesClient, votesFreelancer, status
- Functions: addVote(), canResolve(), getWinner()

#### **Reputation**
- User's rating and stats
- Properties: user, totalRating, reviewCount, completedJobs, totalEarned
- Functions: getAverageRating(), addReview(), incrementJobsCompleted()

#### **Review**
- Individual rating after job completion
- Properties: job, reviewer, reviewee, rating, comment
- Functions: isPositive(), validate()

---

### 2. Services / Hooks (Blue)
React hooks that interact with Solana blockchain:

#### **useJobs**
Main job management hook:
- `createJob()` - Post new job
- `submitBid()` - Submit proposal
- `selectBid()` - Choose winning bid
- `fetchJob()` - Get job details
- `fetchAllJobs()` - List all jobs
- `fetchJobBids()` - Get bids for job
- `cancelJob()` - Cancel job posting

#### **useEscrow**
Payment and dispute management:
- `depositEscrow()` - Lock funds
- `submitWork()` - Upload deliverables
- `releaseEscrow()` - Release payment
- `openDispute()` - Start dispute
- `voteDispute()` - Vote on dispute
- `resolveDispute()` - Finalize dispute

#### **useReputation**
User ratings and reviews:
- `initializeReputation()` - Create reputation account
- `submitReview()` - Rate user after job
- `fetchReputation()` - Get user stats
- `fetchUserReviews()` - Get user reviews
- `getAverageRating()` - Calculate rating

#### **useIPFS**
File storage (IPFS/Pinata):
- `upload()` - Upload JSON data
- `uploadFile()` - Upload file
- `fetch()` - Retrieve from IPFS
- `getImageUrl()` - Get image URL

#### **useSolanaProgram**
Core Solana connection:
- `getProgram()` - Get Anchor program
- `getProvider()` - Get Solana provider
- `getConnection()` - Get RPC connection
- `getWallet()` - Get user wallet

#### **useNotifications**
In-app notifications:
- `addNotification()` - Create notification
- `markAsRead()` - Mark as read
- `markAllAsRead()` - Mark all read
- `deleteNotification()` - Remove notification
- `getUnreadCount()` - Count unread

---

### 3. Utilities (Yellow)

#### **PDADerivation**
Generate deterministic addresses for Solana accounts:
- `deriveJobPDA()` - Get job account address
- `deriveBidPDA()` - Get bid account address
- `deriveEscrowPDA()` - Get escrow account address
- `deriveDisputePDA()` - Get dispute account address
- `deriveReputationPDA()` - Get reputation account address
- `deriveReviewPDA()` - Get review account address

#### **IPFSClient**
Pinata/IPFS integration:
- `uploadToIPFS()` - Upload data
- `uploadFileToIPFS()` - Upload file
- `fetchFromIPFS()` - Retrieve data
- `getGatewayUrl()` - Get public URL
- `pinJSONToIPFS()` - Pin JSON data

#### **SolanaHelper**
Blockchain utilities:
- `confirmTransaction()` - Wait for confirmation
- `getBalance()` - Get SOL balance
- `airdrop()` - Request devnet SOL
- `sendTransaction()` - Send transaction
- `formatPublicKey()` - Format address
- `lamportsToSol()` - Convert units
- `solToLamports()` - Convert units

#### **DateHelper**
Date/time utilities:
- `formatDate()` - Format timestamp
- `formatRelativeTime()` - "2 hours ago"
- `getTimeRemaining()` - "3 days left"
- `isExpired()` - Check deadline
- `addDays()` - Add days to date

---

### 4. React Components (Yellow)

#### **JobCard**
Display job listing:
- Props: job, onClick
- Shows title, budget, deadline, status

#### **BidForm**
Submit bid proposal:
- Props: jobId, onSubmit
- Validates amount, timeline, proposal

#### **EscrowStatus**
Show escrow state:
- Props: escrow, workSubmission
- Displays status, progress

#### **DisputeCard**
Dispute voting interface:
- Props: dispute, onVote
- Shows votes, allows voting

#### **ProfileCard**
User profile display:
- Props: reputation, reviews
- Shows rating, stats, reviews

---

## Data Flow Examples

### Creating a Job
```
1. User fills JobForm component
2. Component calls useJobs.createJob()
3. useJobs uses PDADerivation.deriveJobPDA()
4. useJobs calls Solana program to create Job
5. Job entity created on blockchain
6. Component updates UI with new Job
```

### Submitting Work
```
1. Freelancer uploads file in DeliverableSubmit component
2. Component calls useIPFS.uploadFile()
3. IPFS returns hash
4. Component calls useEscrow.submitWork(escrowId, hash)
5. WorkSubmission entity created on blockchain
6. Client receives notification
```

### Resolving Dispute
```
1. Voters see DisputeCard component
2. Each voter calls useEscrow.voteDispute()
3. VoteRecord entities created on blockchain
4. Dispute.votesClient and votesFreelancer updated
5. When resolved, useEscrow.resolveDispute() called
6. Funds released to winner
7. Both parties notified
```

---

## Key Relationships

### Job Lifecycle
```
Job → Bid (many) → Selected Bid
  ↓
Escrow (1) → WorkSubmission (1)
  ↓
Either: Release Payment OR Dispute
  ↓
Review (2: one from each party)
  ↓
Reputation updated for both users
```

### Entity Relationships
- **1 Job has many Bids** (0 to many)
- **1 Job has 1 Escrow** (0 or 1)
- **1 Escrow has 1 WorkSubmission** (0 or 1)
- **1 Escrow has 1 Dispute** (0 or 1)
- **1 Dispute has many VoteRecords** (0 to many)
- **1 Job has many Reviews** (0 to 2, one from each party)
- **1 User has 1 Reputation** (exactly 1)

---

## Function Categories

### Create Functions
- `useJobs.createJob()` - Create job
- `useJobs.submitBid()` - Create bid
- `useEscrow.depositEscrow()` - Create escrow
- `useEscrow.submitWork()` - Create work submission
- `useEscrow.openDispute()` - Create dispute
- `useReputation.submitReview()` - Create review

### Fetch Functions
- `useJobs.fetchJob()` - Get single job
- `useJobs.fetchAllJobs()` - Get all jobs
- `useJobs.fetchJobBids()` - Get job's bids
- `useEscrow.fetchEscrow()` - Get escrow details
- `useEscrow.fetchDispute()` - Get dispute details
- `useReputation.fetchReputation()` - Get user reputation
- `useReputation.fetchUserReviews()` - Get user reviews

### Update Functions
- `useJobs.selectBid()` - Update job status
- `useEscrow.releaseEscrow()` - Update escrow status
- `useEscrow.voteDispute()` - Update dispute votes
- `useEscrow.resolveDispute()` - Update dispute status

### Validation Functions
- `Job.validate()` - Validate job data
- `Bid.validate()` - Validate bid data
- `Escrow.validate()` - Validate escrow data
- `Review.validate()` - Validate review data

---

## Status Enums

### JobStatus
- `OPEN` - Accepting bids
- `IN_PROGRESS` - Freelancer working
- `COMPLETED` - Work accepted
- `DISPUTED` - In dispute
- `CANCELLED` - Job cancelled

### BidStatus
- `PENDING` - Waiting for decision
- `ACCEPTED` - Bid selected
- `REJECTED` - Bid rejected

### DisputeStatus
- `OPEN` - Voting in progress
- `RESOLVED_CLIENT` - Client won
- `RESOLVED_FREELANCER` - Freelancer won

---

## Common Use Cases

### Post a Job
```typescript
const { createJob } = useJobs()
const jobId = await createJob(
  "Senior React Developer",
  "Need help with Next.js app",
  5000, // budget in lamports
  Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days deadline
)
```

### Submit a Bid
```typescript
const { submitBid } = useJobs()
const bidId = await submitBid(
  jobId,
  4500, // amount
  5, // 5 days timeline
  "I have 10 years experience with React..." // proposal
)
```

### Deposit Escrow
```typescript
const { depositEscrow } = useEscrow()
const escrowId = await depositEscrow(jobId, 4500)
```

### Submit Work
```typescript
const { uploadFile } = useIPFS()
const { submitWork } = useEscrow()

const ipfsHash = await uploadFile(file)
await submitWork(escrowId, ipfsHash, "Project completed")
```

### Release Payment
```typescript
const { releaseEscrow } = useEscrow()
await releaseEscrow(escrowId)
```

### Submit Review
```typescript
const { submitReview } = useReputation()
await submitReview(
  jobId,
  freelancerAddress,
  5, // rating out of 5
  "Great work, very professional!"
)
```

---

## File Structure

```
src/
├── types/
│   ├── Job.ts
│   ├── Bid.ts
│   ├── Escrow.ts
│   ├── Dispute.ts
│   └── Reputation.ts
│
├── hooks/
│   ├── useJobs.ts
│   ├── useEscrow.ts
│   ├── useReputation.ts
│   ├── useIPFS.ts
│   ├── useSolanaProgram.ts
│   └── useNotifications.ts
│
├── utils/
│   ├── pda.ts (PDADerivation)
│   ├── solana.ts (SolanaHelper)
│   └── date.ts (DateHelper)
│
├── services/
│   └── ipfs.ts (IPFSClient)
│
└── components/
    ├── JobCard.tsx
    ├── BidForm.tsx
    ├── EscrowStatus.tsx
    ├── DisputeCard.tsx
    └── ProfileCard.tsx
```

---

## Summary

This class diagram shows:

✅ **8 Core Entities** - Job, Bid, Escrow, WorkSubmission, Dispute, VoteRecord, Reputation, Review
✅ **6 Service Hooks** - useJobs, useEscrow, useReputation, useIPFS, useSolanaProgram, useNotifications
✅ **4 Utility Classes** - PDADerivation, IPFSClient, SolanaHelper, DateHelper
✅ **5 React Components** - JobCard, BidForm, EscrowStatus, DisputeCard, ProfileCard
✅ **3 Status Enums** - JobStatus, BidStatus, DisputeStatus

**Total: 50+ functions** covering the entire job marketplace lifecycle from posting to payment to reviews!
