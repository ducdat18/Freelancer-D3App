# Class Diagram - Decentralized Freelance Marketplace

## Smart Contract Architecture

This diagram shows the structure of the Solana smart contract program including all state accounts, their relationships, and the main program functions.

## PlantUML Diagram

```plantuml
@startuml
skinparam classAttributeIconSize 0
skinparam linetype ortho

' Main Program
class FreelanceMarketplace <<Program>> {
  ' Job Manager Functions
  + create_job()
  + submit_bid()
  + select_bid()

  ' Escrow Manager Functions
  + deposit_escrow()
  + release_escrow()
  + submit_work()

  ' Dispute Manager Functions
  + open_dispute()
  + vote_dispute()
  + resolve_dispute()

  ' Reputation Manager Functions
  + initialize_reputation()
  + submit_review()
}

' ========== STATE ACCOUNTS ==========

class Job {
  + client: Pubkey
  + title: String (max 100)
  + description: String (max 500)
  + budget: u64
  + metadata_uri: String (max 200)
  + status: JobStatus
  + selected_freelancer: Option<Pubkey>
  + created_at: i64
  + updated_at: i64
  + bid_count: u32
  + escrow_amount: u64
  + bump: u8
}

class Bid {
  + job: Pubkey
  + freelancer: Pubkey
  + proposed_budget: u64
  + proposal: String (max 500)
  + timeline_days: u16
  + status: BidStatus
  + created_at: i64
  + bump: u8
}

class Escrow {
  + job: Pubkey
  + client: Pubkey
  + freelancer: Pubkey
  + amount: u64
  + locked: bool
  + released: bool
  + disputed: bool
  + created_at: i64
  + bump: u8
}

class WorkSubmission {
  + job: Pubkey
  + freelancer: Pubkey
  + deliverable_uri: String (max 200)
  + submitted_at: i64
  + approved: bool
  + bump: u8
}

class Dispute {
  + job: Pubkey
  + escrow: Pubkey
  + client: Pubkey
  + freelancer: Pubkey
  + initiator: Pubkey
  + reason: String (max 500)
  + status: DisputeStatus
  + votes_for_client: u32
  + votes_for_freelancer: u32
  + created_at: i64
  + resolved_at: Option<i64>
  + bump: u8
}

class VoteRecord {
  + dispute: Pubkey
  + voter: Pubkey
  + vote_for_client: bool
  + voted_at: i64
  + bump: u8
}

class Reputation {
  + user: Pubkey
  + total_reviews: u32
  + average_rating: f32
  + completed_jobs: u32
  + total_earned: u64
  + bump: u8
}

class Review {
  + job: Pubkey
  + reviewer: Pubkey
  + reviewee: Pubkey
  + rating: u8
  + comment: String (max 300)
  + created_at: i64
  + bump: u8
}

' ========== ENUMS ==========

enum JobStatus {
  Open
  InProgress
  Completed
  Disputed
  Cancelled
}

enum BidStatus {
  Pending
  Accepted
  Rejected
}

enum DisputeStatus {
  Open
  ResolvedClient
  ResolvedFreelancer
}

' ========== EVENTS ==========

class JobCreated <<Event>> {
  + job: Pubkey
  + client: Pubkey
  + budget: u64
  + timestamp: i64
}

class BidSubmitted <<Event>> {
  + bid: Pubkey
  + job: Pubkey
  + freelancer: Pubkey
  + proposed_budget: u64
  + timestamp: i64
}

class BidAccepted <<Event>> {
  + bid: Pubkey
  + job: Pubkey
  + freelancer: Pubkey
  + timestamp: i64
}

class EscrowDeposited <<Event>> {
  + escrow: Pubkey
  + job: Pubkey
  + amount: u64
  + timestamp: i64
}

class EscrowReleased <<Event>> {
  + escrow: Pubkey
  + job: Pubkey
  + freelancer: Pubkey
  + amount: u64
  + timestamp: i64
}

class WorkSubmitted <<Event>> {
  + job: Pubkey
  + freelancer: Pubkey
  + deliverable_uri: String
  + timestamp: i64
}

class DisputeOpened <<Event>> {
  + dispute: Pubkey
  + job: Pubkey
  + initiator: Pubkey
  + timestamp: i64
}

class DisputeVoted <<Event>> {
  + dispute: Pubkey
  + voter: Pubkey
  + vote_for_client: bool
}

class DisputeResolved <<Event>> {
  + dispute: Pubkey
  + winner_is_client: bool
  + timestamp: i64
}

class ReviewSubmitted <<Event>> {
  + review: Pubkey
  + job: Pubkey
  + reviewer: Pubkey
  + reviewee: Pubkey
  + rating: u8
  + timestamp: i64
}

' ========== RELATIONSHIPS ==========

' Program manages all accounts
FreelanceMarketplace ..> Job : manages
FreelanceMarketplace ..> Bid : manages
FreelanceMarketplace ..> Escrow : manages
FreelanceMarketplace ..> WorkSubmission : manages
FreelanceMarketplace ..> Dispute : manages
FreelanceMarketplace ..> VoteRecord : manages
FreelanceMarketplace ..> Reputation : manages
FreelanceMarketplace ..> Review : manages

' Job relationships
Job "1" *-- "0..*" Bid : has >
Job "1" -- "1" JobStatus : has
Job "1" o-- "0..1" Escrow : locked in >
Job "1" o-- "0..1" WorkSubmission : receives >
Job "1" o-- "0..1" Dispute : may have >

' Bid relationships
Bid "1" -- "1" BidStatus : has

' Escrow relationships
Escrow "1" o-- "0..1" Dispute : may have >

' Dispute relationships
Dispute "1" *-- "0..*" VoteRecord : has >
Dispute "1" -- "1" DisputeStatus : has

' Reputation relationships
Reputation "1" o-- "0..*" Review : receives >

' Review relationships
Review "1" -- "1" Job : about

' Event emissions
FreelanceMarketplace ..> JobCreated : emits
FreelanceMarketplace ..> BidSubmitted : emits
FreelanceMarketplace ..> BidAccepted : emits
FreelanceMarketplace ..> EscrowDeposited : emits
FreelanceMarketplace ..> EscrowReleased : emits
FreelanceMarketplace ..> WorkSubmitted : emits
FreelanceMarketplace ..> DisputeOpened : emits
FreelanceMarketplace ..> DisputeVoted : emits
FreelanceMarketplace ..> DisputeResolved : emits
FreelanceMarketplace ..> ReviewSubmitted : emits

' Notes
note right of Job
  Seeds: ["job", client, job_id]
  Job is created by Client
  and linked to selected Freelancer
end note

note right of Escrow
  Seeds: ["escrow", job]
  Holds payment until
  work is approved or
  dispute is resolved
end note

note right of Reputation
  Seeds: ["reputation", user]
  Permanent on-chain
  reputation that users own
end note

note right of Dispute
  Requires minimum 5 votes
  to resolve. Arbitrators must
  have rating >= 4.0 and
  total_reviews >= 5
end note

@enduml
```

