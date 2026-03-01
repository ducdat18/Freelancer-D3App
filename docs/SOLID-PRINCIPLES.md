# SOLID Principles in Freelance Marketplace dApp

This document explains how the class diagram and architecture follow SOLID principles.

## Overview

The architecture is organized into layers:
1. **Domain Layer** - Core business entities
2. **Interfaces Layer** - Abstractions and contracts
3. **Service Layer** - Business logic
4. **Repository Layer** - Data access and external services
5. **Application Layer** - React hooks and UI integration

---

## 1. Single Responsibility Principle (SRP)

> A class should have only one reason to change.

### Implementation:

#### **Domain Entities**
Each entity has a single responsibility:
- `Job` - Manages job state and validation
- `Bid` - Manages bid state and acceptance
- `Escrow` - Manages fund locking and release
- `Dispute` - Manages dispute voting and resolution
- `Reputation` - Manages user reputation metrics

#### **Services**
Each service handles one specific domain:
- `JobService` - Only handles job creation and listing
- `BidService` - Only handles bid submission and selection
- `EscrowService` - Only handles fund management
- `WorkSubmissionService` - Only handles work deliverable uploads
- `DisputeService` - Only handles dispute resolution
- `ReputationService` - Only handles reputation and reviews

#### **Repositories**
Each repository handles data access for one entity type:
- `SolanaJobRepository` - Job data persistence
- `SolanaBidRepository` - Bid data persistence
- `SolanaEscrowRepository` - Escrow data persistence
- `SolanaReputationRepository` - Reputation data persistence

**Benefits:**
- Easy to understand and maintain
- Changes to one domain don't affect others
- Can test each class in isolation

---

## 2. Open/Closed Principle (OCP)

> Software entities should be open for extension but closed for modification.

### Implementation:

#### **Strategy Pattern for Dispute Resolution**
```typescript
interface IDisputeResolutionStrategy {
  resolve(dispute: Dispute): Promise<PublicKey>
}

// Can add new strategies without modifying existing code
class VotingDisputeStrategy implements IDisputeResolutionStrategy
class ArbitratorDisputeStrategy implements IDisputeResolutionStrategy
// Future: class AIDisputeStrategy implements IDisputeResolutionStrategy
```

#### **Strategy Pattern for Payments**
```typescript
interface IPaymentStrategy {
  processPayment(from: PublicKey, to: PublicKey, amount: number): Promise<void>
}

class SolanaPaymentStrategy implements IPaymentStrategy
// Future: class TokenPaymentStrategy implements IPaymentStrategy
// Future: class USDCPaymentStrategy implements IPaymentStrategy
```

#### **Extensible Storage**
```typescript
interface IStorageProvider {
  upload(data: any): Promise<string>
  fetch(hash: string): Promise<any>
}

class IPFSStorageProvider implements IStorageProvider
// Future: class ArweaveStorageProvider implements IStorageProvider
// Future: class ShadowStorageProvider implements IStorageProvider
```

**Benefits:**
- Add new payment methods without changing existing code
- Add new dispute resolution algorithms easily
- Switch storage providers without service changes

---

## 3. Liskov Substitution Principle (LSP)

> Derived classes must be substitutable for their base classes.

### Implementation:

#### **BaseEntity Abstract Class**
```typescript
abstract class BaseEntity {
  protected publicKey: PublicKey
  protected createdAt: number
  protected updatedAt: number

  validate(): boolean
  toJSON(): object
}

// All entities extend BaseEntity and honor its contract
class Job extends BaseEntity
class Bid extends BaseEntity
class Escrow extends BaseEntity
```

All derived entities:
- Implement `validate()` properly
- Implement `toJSON()` properly
- Can be used polymorphically where `BaseEntity` is expected

#### **Repository Interfaces**
```typescript
// Any class implementing IJobRepository can substitute another
class SolanaJobRepository implements IJobRepository
class MockJobRepository implements IJobRepository  // For testing
class CachedJobRepository implements IJobRepository  // For optimization
```

