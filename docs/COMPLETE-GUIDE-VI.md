# Class Diagram - Đầy Đủ Properties & Methods

## Xem Diagram

**Online:**
1. Vào https://www.plantuml.com/plantuml/uml/
2. Copy nội dung file `class-diagram-complete.puml`
3. Paste và xem

---

## Các Class Với Đầy Đủ Methods

### 1. Job

**Properties (12 fields):**
```
+ client: PublicKey
+ title: string
+ description: string
+ budget: u64
+ metadata_uri: string
+ status: JobStatus
+ selected_freelancer: Option<PublicKey>
+ created_at: i64
+ updated_at: i64
+ bid_count: u32
+ escrow_amount: u64
+ bump: u8
```

**Methods (7 functions):**
```
+ create(title, description, budget, metadata_uri): Job
  → Tạo job mới (smart contract: create_job)

+ addBid(): void
  → Tăng bid_count khi có bid mới

+ selectFreelancer(freelancer: PublicKey): void
  → Chọn freelancer (smart contract: select_bid)
  → Đổi status → InProgress

+ updateStatus(status: JobStatus): void
  → Cập nhật trạng thái job

+ cancel(): void
  → Hủy job, đổi status → Cancelled

+ isOpen(): boolean
  → Kiểm tra job có đang mở không

+ isInProgress(): boolean
  → Kiểm tra job có đang làm không

+ isCompleted(): boolean
  → Kiểm tra job đã hoàn thành chưa
```

---

### 2. Bid

**Properties (8 fields):**
```
+ job: PublicKey
+ freelancer: PublicKey
+ proposed_budget: u64
+ proposal: string
+ timeline_days: u16
+ status: BidStatus
+ created_at: i64
+ bump: u8
```

**Methods (5 functions):**
```
+ submit(job, proposed_budget, proposal, timeline_days): Bid
  → Gửi bid (smart contract: submit_bid)

+ accept(): void
  → Chấp nhận bid, đổi status → Accepted

+ reject(): void
  → Từ chối bid, đổi status → Rejected

+ isPending(): boolean
  → Kiểm tra bid đang chờ

+ isAccepted(): boolean
  → Kiểm tra bid đã được chấp nhận
```

---

### 3. Escrow

**Properties (9 fields):**
```
+ job: PublicKey
+ client: PublicKey
+ freelancer: PublicKey
+ amount: u64
+ locked: boolean
+ released: boolean
+ disputed: boolean
+ created_at: i64
+ bump: u8
```

**Methods (7 functions):**
```
+ deposit(job, amount): Escrow
  → Gửi tiền vào escrow (smart contract: deposit_escrow)
  → Chuyển SOL từ client vào escrow PDA

+ release(): void
  → Giải ngân (smart contract: release_escrow)
  → Chuyển SOL từ escrow vào freelancer

+ refund(): void
  → Hoàn tiền lại cho client

+ openDispute(reason): Dispute
  → Mở tranh chấp (smart contract: open_dispute)
  → Set disputed = true

+ isLocked(): boolean
  → Kiểm tra escrow có đang khóa

+ isReleased(): boolean
  → Kiểm tra đã giải ngân chưa

+ isDisputed(): boolean
  → Kiểm tra có tranh chấp không
```

---

### 4. WorkSubmission

**Properties (6 fields):**
```
+ job: PublicKey
+ freelancer: PublicKey
+ deliverable_uri: string
+ submitted_at: i64
+ approved: boolean
+ bump: u8
```

**Methods (5 functions):**
```
+ submit(job, deliverable_uri): WorkSubmission
  → Nộp bài (smart contract: submit_work)
  → Upload link IPFS

+ approve(): void
  → Client chấp nhận bài
  → Set approved = true

+ reject(): void
  → Client từ chối bài
  → Set approved = false

+ getDeliverableUrl(): string
  → Lấy link file trên IPFS

+ isApproved(): boolean
  → Kiểm tra đã được duyệt chưa
```

---

### 5. Dispute

**Properties (12 fields):**
```
+ job: PublicKey
+ escrow: PublicKey
+ client: PublicKey
+ freelancer: PublicKey
+ initiator: PublicKey
+ reason: string
+ status: DisputeStatus
+ votes_for_client: u32
+ votes_for_freelancer: u32
+ created_at: i64
+ resolved_at: Option<i64>
+ bump: u8
```

