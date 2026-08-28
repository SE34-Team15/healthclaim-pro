import {
  IClaimState,
  ClaimTransitionContext,
} from '../interfaces/claim-state.interface';
import { ClaimStatus, UserRole } from '@healthclaim/shared';
import { BadRequestException } from '@nestjs/common';

export class SettledState implements IClaimState {
  public readonly status = ClaimStatus.SETTLED;

  /**
   * Financial Invariant: SETTLED is an immutable terminal state.
   * Payout has already been disbursed. No transitions or cancellations permitted.
   */
  canTransitionTo(
    _targetStatus: ClaimStatus,
    _actorRole: UserRole,
    _isOwner: boolean,
  ): boolean {
    return false;
  }

  validateTransition(_context: ClaimTransitionContext): void {
    throw new BadRequestException(
      'Claim has already been settled and disbursed. Settled claims cannot be modified, rejected, or cancelled.',
    );
  }
}
