# HealthClaim Pro - Backend

Backend service and domain engine for the HealthClaim Pro Enterprise Medical Insurance Claim and Intelligent Settlement Platform.

## Core Architectural Components & Design Patterns
- Dynamic Compliance Rule Engine (Composite & Specification Pattern)
- Dynamic Actuarial Reimbursement Pipeline (Strategy & Builder Pattern)
- Rule Priority Dispatcher (Chain of Responsibility Pattern)
- Claim Lifecycle State Machine (State Pattern)
- Zero-Trust Asymmetric Envelope Encryption (Decorator & Adapter Pattern)
- Transactional Event Notification (Observer & Adapter Pattern)
- Settlement & Audit Reporting (Template Method Pattern)

## Development Setup
```bash
# Install dependencies
npm install

# Run database migrations
npx prisma migrate dev

# Run TDD test suites with coverage
npm run test:cov

# Start development server
npm run start:dev
```