**Methods (6 functions):**
```
+ open(escrow, reason): Dispute
  → Mở tranh chấp (smart contract: open_dispute)

+ addVote(voter, vote_for_client): VoteRecord
  → Thêm vote (smart contract: vote_dispute)
  → Tăng votes_for_client hoặc votes_for_freelancer

+ resolve(): void
  → Giải quyết tranh chấp (smart contract: resolve_dispute)
  → Chuyển tiền cho người thắng

+ getWinner(): PublicKey
  → Lấy địa chỉ người thắng

+ isOpen(): boolean
  → Kiểm tra tranh chấp còn mở

+ isResolved(): boolean
  → Kiểm tra đã giải quyết chưa

+ getVotePercentage(): (u32, u32)
  → Tính % vote cho mỗi bên
```

---

### 6. VoteRecord

**Properties (5 fields):**
```
+ dispute: PublicKey
+ voter: PublicKey
+ vote_for_client: boolean
+ voted_at: i64
+ bump: u8
```

**Methods (3 functions):**
```
+ create(dispute, voter, vote_for_client): VoteRecord
  → Tạo vote record

+ isForClient(): boolean
  → Kiểm tra vote cho client

+ isForFreelancer(): boolean
  → Kiểm tra vote cho freelancer
```

---

### 7. Reputation

**Properties (6 fields):**
```
+ user: PublicKey
+ total_reviews: u32
+ average_rating: f32
+ completed_jobs: u32
+ total_earned: u64
+ bump: u8
```

**Methods (6 functions):**
```
+ initialize(user): Reputation
  → Khởi tạo reputation (smart contract: initialize_reputation)

+ addReview(rating): void
  → Thêm review mới
  → Update average_rating

+ incrementCompletedJobs(): void
  → Tăng số job hoàn thành

+ addEarnings(amount): void
  → Cộng thêm thu nhập

+ getAverageRating(): f32
  → Tính điểm trung bình

+ getTotalReviews(): u32
  → Lấy tổng số reviews
```

---

### 8. Review

**Properties (7 fields):**
```
+ job: PublicKey
+ reviewer: PublicKey
+ reviewee: PublicKey
+ rating: u8
+ comment: string
+ created_at: i64
+ bump: u8
```

**Methods (4 functions):**
```
+ submit(job, reviewee, rating, comment): Review
  → Gửi review (smart contract: submit_review)

+ edit(comment): void
  → Sửa review (nếu cho phép)

+ delete(): void
  → Xóa review (nếu cho phép)

+ isPositive(): boolean
  → Kiểm tra review có tích cực không (rating >= 4)
```

---

### 9. UserProfile

**Properties (10 fields):**
```
+ address: PublicKey
+ name: string
+ bio: string
+ avatarUrl: string
+ skills: string[]
+ hourlyRate: bigint
+ reputation: Reputation
+ isFreelancer: boolean
+ isClient: boolean
```

**Methods (6 functions):**
```
+ createJob(title, description, budget, metadata_uri): Job
  → Client tạo job

+ submitBid(job, budget, proposal, days): Bid
  → Freelancer gửi bid

+ getReputation(): Reputation
  → Lấy reputation của user

+ getJobs(): Job[]
  → Lấy danh sách jobs của user

+ getBids(): Bid[]
  → Lấy danh sách bids của user

+ updateProfile(name, bio, avatar, skills): void
  → Cập nhật thông tin profile
```

---

## Luồng Hoạt Động Với Methods

### 1. Client Đăng Job
```javascript
// Bước 1: Client tạo job
const job = Job.create(
  "Senior React Dev",
  "Cần làm website...",
  5000,
  "ipfs://metadata"
)
// → job.status = Open
// → job.bid_count = 0
```

### 2. Freelancer Gửi Bid
```javascript
// Bước 2: Freelancer gửi bid
const bid = Bid.submit(
  jobPda,
  4500,
  "Tôi có kinh nghiệm 5 năm...",
  14
)
// → bid.status = Pending
// → job.addBid() → job.bid_count++
```

### 3. Client Chọn Bid
```javascript
// Bước 3: Client chọn bid
bid.accept()
// → bid.status = Accepted

job.selectFreelancer(freelancerPubkey)
// → job.status = InProgress
// → job.selected_freelancer = freelancerPubkey
```

