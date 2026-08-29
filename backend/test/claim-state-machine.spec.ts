import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClaimStateMachine } from '../src/claims/state-machine/claim-state-machine';
import { CancelledState } from '../src/claims/state-machine/states/cancelled.state';
import { OfficerRejectedState } from '../src/claims/state-machine/states/officer-rejected.state';
import { SettledState } from '../src/claims/state-machine/states/settled.state';
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

    it('should disburse without quota update if quota record does not exist', async () => {
      mockTx.userPolicyQuota.findUnique.mockResolvedValue(null);
      const actor = { id: 'fin-1', role: UserRole.FINANCE_MANAGER };
      const updated = await stateMachine.transition(
        claim,
        ClaimStatus.SETTLED,
        actor,
        'Direct disbursement',
        mockTx,
      );
      expect(updated.status).toBe(ClaimStatus.SETTLED);
      expect(mockTx.userPolicyQuota.update).not.toHaveBeenCalled();
    });

    it('should reject invalid transition from OfficerApprovedState', async () => {
      const actor = { id: 'officer-1', role: UserRole.CLAIM_OFFICER };
      await expect(
        stateMachine.transition(claim, ClaimStatus.SUBMITTED, actor, undefined, mockTx),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('FinanceApprovedState', () => {
    const financeApprovedClaim = {
      id: 'claim-123',
      claimNumber: 'CLM-2026-TEST',
      userId: 'emp-1',
      fiscalYear: 2026,
      status: ClaimStatus.FINANCE_APPROVED,
      approvedAmount: 350,
      deductibleCovered: 50,
    };

    it('should allow Finance Manager to settle or cancel a finance approved claim', async () => {
      const finActor = { id: 'fin-1', role: UserRole.FINANCE_MANAGER };
      const settled = await stateMachine.transition(
        financeApprovedClaim,
        ClaimStatus.SETTLED,
        finActor,
        undefined,
        mockTx,
      );
      expect(settled.status).toBe(ClaimStatus.SETTLED);

      const cancelled = await stateMachine.transition(
        financeApprovedClaim,
        ClaimStatus.CANCELLED,
        finActor,
        'Cancelled by finance',
        mockTx,
      );
      expect(cancelled.status).toBe(ClaimStatus.CANCELLED);
    });

    it('should forbid employee or unauthorized role from settling finance approved claim', async () => {
      const empActor = { id: 'emp-1', role: UserRole.EMPLOYEE };
      await expect(
        stateMachine.transition(financeApprovedClaim, ClaimStatus.SETTLED, empActor, undefined, mockTx),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('CancelledState & OfficerRejectedState (Terminal Locking)', () => {
    const cancelledClaim = {
      id: 'claim-123',
      claimNumber: 'CLM-2026-CANCELLED',
      userId: 'emp-1',
      fiscalYear: 2026,
      status: ClaimStatus.CANCELLED,
      approvedAmount: 0,
    };

    const rejectedClaim = {
      id: 'claim-123',
      claimNumber: 'CLM-2026-REJECTED',
      userId: 'emp-1',
      fiscalYear: 2026,
      status: ClaimStatus.OFFICER_REJECTED,
      approvedAmount: 0,
    };

    it('should reject transitions from CancelledState', async () => {
      const actor = { id: 'admin-1', role: UserRole.SYSTEM_ADMIN };
      await expect(
        stateMachine.transition(cancelledClaim, ClaimStatus.SUBMITTED, actor, undefined, mockTx),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject transitions from OfficerRejectedState', async () => {
      const actor = { id: 'admin-1', role: UserRole.SYSTEM_ADMIN };
      await expect(
        stateMachine.transition(rejectedClaim, ClaimStatus.SUBMITTED, actor, undefined, mockTx),
      ).rejects.toThrow(BadRequestException);
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

    it('should verify canTransitionTo returns false for terminal states', () => {
      expect(new CancelledState().canTransitionTo(ClaimStatus.SUBMITTED, UserRole.SYSTEM_ADMIN, true)).toBe(false);
      expect(new OfficerRejectedState().canTransitionTo(ClaimStatus.SUBMITTED, UserRole.SYSTEM_ADMIN, true)).toBe(false);
      expect(new SettledState().canTransitionTo(ClaimStatus.SUBMITTED, UserRole.SYSTEM_ADMIN, true)).toBe(false);
    });
  });
});

