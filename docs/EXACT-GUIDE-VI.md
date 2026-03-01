# Class Diagram - Đúng Theo Code Thực Tế

## Xem Diagram

**Online (Dễ nhất):**
1. Vào https://www.plantuml.com/plantuml/uml/
2. Copy nội dung file `class-diagram-exact.puml`
3. Paste và xem

---

## So Sánh Với Code Thực Tế ✅

### 1. Job (Smart Contract: lib.rs dòng 609-625)
```rust
pub struct Job {
    pub client: Pubkey,              // ✅ Khớp
    pub title: String,               // ✅ Khớp
    pub description: String,         // ✅ Khớp
    pub budget: u64,                 // ✅ Khớp
    pub metadata_uri: String,        // ✅ Khớp (không phải ipfsHash)
    pub status: JobStatus,           // ✅ Khớp
    pub selected_freelancer: Option<Pubkey>, // ✅ Khớp
    pub created_at: i64,             // ✅ Khớp
    pub updated_at: i64,             // ✅ Khớp
    pub bid_count: u32,              // ✅ Khớp
    pub escrow_amount: u64,          // ✅ Khớp
    pub bump: u8,                    // ✅ Khớp
}
```

### 2. Bid (Smart Contract: lib.rs dòng 627-639)
```rust
pub struct Bid {
    pub job: Pubkey,                 // ✅ Khớp
    pub freelancer: Pubkey,          // ✅ Khớp (không phải bidder)
    pub proposed_budget: u64,        // ✅ Khớp (không phải amount)
    pub proposal: String,            // ✅ Khớp (không phải coverLetter)
    pub timeline_days: u16,          // ✅ Khớp (không phải estimatedDuration)
    pub status: BidStatus,           // ✅ Khớp
    pub created_at: i64,             // ✅ Khớp
    pub bump: u8,                    // ✅ Khớp
}
```

### 3. Escrow (Smart Contract: lib.rs dòng 641-653)
```rust
pub struct Escrow {
    pub job: Pubkey,                 // ✅ Khớp
    pub client: Pubkey,              // ✅ Khớp
    pub freelancer: Pubkey,          // ✅ Khớp
    pub amount: u64,                 // ✅ Khớp
    pub locked: bool,                // ✅ Khớp (không phải deposited)
    pub released: bool,              // ✅ Khớp
    pub disputed: bool,              // ✅ Khớp
    pub created_at: i64,             // ✅ Khớp
    pub bump: u8,                    // ✅ Khớp
}
```

### 4. WorkSubmission (Smart Contract: lib.rs dòng 655-665)
```rust
pub struct WorkSubmission {
    pub job: Pubkey,                 // ✅ Khớp
    pub freelancer: Pubkey,          // ✅ Khớp
    pub deliverable_uri: String,     // ✅ Khớp (không phải ipfsHash)
    pub submitted_at: i64,           // ✅ Khớp
    pub approved: bool,              // ✅ Khớp (có thêm field này)
    pub bump: u8,                    // ✅ Khớp
}
```

### 5. Dispute (Smart Contract: lib.rs dòng 667-683)
```rust
pub struct Dispute {
    pub job: Pubkey,                 // ✅ Khớp
    pub escrow: Pubkey,              // ✅ Khớp
    pub client: Pubkey,              // ✅ Khớp
    pub freelancer: Pubkey,          // ✅ Khớp
    pub initiator: Pubkey,           // ✅ Khớp (có thêm field này)
    pub reason: String,              // ✅ Khớp
    pub status: DisputeStatus,       // ✅ Khớp
    pub votes_for_client: u32,       // ✅ Khớp (không phải votesClient)
    pub votes_for_freelancer: u32,   // ✅ Khớp (không phải votesFreelancer)
    pub created_at: i64,             // ✅ Khớp
    pub resolved_at: Option<i64>,    // ✅ Khớp
    pub bump: u8,                    // ✅ Khớp
}
```

### 6. VoteRecord (Smart Contract: lib.rs dòng 685-693)
```rust
pub struct VoteRecord {
    pub dispute: Pubkey,             // ✅ Khớp
    pub voter: Pubkey,               // ✅ Khớp
    pub vote_for_client: bool,       // ✅ Khớp (không phải votedForClient)
    pub voted_at: i64,               // ✅ Khớp
    pub bump: u8,                    // ✅ Khớp
}
```

