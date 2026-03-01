# UML Diagrams - Decentralized Freelance Marketplace

This directory contains comprehensive UML diagrams for the Decentralized Freelance Marketplace graduation project.

## Table of Contents

1. [Use Case Diagram](./use-case-diagram.md) - User interactions and system features
2. [Class Diagram](./class-diagram.md) - Smart contract architecture and data models
3. [Sequence Diagram](./sequence-diagram.md) - Process flows and interactions

## System Overview

### Multi-Role Architecture

**IMPORTANT**: In this decentralized system, one wallet address can serve multiple roles:

- **Client Role**: When posting jobs and hiring freelancers
- **Freelancer Role**: When bidding on and completing jobs
- **Arbitrator Role**: When voting on disputes (requires rating >= 4.0 and reviews >= 5)

**Example**:
```
Alice's Wallet: 7xKx...9Qp2
- Posts a job as CLIENT → "Need mobile app developer"
- Bids on a design job as FREELANCER → "I can design your logo"
- Votes on a dispute as ARBITRATOR → Has 4.8 rating with 20 reviews
```

The role is determined by the **action being performed**, not by a fixed user type.

### Core Architecture Components

#### 1. Smart Contract Layer (Solana/Rust)
- **JobManager**: Job posting, bidding, selection
- **EscrowManager**: Payment locking, release, work submission
- **DisputeManager**: Dispute opening, voting, resolution
- **ReputationManager**: Reviews, ratings, on-chain reputation

#### 2. Storage Layer
- **On-chain**: All transaction data, reputation, reviews
- **IPFS**: Job metadata, portfolios, work deliverables

#### 3. Frontend Layer
- **React.js**: User interface
- **Wallet Integration**: Phantom/MetaMask for authentication
- **Web3 SDK**: Blockchain interaction

## Diagram Summaries

### 1. Use Case Diagram
**Purpose**: Shows all possible interactions between users and the system

**Key Features**:
- 9 Client use cases (post job, deposit, approve, review, etc.)
- 9 Freelancer use cases (browse, bid, submit work, receive payment, etc.)
- 5 Arbitrator use cases (view disputes, vote, earn fees)
- 6 System functions (manage jobs, escrow, payments, reputation, disputes, IPFS)

**Important Notes**:
- All roles require wallet connection
- Arbitrator role is **earned** through reputation (not assigned)
- Same wallet can perform all roles in different contexts

### 2. Class Diagram
**Purpose**: Illustrates the smart contract structure and relationships

**State Accounts** (8 types):
1. **Job**: Job posting data
2. **Bid**: Freelancer proposals
3. **Escrow**: Payment lockbox
4. **WorkSubmission**: Deliverables
5. **Dispute**: Dispute cases
6. **VoteRecord**: Arbitrator votes
7. **Reputation**: User reputation (per wallet)
8. **Review**: Ratings and comments

**Enums**:
- JobStatus: Open, InProgress, Completed, Disputed, Cancelled
- BidStatus: Pending, Accepted, Rejected
- DisputeStatus: Open, ResolvedClient, ResolvedFreelancer

**Events**: 10 event types for blockchain indexing

**Constraints**:
- Arbitrator eligibility: `average_rating >= 4.0` AND `total_reviews >= 5`
- Cannot vote on disputes you're involved in
- Minimum 5 votes required to resolve disputes

### 3. Sequence Diagrams
**Purpose**: Shows step-by-step process flows

**Three Main Flows**:

#### Flow 1: Happy Path (Complete Job)
```
Client posts job → Freelancers bid → Client selects →
Client deposits escrow → Freelancer submits work →
Client approves → Payment auto-released → Both review
```
**Duration**: Minutes (instant payment upon approval)

#### Flow 2: Dispute Resolution
```
Dispute opened → Funds locked → Arbitrators vote →
5+ votes collected → Smart contract auto-resolves →
Funds to winner → Arbitrators receive fee (2-5%)
```
**Duration**: 24-72 hours (depends on arbitrator participation)

#### Flow 3: Reputation Building
```
User connects wallet → Initialize reputation →
Complete jobs → Receive reviews → Reputation grows →
Eligible for arbitrator role
```

## Key Smart Contract Functions

### Job Management
```rust
create_job(job_id, title, description, budget, metadata_uri)
submit_bid(proposed_budget, proposal, timeline_days)
select_bid(bid_id)
```

### Escrow Management
```rust
deposit_escrow(amount)
release_escrow() // Client approves work
submit_work(deliverable_uri)
```

### Dispute Resolution
```rust
open_dispute(reason)
vote_dispute(vote_for_client: bool)
resolve_dispute() // Requires 5+ votes
```

### Reputation System
```rust
initialize_reputation() // Once per wallet
submit_review(rating, comment) // After job completion
```

## Data Model

### Program Derived Addresses (PDAs)

All accounts use deterministic seeds for security:

