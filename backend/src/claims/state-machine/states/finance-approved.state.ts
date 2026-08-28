import {
  IClaimState,
  ClaimTransitionContext,
} from '../interfaces/claim-state.interface';
import { ClaimStatus, UserRole } from '@healthclaim/shared';
import { ForbiddenException } from '@nestjs/common';

export class FinanceApprovedState implements IClaimState {
  public readonly status = ClaimStatus.FINANCE_APPROVED;

  canTransitionTo(
    targetStatus: ClaimStatus,
    actorRole: UserRole,
    isOwner: boolean,
  ): boolean {
    if (targetStatus === ClaimStatus.SETTLED) {
      return [UserRole.FINANCE_MANAGER, UserRole.SYSTEM_ADMIN].includes(actorRole);
    }

    if (targetStatus === ClaimStatus.CANCELLED) {
      return [UserRole.FINANCE_MANAGER, UserRole.SYSTEM_ADMIN].includes(actorRole);
    }

    return false;
  }

  validateTransition(context: ClaimTransitionContext): void {
    const { targetStatus, actor, claim } = context;
    const isOwner = claim.userId === actor.id;

    if (!this.canTransitionTo(targetStatus, actor.role, isOwner)) {
      throw new ForbiddenException(
        `Role '${actor.role}' cannot transition claim from '${this.status}' to '${targetStatus}'.`,
      );
    }
  }

  async executeSideEffects(context: ClaimTransitionContext): Promise<void> {
    const { targetStatus, claim, tx } = context;

    // Disburse payment & deduct policy quota on Settled
    if (targetStatus === ClaimStatus.SETTLED) {
      const quota = await tx.userPolicyQuota.findUnique({
        where: {
          userId_fiscalYear: {
            userId: claim.userId,
            fiscalYear: claim.fiscalYear,
          },
        },
      });

      if (quota) {
        const approvedAmount = Number(claim.approvedAmount);
        const deductibleCovered = Number(claim.deductibleCovered);

        const newRemaining = Math.max(0, Number(quota.remainingBalance) - approvedAmount);
        const newDeductibleSpent = Number(quota.cumulativeDeductibleSpent) + deductibleCovered;

        await tx.userPolicyQuota.update({
          where: { id: quota.id },
          data: {
            remainingBalance: newRemaining,
            cumulativeDeductibleSpent: newDeductibleSpent,
          },
        });
      }
    }
  }
}
