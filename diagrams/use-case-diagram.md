# Use Case Diagram - Decentralized Freelance Marketplace

## Actors
- **Client (Khách hàng)**: Person who posts jobs and hires freelancers
- **Freelancer**: Person who bids on and completes jobs
- **Arbitrator (Trọng tài)**: Community members who vote on disputes

## Use Cases

### Client Use Cases
1. **Connect Wallet**: Connect wallet (Phantom/MetaMask) to authenticate
2. **Post Job**: Create and publish a job with budget and description
3. **Deposit Escrow**: Deposit payment into smart contract escrow
4. **View Bids**: Browse and review freelancer proposals
5. **Select Freelancer**: Choose a winning bid and assign job
6. **Review Work**: Download and review submitted deliverables
7. **Approve Work**: Approve work to release payment
8. **Submit Review**: Rate and review freelancer
9. **Open Dispute**: Initiate dispute if not satisfied

### Freelancer Use Cases
1. **Connect Wallet**: Connect wallet to authenticate
2. **Browse Jobs**: Search and filter available jobs
3. **Submit Bid**: Create proposal with price and timeline
4. **Upload Portfolio**: Attach work samples via IPFS
5. **Submit Work**: Upload deliverables when job is assigned
6. **Receive Payment**: Get instant payment when work is approved
7. **Submit Review**: Rate and review client
8. **Build Reputation**: Accumulate on-chain reviews and ratings
9. **Open Dispute**: Initiate dispute if payment issues occur

### Arbitrator Use Cases
1. **Connect Wallet**: Connect wallet to authenticate
2. **View Disputes**: Browse open disputes
3. **Review Evidence**: Examine dispute details and evidence
4. **Vote on Dispute**: Cast vote for client or freelancer
5. **Earn Arbitration Fee**: Receive compensation for participation

## System Use Cases
- **Manage Jobs**: Create, update, track job status
- **Manage Escrow**: Lock, release, or refund payments
- **Process Payments**: Execute automatic payments via smart contract
- **Track Reputation**: Calculate and store on-chain reputation
- **Resolve Disputes**: Facilitate community-driven dispute resolution
- **Store on IPFS**: Store files and metadata on decentralized storage

## PlantUML Diagram

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle

actor Client as "Client\n(Khách hàng)"
actor Freelancer as "Freelancer"
actor Arbitrator as "Arbitrator\n(Trọng tài)"

rectangle "Decentralized Freelance Marketplace" {
  ' Client Use Cases
  usecase (Connect Wallet) as UC1
  usecase (Post Job) as UC2
  usecase (Deposit Escrow) as UC3
  usecase (View Bids) as UC4
  usecase (Select Freelancer) as UC5
  usecase (Review Work) as UC6
  usecase (Approve Work) as UC7
  usecase (Submit Review) as UC8C
  usecase (Open Dispute) as UC9C

  ' Freelancer Use Cases
  usecase (Browse Jobs) as UC10
  usecase (Submit Bid) as UC11
  usecase (Upload Portfolio) as UC12
  usecase (Submit Work) as UC13
  usecase (Receive Payment) as UC14
  usecase (Submit Review) as UC8F
  usecase (Build Reputation) as UC15
  usecase (Open Dispute) as UC9F

  ' Arbitrator Use Cases
  usecase (View Disputes) as UC16
  usecase (Review Evidence) as UC17
  usecase (Vote on Dispute) as UC18
  usecase (Earn Arbitration Fee) as UC19

  ' System Use Cases
  usecase (Manage Jobs) as SYS1
  usecase (Manage Escrow) as SYS2
  usecase (Process Payments) as SYS3
  usecase (Track Reputation) as SYS4
  usecase (Resolve Disputes) as SYS5
  usecase (Store on IPFS) as SYS6
}

' Client connections
Client --> UC1
Client --> UC2
Client --> UC3
Client --> UC4
Client --> UC5
Client --> UC6
Client --> UC7
Client --> UC8C
Client --> UC9C

' Freelancer connections
Freelancer --> UC1
Freelancer --> UC10
Freelancer --> UC11
Freelancer --> UC12
Freelancer --> UC13
Freelancer --> UC14
Freelancer --> UC8F
Freelancer --> UC15
Freelancer --> UC9F

' Arbitrator connections
Arbitrator --> UC1
Arbitrator --> UC16
Arbitrator --> UC17
Arbitrator --> UC18
Arbitrator --> UC19

' Include relationships
UC2 ..> SYS1 : <<include>>
UC2 ..> SYS6 : <<include>>
UC3 ..> SYS2 : <<include>>
UC5 ..> SYS1 : <<include>>
UC7 ..> SYS2 : <<include>>
UC7 ..> SYS3 : <<include>>
UC8C ..> SYS4 : <<include>>
UC8F ..> SYS4 : <<include>>
UC9C ..> SYS5 : <<include>>
UC9F ..> SYS5 : <<include>>
UC11 ..> SYS1 : <<include>>
UC12 ..> SYS6 : <<include>>
UC13 ..> SYS6 : <<include>>
UC14 ..> SYS3 : <<include>>
UC18 ..> SYS5 : <<include>>

' Extend relationships
UC7 ..> UC8C : <<extend>>
UC14 ..> UC8F : <<extend>>

@enduml
```

## Relationships

### Include Relationships
- Post Job includes Manage Jobs and Store on IPFS
- Deposit Escrow includes Manage Escrow
- Approve Work includes Manage Escrow and Process Payments
- Submit Review includes Track Reputation
- Submit Bid includes Manage Jobs
- Upload Portfolio includes Store on IPFS
- Submit Work includes Store on IPFS

### Extend Relationships
- Submit Review extends Approve Work (optional)
- Submit Review extends Receive Payment (optional)

## Notes
- All actors must Connect Wallet before performing any actions
- Reputation is permanently stored on-chain
- Payments are instant and automatic via smart contracts
- Disputes are resolved by community voting
- All files are stored on IPFS for decentralization
