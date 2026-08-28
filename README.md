# HealthClaim Pro

Enterprise Medical Insurance Claim and Intelligent Settlement Platform with Dynamic Rule & Actuarial Engines and Zero-Trust Storage.

## Monorepo Structure
```text
healthclaim-pro/
├── frontend/                  # React + Vite + Tailwind + Shadcn UI
├── backend/                   # Modular Monolithic Domain & API Service (NestJS)
├── shared/                    # Shared Zod schemas, DTO types, and validation contracts
├── pnpm-workspace.yaml        # PNPM Monorepo workspace configuration
├── .gitignore                 # Standard Git ignore configurations
└── README.md                  # Project overview and instructions
```

## Quick Start (PNPM)

### Prerequisites
- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose

### 1. Install All Dependencies
```bash
pnpm install
```

### 2. Start Services
```bash
# Start backend service
pnpm --filter backend start:dev

# Start frontend application
pnpm --filter frontend dev
```
