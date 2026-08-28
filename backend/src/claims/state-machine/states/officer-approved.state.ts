import {
  IClaimState,
  ClaimTransitionContext,
} from '../interfaces/claim-state.interface';
import { ClaimStatus, UserRole } from '@healthclaim/shared';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

export class OfficerApprovedState implements IClaimState {
  public readonly status = ClaimStatus.OFFICER_APPROVED;

  canTransitionTo(
    targetStatus: ClaimStatus,
    actorRole: UserRole,
    isOwner: boolean,
  ): boolean {
    if (targetStatus === ClaimStatus.FINANCE_APPROVED) {
      return [UserRole.FINANCE_MANAGER, UserRole.SYSTEM_ADMIN].includes(actorRole);
    }

    if (targetStatus === ClaimStatus.SETTLED) {
      return [UserRole.FINANCE_MANAGER, UserRole.SYSTEM_ADMIN].includes(actorRole);
    }

    if (targetStatus === ClaimStatus.OFFICER_REJECTED) {
      return [UserRole.CLAIM_OFFICER, UserRole.SYSTEM_ADMIN].includes(actorRole);
    }

    if (targetStatus === ClaimStatus.CANCELLED) {
      return [UserRole.CLAIM_OFFICER, UserRole.FINANCE_MANAGER, UserRole.SYSTEM_ADMIN].includes(actorRole);
    }

    return false;
  }

  validateTransition(context: ClaimTransitionContext): void {
    const { targetStatus, actor, claim, reason } = context;
    const isOwner = claim.userId === actor.id;

    if (!this.canTransitionTo(targetStatus, actor.role, isOwner)) {
      throw new ForbiddenException(
        `Role '${actor.role}' cannot transition claim from '${this.status}' to '${targetStatus}'.`,
      );
    }

    if (targetStatus === ClaimStatus.OFFICER_REJECTED && (!reason || !reason.trim())) {
      throw new BadRequestException('A reason is mandatory when reversing approval to rejection.');
    }
  }

  async executeSideEffects(context: ClaimTransitionContext): Promise<void> {
    const { targetStatus, claim, tx } = context;

    // When fast-tracking settlement directly from Officer Approved to Settled
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
