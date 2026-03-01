# Class Diagram - Hướng Dẫn Đơn Giản

## Xem Diagram

**Cách 1: Online (Dễ nhất)**
1. Mở https://www.plantuml.com/plantuml/uml/
2. Copy nội dung file `class-diagram-basic.puml`
3. Paste vào và xem

**Cách 2: VS Code**
1. Cài extension "PlantUML"
2. Mở file `class-diagram-basic.puml`
3. Nhấn `Alt+D`

---

## Các Lớp Chính

### 1. **User** (Người dùng)
```
Properties:
- publicKey: Địa chỉ ví Solana
- name: Tên
- email: Email
- bio: Giới thiệu
- skills: Kỹ năng
- isClient: Là khách hàng?
- isFreelancer: Là freelancer?

Methods:
- createJob(): Tạo job mới
- submitBid(): Gửi bid
- getReputation(): Xem reputation
```

### 2. **Job** (Công việc)
```
Properties:
- title: Tiêu đề
- description: Mô tả
- budget: Ngân sách
- deadline: Hạn deadline
- status: Trạng thái (Open, InProgress, Completed...)

Methods:
- addBid(): Nhận bid
- selectBid(): Chọn bid
- complete(): Hoàn thành
- cancel(): Hủy
```

### 3. **Bid** (Đề xuất)
```
Properties:
- proposedBudget: Giá đề xuất
- estimatedDuration: Thời gian dự kiến
- coverLetter: Thư giới thiệu
- status: Trạng thái (Pending, Accepted, Rejected)

Methods:
- accept(): Chấp nhận
- reject(): Từ chối
```

### 4. **Escrow** (Ký quỹ)
```
Properties:
- amount: Số tiền
- deposited: Đã gửi?
- released: Đã giải ngân?
- disputed: Đang tranh chấp?

Methods:
- deposit(): Gửi tiền
- release(): Giải ngân
- refund(): Hoàn tiền
- openDispute(): Mở tranh chấp
```

### 5. **WorkSubmission** (Nộp bài)
```
Properties:
- ipfsHash: Link file trên IPFS
- description: Mô tả bài nộp
- submittedAt: Thời gian nộp

Methods:
- approve(): Chấp nhận
- reject(): Từ chối
```

### 6. **Dispute** (Tranh chấp)
```
Properties:
- reason: Lý do
- status: Trạng thái
- votesClient: Số vote cho client
- votesFreelancer: Số vote cho freelancer

Methods:
- addVote(): Thêm vote
- resolve(): Giải quyết
```

### 7. **Reputation** (Uy tín)
```
Properties:
- totalRating: Tổng điểm
- reviewCount: Số lượng review
- completedJobs: Số job hoàn thành
- totalEarned: Tổng thu nhập

Methods:
- getAverageRating(): Tính điểm TB
- addReview(): Thêm review
```

### 8. **Review** (Đánh giá)
```
Properties:
- rating: Số sao (1-5)
- comment: Bình luận
- createdAt: Thời gian tạo

Methods:
- edit(): Sửa
- delete(): Xóa
```

---

## Quan Hệ Giữa Các Lớp

```
User
 ├── tạo nhiều Job
 ├── gửi nhiều Bid
 ├── có 1 Reputation
 └── viết nhiều Review

Job
 ├── nhận nhiều Bid
 ├── có 1 Escrow
 └── nhận nhiều Review

Escrow
 ├── có 1 WorkSubmission
 └── có thể có 1 Dispute
```

---

## Luồng Hoạt Động

### 1. Đăng Job
```
Client (User) → createJob() → Job được tạo
```

### 2. Gửi Bid
```
Freelancer (User) → submitBid(job) → Bid được tạo → Job nhận Bid
```

### 3. Chọn Bid & Gửi Tiền
```
Client → selectBid(bid) → Job cập nhật trạng thái
Client → deposit() → Escrow nhận tiền
```

### 4. Nộp Bài
```
Freelancer → upload file → WorkSubmission được tạo
```

### 5. Giải Ngân
```
Client → approve() → Escrow.release() → Tiền chuyển cho Freelancer
```

### 6. Đánh Giá
```
Client → submitReview() → Review được tạo → Reputation cập nhật
Freelancer → submitReview() → Review được tạo → Reputation cập nhật
```

### 7. Tranh Chấp (nếu có)
```
Client hoặc Freelancer → openDispute() → Dispute được tạo
Voters → addVote() → Dispute thu thập votes
System → resolve() → Tiền được chuyển cho người thắng
```

---

## Ví Dụ Code

### Tạo User
```typescript
const user = new User({
  publicKey: wallet.publicKey,
  name: "Nguyễn Văn A",
  email: "a@example.com",
  bio: "Lập trình viên React",
  skills: ["React", "TypeScript", "Solana"],
  isFreelancer: true
})
```

### Tạo Job
```typescript
const job = user.createJob({
  title: "Cần Dev React",
  description: "Làm website...",
  budget: 5000,
  deadline: new Date('2025-12-31')
})
```

### Gửi Bid
```typescript
const bid = freelancer.submitBid(job, {
  proposedBudget: 4500,
  estimatedDuration: 14,
  coverLetter: "Tôi có kinh nghiệm..."
})
```

### Chọn Bid
```typescript
job.selectBid(bid)
```

### Gửi Escrow
```typescript
const escrow = job.escrow
escrow.deposit()
```

### Nộp Bài
```typescript
const submission = new WorkSubmission({
  escrowId: escrow.id,
  ipfsHash: "QmXxx...",
  description: "Đã hoàn thành"
})
```

### Giải Ngân
```typescript
submission.approve()
escrow.release()
```

### Review
```typescript
const review = new Review({
  jobId: job.id,
  rating: 5,
  comment: "Làm việc tốt!"
})
freelancer.reputation.addReview(review)
```

---

## Tóm Tắt

**8 lớp chính:**
1. User - Người dùng
2. Job - Công việc
3. Bid - Đề xuất
4. Escrow - Ký quỹ
5. WorkSubmission - Nộp bài
6. Dispute - Tranh chấp
7. Reputation - Uy tín
8. Review - Đánh giá

**Đơn giản và dễ hiểu!** ✅