| Account | Seeds | Example |
|---------|-------|---------|
| Job | `["job", client, job_id]` | Unique per client + job_id |
| Bid | `["bid", job, freelancer]` | One bid per freelancer per job |
| Escrow | `["escrow", job]` | One escrow per job |
| Work | `["work", job]` | One submission per job |
| Dispute | `["dispute", job]` | One dispute per job |
| Vote | `["vote", dispute, voter]` | One vote per arbitrator |
| Reputation | `["reputation", user]` | One per wallet address |
| Review | `["review", job, reviewer]` | One review per party per job |

### Reputation Calculation

```typescript
// When new review is submitted
current_total = (average_rating * total_reviews) + new_rating
total_reviews += 1
average_rating = current_total / total_reviews
```

**Example**:
```
Initial: 4.5 ⭐ (20 reviews)
New review: 5 ⭐
Result: ((4.5 × 20) + 5) / 21 = 4.52 ⭐ (21 reviews)
```

## System Benefits

### vs Traditional Platforms (Upwork/Fiverr)

| Feature | Traditional | Decentralized |
|---------|-------------|---------------|
| **Fees** | 20% + 3% | ~0-2% (gas only) |
| **Payment Speed** | 7-14 days | Instant (seconds) |
| **Data Ownership** | Platform owns | User owns (wallet) |
| **Account Lock** | Platform decides | Impossible to lock |
| **Dispute Resolution** | Platform bias | Community voting |
| **Reputation** | Lost if you leave | Permanent on-chain |

### Security Features

1. **Escrow Pattern**: Funds locked in smart contract, not controlled by any party
2. **Transparent Voting**: All dispute votes recorded on-chain
3. **Reputation-Gated**: Only trusted users (4.0+ rating) can arbitrate
4. **Conflict Prevention**: Cannot vote on own disputes
5. **Minimum Threshold**: 5+ votes prevents manipulation
6. **Immutable History**: All reviews permanently on-chain

## File Structure

```
diagrams/
├── README.md                    # This file
├── use-case-diagram.md         # User interactions
├── class-diagram.md            # Smart contract structure
└── sequence-diagram.md         # Process flows
```

## How to View Diagrams

### Option 1: PlantUML Online
1. Go to http://www.plantuml.com/plantuml/uml/
2. Copy the PlantUML code from any `.md` file
3. Paste and generate

### Option 2: VSCode Extension
1. Install "PlantUML" extension
2. Open any diagram `.md` file
3. Press `Alt+D` to preview

### Option 3: PlantUML CLI
```bash
# Install PlantUML
brew install plantuml  # macOS
apt-get install plantuml  # Ubuntu

# Generate PNG
plantuml diagrams/use-case-diagram.md
plantuml diagrams/class-diagram.md
plantuml diagrams/sequence-diagram.md
```

## Project Context

These diagrams are part of the graduation thesis:
**"Decentralized Freelance Marketplace using Blockchain Technology"**

**Technology Stack**:
- **Blockchain**: Solana (Devnet)
- **Smart Contract**: Rust (Anchor framework)
- **Storage**: IPFS/Arweave
- **Frontend**: React.js + Solana Web3.js
- **Wallet**: Phantom/MetaMask

**Project Goals**:
1. ✅ Eliminate intermediary fees (save 90%)
2. ✅ Enable instant payments via smart contracts
3. ✅ Create transparent, community-driven dispute resolution
4. ✅ Build portable, on-chain reputation system
5. ✅ Give users full data ownership

## Implementation Phases

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| 1. Research & Design | Week 1-2 | These diagrams + architecture |
| 2. Smart Contracts | Week 3-5 | Rust programs + tests |
| 3. Backend API | Week 6-7 | Node.js indexer + API |
| 4. Frontend UI | Week 8-10 | React app + wallet integration |
| 5. Testing & Deploy | Week 11-12 | Devnet deployment + docs |

## Notes for Thesis

### Key Points to Emphasize

1. **Multi-Role Flexibility**:
   - Traditional platforms force users into fixed roles
   - Our system allows dynamic role-switching based on actions
   - Same wallet = Client + Freelancer + Arbitrator

2. **Decentralization Benefits**:
   - No single point of failure
   - No single point of control
   - User sovereignty over data and reputation

3. **Economic Incentives**:
   - Lower fees attract users from traditional platforms
   - Arbitrators earn fees for participation
   - Reputation becomes valuable, portable asset

4. **Technical Innovation**:
   - Program Derived Addresses (PDAs) for security
   - Event-driven architecture for real-time updates
   - On-chain reputation eliminates fake reviews

### Potential Extensions

- **Token Economics**: Platform governance token
- **Staking**: Stake tokens to become arbitrator
- **Insurance Pool**: Protect against failed disputes
- **Skill Verification**: On-chain skill certificates
- **DAO Governance**: Community decides platform rules

## References

- [Solana Documentation](https://docs.solana.com/)
- [Anchor Framework](https://www.anchor-lang.com/)
- [IPFS Documentation](https://docs.ipfs.tech/)
- [Web3.js Documentation](https://solana-labs.github.io/solana-web3.js/)

---

**Last Updated**: 2025-11-13
**Version**: 1.0
**Author**: [Your Name]
**Advisor**: [Advisor Name]