### 7. Reputation (Smart Contract: lib.rs dòng 695-704)
```rust
pub struct Reputation {
    pub user: Pubkey,                // ✅ Khớp
    pub total_reviews: u32,          // ✅ Khớp (không phải reviewCount)
    pub average_rating: f32,         // ✅ Khớp (không phải totalRating)
    pub completed_jobs: u32,         // ✅ Khớp
    pub total_earned: u64,           // ✅ Khớp
    pub bump: u8,                    // ✅ Khớp
}
```

### 8. Review (Smart Contract: lib.rs dòng 706-717)
```rust
pub struct Review {
    pub job: Pubkey,                 // ✅ Khớp
    pub reviewer: Pubkey,            // ✅ Khớp
    pub reviewee: Pubkey,            // ✅ Khớp
    pub rating: u8,                  // ✅ Khớp
    pub comment: String,             // ✅ Khớp
    pub created_at: i64,             // ✅ Khớp
    pub bump: u8,                    // ✅ Khớp
}
```

### 9. UserProfile (Frontend: src/types/index.ts dòng 97-107)
```typescript
interface UserProfile {
    address: Address,                // ✅ Khớp
    name?: string,                   // ✅ Khớp
    bio?: string,                    // ✅ Khớp
    avatarUrl?: string,              // ✅ Khớp
    skills?: string[],               // ✅ Khớp
    hourlyRate?: bigint,             // ✅ Khớp
    reputation: UserReputation,      // ✅ Khớp
    isFreelancer: boolean,           // ✅ Khớp
    isClient: boolean,               // ✅ Khớp
}
```

---

## Enums (Smart Contract: lib.rs dòng 719-742)

### JobStatus ✅
```rust
pub enum JobStatus {
    Open,           // ✅
    InProgress,     // ✅
    Completed,      // ✅
    Disputed,       // ✅
    Cancelled,      // ✅
}
```

### BidStatus ✅
```rust
pub enum BidStatus {
    Pending,        // ✅
    Accepted,       // ✅
    Rejected,       // ✅
}
```

### DisputeStatus ✅
```rust
pub enum DisputeStatus {
    Open,               // ✅
    ResolvedClient,     // ✅
    ResolvedFreelancer, // ✅
}
```

---

## Quan Hệ Giữa Các Lớp

### 1. Job là trung tâm
```
Job (1) ──── (0..*) Bid          // Một job nhiều bids
Job (1) ──── (0..1) Escrow       // Một job một escrow
Job (1) ──── (0..1) WorkSubmission // Một job một submission
Job (1) ──── (0..*) Review       // Một job nhiều reviews (max 2)
```

### 2. Escrow và Dispute
```
Escrow (1) ──── (0..1) Dispute   // Một escrow có thể có một dispute
Dispute (1) ──── (0..*) VoteRecord // Một dispute nhiều votes
```

### 3. User và Reputation
```
UserProfile (1) ──── (1) Reputation  // Một user một reputation
Review (0..*) ──── (1) UserProfile   // Nhiều reviews cho một user
```

---

## Functions Thực Tế (Smart Contract)

### Job Manager (3 functions)
```rust
1. create_job(job_id, title, description, budget, metadata_uri)
   → Tạo job mới

2. submit_bid(proposed_budget, proposal, timeline_days)
   → Gửi bid cho job

3. select_bid()
   → Chọn bid thắng
```

### Escrow Manager (3 functions)
```rust
4. deposit_escrow(amount)
   → Gửi tiền vào escrow

5. release_escrow()
   → Giải ngân cho freelancer

6. submit_work(deliverable_uri)
   → Nộp bài hoàn thành
```

### Dispute Manager (3 functions)
```rust
7. open_dispute(reason)
   → Mở tranh chấp

8. vote_dispute(vote_for_client)
   → Vote cho client hoặc freelancer

9. resolve_dispute()
   → Giải quyết tranh chấp
```

### Reputation Manager (2 functions)
```rust
10. initialize_reputation()
    → Tạo reputation account

11. submit_review(rating, comment)
    → Đánh giá sau khi hoàn thành
```

**Tổng: 11 functions chính**

---

## Luồng Hoạt Động Thực Tế

### 1. Đăng Job
```
Client → create_job()
→ Job {status: Open, bid_count: 0}
```

