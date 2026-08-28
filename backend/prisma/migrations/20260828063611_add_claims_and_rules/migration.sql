-- CreateEnum
CREATE TYPE "ClaimCategory" AS ENUM ('CONSULTATION', 'MEDICATION', 'SURGERY', 'HOSPITALIZATION', 'DENTAL', 'OPTICAL', 'HEALTH_SCREENING', 'OTHER');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('SUBMITTED', 'AUTO_VALIDATED', 'FLAGGED_REVIEW', 'OFFICER_APPROVED', 'OFFICER_REJECTED', 'FINANCE_APPROVED', 'SETTLED');

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "category" "ClaimCategory" NOT NULL,
    "hospitalName" TEXT NOT NULL,
    "hospitalGrade" TEXT DEFAULT 'GRADE_A',
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "deductibleCovered" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "coPayRate" DECIMAL(5,4) NOT NULL,
    "approvedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "outOfPocketAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "ClaimStatus" NOT NULL DEFAULT 'SUBMITTED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimItem" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ClaimCategory" NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "isEligible" BOOLEAN NOT NULL DEFAULT true,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClaimItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceRule" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "astDefinition" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleEvaluationLog" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "ruleId" TEXT,
    "ruleCode" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL,
    "isPassed" BOOLEAN NOT NULL,
    "reason" TEXT,
    "details" JSONB,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RuleEvaluationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Claim_claimNumber_key" ON "Claim"("claimNumber");

-- CreateIndex
CREATE INDEX "Claim_userId_idx" ON "Claim"("userId");

-- CreateIndex
CREATE INDEX "Claim_status_idx" ON "Claim"("status");

-- CreateIndex
CREATE INDEX "Claim_claimNumber_idx" ON "Claim"("claimNumber");

-- CreateIndex
CREATE INDEX "Claim_fiscalYear_idx" ON "Claim"("fiscalYear");

-- CreateIndex
CREATE INDEX "ClaimItem_claimId_idx" ON "ClaimItem"("claimId");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceRule_code_key" ON "ComplianceRule"("code");

-- CreateIndex
CREATE INDEX "ComplianceRule_code_idx" ON "ComplianceRule"("code");

-- CreateIndex
CREATE INDEX "ComplianceRule_isActive_idx" ON "ComplianceRule"("isActive");

-- CreateIndex
CREATE INDEX "RuleEvaluationLog_claimId_idx" ON "RuleEvaluationLog"("claimId");

-- CreateIndex
CREATE INDEX "RuleEvaluationLog_ruleId_idx" ON "RuleEvaluationLog"("ruleId");

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimItem" ADD CONSTRAINT "ClaimItem_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleEvaluationLog" ADD CONSTRAINT "RuleEvaluationLog_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleEvaluationLog" ADD CONSTRAINT "RuleEvaluationLog_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "ComplianceRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
