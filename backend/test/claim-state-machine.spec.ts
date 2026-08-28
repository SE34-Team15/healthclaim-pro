import { describe, it, expect, beforeEach } from 'vitest';
import { ClaimStateMachine } from '../src/claims/state-machine/claim-state-machine';
import { ClaimStatus, UserRole } from '@healthclaim/shared';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('ClaimStateMachine (GoF State Pattern Finite State Machine)', () => {
  let stateMachine: ClaimStateMachine;
  let mockTx: any;

  beforeEach(() => {
    stateMachine = new ClaimStateMachine();
    mockTx = {
      claim: {
        update: vi.fn().mockImplementation(({ data }: any) => ({
          id: 'claim-123',
          claimNumber: 'CLM-2026-TEST',
          status: data.status,
          statusReason: data.statusReason,
          reviewedBy: data.reviewedBy,
          reviewedAt: data.reviewedAt,
        })),
      },
      userPolicyQuota: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'quota-123',
          remainingBalance: 3000,
          cumulativeDeductibleSpent: 0,
        }),
        update: vi.fn().mockResolvedValue({}),
      },
    };
  });

  describe('Initial States (SUBMITTED / AUTO_VALIDATED / FLAGGED_REVIEW)', () => {
    const claim = {
      id: 'claim-123',
      claimNumber: 'CLM-2026-TEST',
      userId: 'emp-1',
      fiscalYear: 2026,
      status: ClaimStatus.AUTO_VALIDATED,
      approvedAmount: 350,
      deductibleCovered: 50,
    };

    it('should allow Claim Officer to approve submitted claim', async () => {
      const actor = { id: 'officer-1', role: UserRole.CLAIM_OFFICER };
      const updated = await stateMachine.transition(
        claim,
        ClaimStatus.OFFICER_APPROVED,
        actor,
        undefined,
        mockTx,
      );

      expect(updated.status).toBe(ClaimStatus.OFFICER_APPROVED);
      expect(mockTx.claim.update).toHaveBeenCalled();
    });

    it('should reject approval attempt by regular Employee', async () => {
      const actor = { id: 'emp-1', role: UserRole.EMPLOYEE };
      await expect(
        stateMachine.transition(claim, ClaimStatus.OFFICER_APPROVED, actor, undefined, mockTx),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should require mandatory reason when Claim Officer rejects a claim', async () => {
      const actor = { id: 'officer-1', role: UserRole.CLAIM_OFFICER };

      // Without reason -> Throws BadRequestException
      await expect(
        stateMachine.transition(claim, ClaimStatus.OFFICER_REJECTED, actor, '', mockTx),
      ).rejects.toThrow(BadRequestException);

      // With reason -> Succeeds
      const updated = await stateMachine.transition(
        claim,
        ClaimStatus.OFFICER_REJECTED,
        actor,
        'Duplicate invoice receipt detected',
        mockTx,
      );
      expect(updated.status).toBe(ClaimStatus.OFFICER_REJECTED);
      expect(updated.statusReason).toBe('Duplicate invoice receipt detected');
    });

    it('should allow Claim Owner to withdraw / cancel their own pending claim', async () => {
      const ownerActor = { id: 'emp-1', role: UserRole.EMPLOYEE };
      const updated = await stateMachine.transition(
        claim,
        ClaimStatus.CANCELLED,
        ownerActor,
        'Submitted wrong receipt',
        mockTx,
      );
      expect(updated.status).toBe(ClaimStatus.CANCELLED);
    });

    it('should forbid non-owner Employee from cancelling another user claim', async () => {
      const nonOwnerActor = { id: 'emp-2', role: UserRole.EMPLOYEE };
      await expect(
        stateMachine.transition(claim, ClaimStatus.CANCELLED, nonOwnerActor, 'Malicious cancel', mockTx),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('OfficerApprovedState', () => {
    const claim = {
      id: 'claim-123',
      claimNumber: 'CLM-2026-TEST',
      userId: 'emp-1',
      fiscalYear: 2026,
      status: ClaimStatus.OFFICER_APPROVED,
      approvedAmount: 350,
      deductibleCovered: 50,
    };

    it('should allow Finance Manager to approve finance verification', async () => {
      const actor = { id: 'fin-1', role: UserRole.FINANCE_MANAGER };
      const updated = await stateMachine.transition(
        claim,
        ClaimStatus.FINANCE_APPROVED,
        actor,
        undefined,
        mockTx,
      );
      expect(updated.status).toBe(ClaimStatus.FINANCE_APPROVED);
    });

    it('should allow fast-track disbursement directly to SETTLED and deduct policy quota', async () => {
      const actor = { id: 'fin-1', role: UserRole.FINANCE_MANAGER };
      const updated = await stateMachine.transition(
        claim,
        ClaimStatus.SETTLED,
        actor,
        'Direct disbursement batch #99',
        mockTx,
      );

      expect(updated.status).toBe(ClaimStatus.SETTLED);
      expect(mockTx.userPolicyQuota.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            remainingBalance: 2650, // 3000 - 350
            cumulativeDeductibleSpent: 50,
          },
        }),
      );
    });
  });

  describe('SettledState (Financial Invariant & Terminal Locking)', () => {
    const settledClaim = {
      id: 'claim-123',
      claimNumber: 'CLM-2026-SETTLED',
      userId: 'emp-1',
      fiscalYear: 2026,
      status: ClaimStatus.SETTLED,
      approvedAmount: 350,
    };

    it('should strictly forbid cancelling a SETTLED claim', async () => {
      const actor = { id: 'admin-1', role: UserRole.SYSTEM_ADMIN };
      await expect(
        stateMachine.transition(settledClaim, ClaimStatus.CANCELLED, actor, 'Attempt rollback', mockTx),
      ).rejects.toThrow(BadRequestException);
    });

    it('should strictly forbid re-approving or modifying a SETTLED claim', async () => {
      const actor = { id: 'officer-1', role: UserRole.CLAIM_OFFICER };
      await expect(
        stateMachine.transition(settledClaim, ClaimStatus.OFFICER_APPROVED, actor, undefined, mockTx),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