**Benefits:**
- Can use any entity type generically
- Easy to create mock implementations for testing
- Can swap implementations without breaking code

---

## 4. Interface Segregation Principle (ISP)

> Clients should not be forced to depend on interfaces they don't use.

### Implementation:

#### **Focused Interfaces**
Instead of one large repository interface, we have specific ones:

```typescript
// ❌ BAD: Fat interface
interface IRepository {
  createJob(), createBid(), createEscrow()
  findJob(), findBid(), findEscrow()
  updateJob(), updateBid(), updateEscrow()
  // ... 20+ methods
}

// ✅ GOOD: Focused interfaces
interface IJobRepository {
  create(job: Job): Promise<PublicKey>
  findById(id: PublicKey): Promise<Job>
  findAll(): Promise<Job[]>
  update(job: Job): Promise<void>
}

interface IBidRepository {
  create(bid: Bid): Promise<PublicKey>
  findById(id: PublicKey): Promise<Bid>
  findByJob(jobId: PublicKey): Promise<Bid[]>
  update(bid: Bid): Promise<void>
}
```

#### **Specific Service Interfaces**
```typescript
// Storage only needs upload/fetch
interface IStorageProvider {
  upload(data: any): Promise<string>
  fetch(hash: string): Promise<any>
}

// Notifications only need send/subscribe
interface INotificationService {
  send(userId: PublicKey, message: string): void
  subscribe(userId: PublicKey, callback: Function): void
}
```