### 2. Gửi Bid
```
Freelancer → submit_bid(job_pda, budget, proposal, days)
→ Bid {status: Pending}
→ Job {bid_count++}
```

### 3. Chọn Bid
```
Client → select_bid(bid_pda)
→ Job {status: InProgress, selected_freelancer: freelancer_pubkey}
→ Bid {status: Accepted}
```

### 4. Gửi Escrow
```
Client → deposit_escrow(job_pda, amount)
→ Escrow {locked: true, released: false, disputed: false}
→ Chuyển SOL từ client vào escrow PDA
```

### 5. Nộp Bài
```
Freelancer → submit_work(job_pda, "ipfs://...")
→ WorkSubmission {approved: false, deliverable_uri: "ipfs://..."}
```

### 6. Giải Ngân
```
Client → release_escrow()
→ Escrow {released: true, locked: false}
→ Job {status: Completed}
→ Chuyển SOL từ escrow PDA vào freelancer
```

### 7. Review
```
Client → submit_review(job_pda, freelancer_pubkey, 5, "Tốt")
→ Review {rating: 5}
→ Reputation {total_reviews++, average_rating update}

Freelancer → submit_review(job_pda, client_pubkey, 5, "Tốt")
→ Review {rating: 5}
→ Reputation {total_reviews++, average_rating update}
```

### 8. Tranh Chấp (nếu có)
```
Client hoặc Freelancer → open_dispute("Lý do...")
→ Dispute {status: Open, votes_for_client: 0, votes_for_freelancer: 0}
→ Escrow {disputed: true}
→ Job {status: Disputed}

Voters → vote_dispute(true/false)
→ VoteRecord {vote_for_client: true/false}
→ Dispute {votes_for_client++ hoặc votes_for_freelancer++}

System → resolve_dispute()
→ Dispute {status: ResolvedClient hoặc ResolvedFreelancer}
→ Chuyển SOL cho người thắng
```

---

## Ví Dụ Code Thực Tế

### Từ useJobs.ts (dòng 52-79)
```typescript
const createJob = async (
  title: string,
  description: string,
  budgetSol: number,
  metadataUri: string
) => {
  const jobId = Date.now()
  const [jobPda] = deriveJobPDA(publicKey, jobId)
  const budget = new BN(budgetSol)

  const tx = await program.methods
    .createJob(new BN(jobId), title, description, budget, metadataUri)
    .accounts({
      job: jobPda,
      client: publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc()

  return { signature: tx, jobPda }
}
```

### Từ useJobs.ts (dòng 84-110)
```typescript
const submitBid = async (
  jobPda: PublicKey,
  proposedBudgetSol: number,
  proposal: string,
  timelineDays: number
) => {
  const [bidPda] = deriveBidPDA(jobPda, publicKey)
  const proposedBudget = new BN(proposedBudgetSol * LAMPORTS_PER_SOL)

  const tx = await program.methods
    .submitBid(proposedBudget, proposal, timelineDays)
    .accounts({
      bid: bidPda,
      job: jobPda,
      freelancer: publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc()

  return { signature: tx, bidPda }
}
```

---

## Sự Khác Biệt Quan Trọng

### ❌ Class Diagram Cũ (SAI)
```
- User class (KHÔNG TỒN TẠI trong code)
- Bid có field "amount" → SAI (phải là proposed_budget)
- Bid có field "timeline" → SAI (phải là timeline_days)
- Escrow có field "deposited" → SAI (phải là locked)
- Dispute có field "votesClient" → SAI (phải là votes_for_client)
- Reputation có field "totalRating" → SAI (phải là average_rating)
```

### ✅ Class Diagram Mới (ĐÚNG)
```
- Không có User class, chỉ có UserProfile
- Bid có proposed_budget (u64)
- Bid có timeline_days (u16)
- Escrow có locked (bool)
- Dispute có votes_for_client (u32)
- Reputation có average_rating (f32)
- WorkSubmission có approved (bool)
- Dispute có initiator (Pubkey)
```

---

## Tổng Kết

✅ **9 Classes chính** (đúng theo smart contract)
✅ **3 Enums** (JobStatus, BidStatus, DisputeStatus)
✅ **11 Functions** (tất cả instructions trong smart contract)
✅ **100% khớp** với code thực tế trong lib.rs và types

**Diagram này hoàn toàn chính xác theo code của bạn!** 🎯
