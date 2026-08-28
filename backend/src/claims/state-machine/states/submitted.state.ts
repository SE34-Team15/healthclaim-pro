import {
  IClaimState,
  ClaimTransitionContext,
} from '../interfaces/claim-state.interface';
import { ClaimStatus, UserRole } from '@healthclaim/shared';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

export class SubmittedState implements IClaimState {
  constructor(public readonly status: ClaimStatus) {}

  canTransitionTo(
    targetStatus: ClaimStatus,
    actorRole: UserRole,
    isOwner: boolean,
  ): boolean {
    if (targetStatus === ClaimStatus.OFFICER_APPROVED) {
      return [UserRole.CLAIM_OFFICER, UserRole.SYSTEM_ADMIN].includes(actorRole);
    }

    if (targetStatus === ClaimStatus.OFFICER_REJECTED) {
      return [UserRole.CLAIM_OFFICER, UserRole.SYSTEM_ADMIN].includes(actorRole);
    }

    if (targetStatus === ClaimStatus.CANCELLED) {
      return (
        (isOwner && actorRole === UserRole.EMPLOYEE) ||
        [UserRole.CLAIM_OFFICER, UserRole.FINANCE_MANAGER, UserRole.SYSTEM_ADMIN].includes(actorRole)
      );
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
      throw new BadRequestException('A clear rejection reason is strictly mandatory when rejecting a claim.');
    }
  }
}