## Component Descriptions

### Core Smart Contract Components

#### 1. Job Manager
- **Purpose**: Manages job lifecycle from creation to completion
- **Key Functions**:
  - `create_job()`: Creates new job posting
  - `submit_bid()`: Allows freelancers to bid
  - `select_bid()`: Client selects winning bid

#### 2. Escrow Manager
- **Purpose**: Handles payment locking and release
- **Key Functions**:
  - `deposit_escrow()`: Client deposits payment
  - `release_escrow()`: Release payment to freelancer
  - `submit_work()`: Freelancer submits deliverables

#### 3. Dispute Manager
- **Purpose**: Facilitates decentralized dispute resolution
- **Key Functions**:
  - `open_dispute()`: Initiate dispute
  - `vote_dispute()`: Arbitrators vote
  - `resolve_dispute()`: Execute resolution

#### 4. Reputation Manager
- **Purpose**: Tracks on-chain reputation
- **Key Functions**:
  - `initialize_reputation()`: Create reputation account
  - `submit_review()`: Submit rating and review

### State Accounts

All accounts use Program Derived Addresses (PDAs) with specific seeds:

| Account | Seeds | Description |
|---------|-------|-------------|
| Job | `["job", client, job_id]` | Job posting data |
| Bid | `["bid", job, freelancer]` | Freelancer proposal |
| Escrow | `["escrow", job]` | Payment lockbox |
| WorkSubmission | `["work", job]` | Deliverables |
| Dispute | `["dispute", job]` | Dispute case |
| VoteRecord | `["vote", dispute, voter]` | Arbitrator vote |
| Reputation | `["reputation", user]` | User reputation |
| Review | `["review", job, reviewer]` | Rating/review |

### Key Design Patterns

1. **Escrow Pattern**: Funds locked in smart contract until conditions met
2. **State Machine**: Jobs transition through defined states
3. **Event-Driven**: All actions emit events for indexing
4. **Reputation System**: Permanent on-chain reputation
5. **Decentralized Governance**: Community-driven dispute resolution

## Constraints and Validations

- Title: max 100 characters
- Description: max 500 characters
- Proposal: max 500 characters
- Comment: max 300 characters
- Rating: 1-5 stars
- Minimum votes for dispute: 5
- Arbitrator requirements: rating >= 4.0, reviews >= 5
