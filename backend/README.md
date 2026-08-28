# HealthClaim Pro - Backend

Backend service and domain engine for the HealthClaim Pro Enterprise Medical Insurance Claim and Intelligent Settlement Platform.

## Technology Stack
- Runtime: Node.js with TypeScript
- Framework: NestJS
- Database: PostgreSQL with Prisma
- Storage: S3 Compatible Storage Adapter
- Email: SMTP Protocol Adapter
- Validation: Zod
- Testing: Vitest for TDD unit and integration tests

## Core Design Patterns
- Dynamic Compliance Rule Engine: Composite & Specification Pattern
- Dynamic Actuarial Reimbursement Pipeline: Strategy & Builder Pattern
- Rule Priority Dispatcher: Chain of Responsibility Pattern
- Claim Lifecycle State Machine: State Pattern
- Zero-Trust Asymmetric Envelope Encryption: Decorator & Adapter Pattern
- Transactional Event Notification: Observer & Adapter Pattern
- Settlement & Audit Reporting: Template Method Pattern

## Development
```bash
# Install dependencies
pnpm install

# Run database migrations
pnpm prisma migrate dev

# Run TDD test suites with coverage
pnpm test:cov

# Start development server
pnpm start:dev
```