**Benefits:**
- Services only depend on methods they actually use
- Easier to implement (don't need unused methods)
- Clearer contracts and expectations

---

## 5. Dependency Inversion Principle (DIP)

> Depend on abstractions, not concretions.

### Implementation:

#### **Services Depend on Interfaces**
```typescript
// ❌ BAD: Depends on concrete implementation
class JobService {
  private jobRepo: SolanaJobRepository  // Concrete!
}

// ✅ GOOD: Depends on abstraction
class JobService {
  private jobRepo: IJobRepository  // Interface!

  constructor(jobRepo: IJobRepository) {
    this.jobRepo = jobRepo
  }
}
```

#### **Dependency Injection**
```typescript
// Services receive dependencies, not create them
class BidService {
  constructor(
    private bidRepo: IBidRepository,
    private jobRepo: IJobRepository,
    private notificationService: INotificationService
  ) {}
}

// Usage
const bidService = new BidService(
  new SolanaBidRepository(program),
  new SolanaJobRepository(program),
  new NotificationServiceImpl()
)
```

#### **Flexible Strategy Injection**
```typescript
class DisputeService {
  constructor(
    private escrowRepo: IEscrowRepository,
    private resolutionStrategy: IDisputeResolutionStrategy  // Can inject any strategy
  ) {}
}

// Can easily switch strategies
const votingDispute = new DisputeService(repo, new VotingDisputeStrategy())
const arbitratorDispute = new DisputeService(repo, new ArbitratorDisputeStrategy())
```

**Benefits:**
- Easy to test (inject mocks)
- Easy to swap implementations
- Loose coupling between layers

---

## Architecture Layers

### Dependency Flow (DIP in action)
```
Application Layer (Hooks)
        ↓ depends on
Service Layer
        ↓ depends on
Interfaces Layer ← implementations ← Repository Layer
        ↓ uses
Domain Layer
```

**Key Points:**
- High-level modules (Services) don't depend on low-level modules (Repositories)
- Both depend on abstractions (Interfaces)
- Domain layer has no dependencies (pure business logic)

---

## Benefits of This Architecture

1. **Testability**
   - Can inject mocks for all dependencies
   - Can test each layer independently
   - Can test strategies in isolation

2. **Maintainability**
   - Changes to one layer don't affect others
   - Clear separation of concerns
   - Easy to locate and fix bugs

3. **Extensibility**
   - Add new entities without changing services
   - Add new strategies without changing algorithms
   - Add new repositories without changing business logic

4. **Flexibility**
   - Swap storage providers (IPFS → Arweave)
   - Change payment methods (SOL → USDC)
   - Update dispute algorithms (voting → AI)

5. **Reusability**
   - Services can be used in different contexts
   - Strategies can be reused across services
   - Domain entities are framework-agnostic

---

## Comparison: Before vs After SOLID

### Before (Tightly Coupled)
```typescript
class JobManager {
  async createJob(data) {
    // Direct blockchain calls
    const tx = await program.rpc.createJob(...)
    // Direct IPFS calls
    const hash = await pinata.upload(...)
    // Direct notification
    await sendEmail(...)
  }
}
```
**Problems:**
- Hard to test (requires real blockchain/IPFS)
- Can't swap implementations
- Violates SRP (does too much)

### After (SOLID)
```typescript
class JobService {
  constructor(
    private jobRepo: IJobRepository,
    private storage: IStorageProvider,
    private notifications: INotificationService
  ) {}

  async createJob(data: JobData) {
    const ipfsHash = await this.storage.upload(data.details)
    const job = new Job({...data, ipfsHash})
    const jobId = await this.jobRepo.create(job)
    await this.notifications.send(data.client, 'Job created')
    return jobId
  }
}
```
**Benefits:**
- Easy to test (inject mocks)
- Flexible implementations
- Follows SRP (focused on job logic)

---

## How to Extend

### Adding a New Payment Method
```typescript
// 1. Implement the interface
class USDCPaymentStrategy implements IPaymentStrategy {
  async processPayment(from, to, amount) {
    // USDC token transfer logic
  }
}

// 2. Inject into service
const escrowService = new EscrowService(
  escrowRepo,
  jobRepo,
  new USDCPaymentStrategy()  // Just change this!
)
```

### Adding a New Storage Provider
```typescript
// 1. Implement the interface
class ArweaveStorageProvider implements IStorageProvider {
  async upload(data) { /* Arweave logic */ }
  async fetch(hash) { /* Arweave logic */ }
}

// 2. Inject into service
const workService = new WorkSubmissionService(
  new ArweaveStorageProvider(),  // Just change this!
  notificationService
)
```

---

## Testing Strategy

### Unit Testing (Thanks to DIP)
```typescript
describe('JobService', () => {
  it('should create a job', async () => {
    // Arrange - inject mocks
    const mockJobRepo = new MockJobRepository()
    const mockStorage = new MockStorageProvider()
    const mockNotifications = new MockNotificationService()
    const service = new JobService(mockJobRepo, mockStorage, mockNotifications)

    // Act
    const jobId = await service.createJob(jobData)

    // Assert
    expect(mockJobRepo.create).toHaveBeenCalled()
  })
})
```

### Integration Testing
```typescript
describe('JobService Integration', () => {
  it('should create a job on Solana', async () => {
    // Use real implementations
    const service = new JobService(
      new SolanaJobRepository(program),
      new IPFSStorageProvider(apiKey),
      new NotificationServiceImpl()
    )

    const jobId = await service.createJob(jobData)

    const job = await service.getJobById(jobId)
    expect(job.title).toBe(jobData.title)
  })
})
```

---

## Conclusion

This architecture demonstrates all SOLID principles:

✅ **S** - Single Responsibility: Each class has one clear purpose
✅ **O** - Open/Closed: Extensible via strategies and interfaces
✅ **L** - Liskov Substitution: Proper inheritance and contracts
✅ **I** - Interface Segregation: Focused, specific interfaces
✅ **D** - Dependency Inversion: Depend on abstractions, inject dependencies

The result is a **flexible, testable, maintainable, and extensible** architecture that can evolve with the project's needs.