### 4. Client Gửi Tiền Escrow
```javascript
// Bước 4: Client gửi tiền
const escrow = Escrow.deposit(jobPda, 4500)
// → escrow.locked = true
// → escrow.released = false
// → Chuyển 4500 SOL từ client vào escrow PDA
```

### 5. Freelancer Nộp Bài
```javascript
// Bước 5: Freelancer nộp bài
const submission = WorkSubmission.submit(
  jobPda,
  "ipfs://deliverables"
)
// → submission.approved = false
// → Client nhận notification
```

### 6A. Client Chấp Nhận (Happy Path)
```javascript
// Bước 6A: Client chấp nhận
submission.approve()
// → submission.approved = true

escrow.release()
// → escrow.released = true
// → escrow.locked = false
// → Chuyển 4500 SOL từ escrow vào freelancer

job.updateStatus(JobStatus.Completed)
// → job.status = Completed
```

### 6B. Client Mở Tranh Chấp (Dispute Path)
```javascript
// Bước 6B: Client không hài lòng
const dispute = escrow.openDispute("Không đúng yêu cầu")
// → dispute.status = Open
// → escrow.disputed = true
// → job.status = Disputed

// Voters vote
dispute.addVote(voter1, true)  // Vote cho client
// → dispute.votes_for_client++

dispute.addVote(voter2, false) // Vote cho freelancer
// → dispute.votes_for_freelancer++

// Resolve
dispute.resolve()
// → dispute.status = ResolvedClient hoặc ResolvedFreelancer
// → Chuyển tiền cho người thắng
```

### 7. Submit Reviews
```javascript
// Bước 7: Cả 2 bên review
const review1 = Review.submit(jobPda, freelancerPubkey, 5, "Tuyệt vời!")
freelancerReputation.addReview(5)
// → freelancerReputation.total_reviews++
// → freelancerReputation.average_rating update

const review2 = Review.submit(jobPda, clientPubkey, 5, "Client tốt!")
clientReputation.addReview(5)
// → clientReputation.total_reviews++
// → clientReputation.average_rating update

freelancerReputation.incrementCompletedJobs()
// → freelancerReputation.completed_jobs++

freelancerReputation.addEarnings(4500)
// → freelancerReputation.total_earned += 4500
```

---

## Tổng Kết Methods

### Tổng số methods: **49 functions**

**Theo class:**
- Job: 7 methods
- Bid: 5 methods
- Escrow: 7 methods
- WorkSubmission: 5 methods
- Dispute: 6 methods
- VoteRecord: 3 methods
- Reputation: 6 methods
- Review: 4 methods
- UserProfile: 6 methods

**Theo loại:**
- **Create methods** (11): create, submit, deposit, open, initialize, etc.
- **Update methods** (10): accept, reject, approve, addVote, addReview, etc.
- **Query methods** (15): isOpen, isPending, isLocked, getWinner, etc.
- **Business logic** (13): release, refund, resolve, incrementJobs, etc.

---

## Smart Contract Instructions Map

**11 Instructions trong smart contract → Methods trong classes:**

```
1. create_job          → Job.create()
2. submit_bid          → Bid.submit()
3. select_bid          → Bid.accept() + Job.selectFreelancer()
4. deposit_escrow      → Escrow.deposit()
5. release_escrow      → Escrow.release()
6. submit_work         → WorkSubmission.submit()
7. open_dispute        → Dispute.open()
8. vote_dispute        → Dispute.addVote()
9. resolve_dispute     → Dispute.resolve()
10. initialize_reputation → Reputation.initialize()
11. submit_review      → Review.submit()
```

---

## Kiểm Tra Methods

### Job Methods ✅
```rust
// Smart contract có:
create_job() → Job.create() ✅
select_bid() → Job.selectFreelancer() ✅

// Business logic:
isOpen() ✅
isInProgress() ✅
isCompleted() ✅
```

### Escrow Methods ✅
```rust
// Smart contract có:
deposit_escrow() → Escrow.deposit() ✅
release_escrow() → Escrow.release() ✅

// Business logic:
openDispute() ✅
isLocked() ✅
isReleased() ✅
```

### Dispute Methods ✅
```rust
// Smart contract có:
open_dispute() → Dispute.open() ✅
vote_dispute() → Dispute.addVote() ✅
resolve_dispute() → Dispute.resolve() ✅

// Business logic:
getWinner() ✅
isOpen() ✅
```

---

**Diagram giờ đã đầy đủ cả properties VÀ methods!** ✅🎯
