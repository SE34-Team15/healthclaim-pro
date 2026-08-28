import { describe, it, expect, beforeEach } from 'vitest';
import { ActuarialService } from '../src/actuarial/actuarial.service';
import { ClaimCategory } from '@healthclaim/shared';

describe('Dynamic Actuarial Calculation Engine (TDD - Strategy + Builder Patterns)', () => {
  let actuarialService: ActuarialService;

  beforeEach(() => {
    actuarialService = new ActuarialService();
  });

  it('should absorb annual deductible before applying co-pay subsidy', () => {
    // Standard Plan: $3,000 limit, $100 deductible, 80% co-pay
    // Claim: $500 Consultation
    // Expected:
    // Deductible applied: $100
    // Remaining eligible: $400
    // Co-pay covered: $400 * 0.8 = $320
    // Employee out-of-pocket: $100 (deductible) + $80 (co-pay 20%) = $180
    const result = actuarialService.calculate(
      ClaimCategory.CONSULTATION,
      [
        {
          description: 'Specialist General Consultation',
          category: ClaimCategory.CONSULTATION,
          unitPrice: 500,
          quantity: 1,
          totalPrice: 500,
        },
      ],
      {
        name: 'Standard Corporate Plan',
        code: 'TIER_STANDARD',
        annualLimit: 3000,
        defaultDeductible: 100,
        defaultCoPayRate: 0.8,
      },
      {
        remainingBalance: 3000,
        annualLimit: 3000,
        cumulativeDeductibleSpent: 0,
      },
    );

    expect(result.totalClaimedAmount).toBe(500);
    expect(result.deductibleApplied).toBe(100);
    expect(result.remainingDeductibleBefore).toBe(100);
    expect(result.remainingDeductibleAfter).toBe(0);
    expect(result.reimbursedAmount).toBe(320);
    expect(result.employeeOutOfPocket).toBe(180);
    expect(result.quotaAfterClaim).toBe(2680);
    expect(result.isCappedByQuota).toBe(false);
  });

  it('should not apply deductible if cumulative deductible was already satisfied', () => {
    // User already spent $100 deductible earlier in fiscal year
    // Claim: $200 Medication
    // Expected:
    // Deductible applied: $0
    // Co-pay covered: $200 * 0.8 = $160
    // Employee out-of-pocket: $40
    const result = actuarialService.calculate(
      ClaimCategory.MEDICATION,
      [
        {
          description: 'Prescription Antibiotics',
          category: ClaimCategory.MEDICATION,
          unitPrice: 200,
          quantity: 1,
          totalPrice: 200,
        },
      ],
      {
        name: 'Standard Corporate Plan',
        code: 'TIER_STANDARD',
        annualLimit: 3000,
        defaultDeductible: 100,
        defaultCoPayRate: 0.8,
      },
      {
        remainingBalance: 2680,
        annualLimit: 3000,
        cumulativeDeductibleSpent: 100,
      },
    );

    expect(result.deductibleApplied).toBe(0);
    expect(result.reimbursedAmount).toBe(160);
    expect(result.employeeOutOfPocket).toBe(40);
    expect(result.quotaAfterClaim).toBe(2520);
  });

  it('should enforce category ceiling cap (e.g. Dental $1,000 cap)', () => {
    // Claim: $1,400 Dental (Crown + Scaling)
    // Dental cap: $1,000 eligible, $400 ineligible excess
    // Zero deductible
    // Co-pay covered: $1,000 * 0.9 = $900
    // Employee out-of-pocket: $400 (excess) + $100 (10% co-pay) = $500
    const result = actuarialService.calculate(
      ClaimCategory.DENTAL,
      [
        {
          description: 'Dental Ceramic Crown Replacement',
          category: ClaimCategory.DENTAL,
          unitPrice: 1400,
          quantity: 1,
          totalPrice: 1400,
        },
      ],
      {
        name: 'Executive Leadership Plan',
        code: 'TIER_EXECUTIVE',
        annualLimit: 8000,
        defaultDeductible: 0,
        defaultCoPayRate: 0.9,
      },
      {
        remainingBalance: 8000,
        annualLimit: 8000,
        cumulativeDeductibleSpent: 0,
      },
    );

    expect(result.totalClaimedAmount).toBe(1400);
    expect(result.ineligibleAmount).toBe(400);
    expect(result.reimbursedAmount).toBe(900);
    expect(result.employeeOutOfPocket).toBe(500);
  });

  it('should cap reimbursement to remaining annual quota balance', () => {
    // User only has $150 quota balance left
    // Reimbursable before cap: $1,000 * 0.8 = $800
    // Expected: Reimbursed capped to $150
    // Out-of-pocket: $1,000 - $150 = $850
    const result = actuarialService.calculate(
      ClaimCategory.SURGERY,
      [
        {
          description: 'Outpatient Minor Surgery',
          category: ClaimCategory.SURGERY,
          unitPrice: 1000,
          quantity: 1,
          totalPrice: 1000,
        },
      ],
      {
        name: 'Standard Corporate Plan',
        code: 'TIER_STANDARD',
        annualLimit: 3000,
        defaultDeductible: 0,
        defaultCoPayRate: 0.8,
      },
      {
        remainingBalance: 150,
        annualLimit: 3000,
        cumulativeDeductibleSpent: 100,
      },
    );

    expect(result.reimbursedAmount).toBe(150);
    expect(result.isCappedByQuota).toBe(true);
    expect(result.employeeOutOfPocket).toBe(850);
    expect(result.quotaAfterClaim).toBe(0);
  });
});
