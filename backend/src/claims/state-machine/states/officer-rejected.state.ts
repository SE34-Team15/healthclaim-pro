import {
  IClaimState,
  ClaimTransitionContext,
} from '../interfaces/claim-state.interface';
import { ClaimStatus, UserRole } from '@healthclaim/shared';
import { BadRequestException } from '@nestjs/common';

export class OfficerRejectedState implements IClaimState {
  public readonly status = ClaimStatus.OFFICER_REJECTED;

  canTransitionTo(
    _targetStatus: ClaimStatus,
    _actorRole: UserRole,
    _isOwner: boolean,
  ): boolean {
    return false;
  }

  validateTransition(_context: ClaimTransitionContext): void {
    throw new BadRequestException(
      'This claim has been officially rejected and is closed in a terminal state.',
    );
  }
}
