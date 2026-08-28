import {
  IClaimState,
  ClaimTransitionContext,
} from '../interfaces/claim-state.interface';
import { ClaimStatus, UserRole } from '@healthclaim/shared';
import { BadRequestException } from '@nestjs/common';

export class CancelledState implements IClaimState {
  public readonly status = ClaimStatus.CANCELLED;

  canTransitionTo(
    _targetStatus: ClaimStatus,
    _actorRole: UserRole,
    _isOwner: boolean,
  ): boolean {
    return false;
  }

  validateTransition(_context: ClaimTransitionContext): void {
    throw new BadRequestException(
      'This claim has been archived/cancelled and is closed in a terminal state.',
    );
  }
}
