import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ClaimStatus, UserRole } from '@healthclaim/shared';
import { IClaimState, ClaimTransitionContext, PrismaTransaction } from './interfaces/claim-state.interface';
import { SubmittedState } from './states/submitted.state';
import { OfficerApprovedState } from './states/officer-approved.state';
import { FinanceApprovedState } from './states/finance-approved.state';
import { SettledState } from './states/settled.state';
import { OfficerRejectedState } from './states/officer-rejected.state';
import { CancelledState } from './states/cancelled.state';

@Injectable()
export class ClaimStateMachine {
  private readonly logger = new Logger(ClaimStateMachine.name);

  /**
   * Factory method to resolve state handler instance based on ClaimStatus
   */
  getState(status: ClaimStatus): IClaimState {
    switch (status) {
      case ClaimStatus.SUBMITTED:
      case ClaimStatus.AUTO_VALIDATED:
      case ClaimStatus.FLAGGED_REVIEW:
        return new SubmittedState(status);
      case ClaimStatus.OFFICER_APPROVED:
        return new OfficerApprovedState();
      case ClaimStatus.FINANCE_APPROVED:
        return new FinanceApprovedState();
      case ClaimStatus.SETTLED:
        return new SettledState();
      case ClaimStatus.OFFICER_REJECTED:
        return new OfficerRejectedState();
      case ClaimStatus.CANCELLED:
        return new CancelledState();
      default:
        throw new BadRequestException(`Unrecognized claim status '${status}' in state machine.`);
    }
  }

  /**
   * Evaluates, validates, and executes a formal state transition on a claim
   */
  async transition(
    claim: any,
    targetStatus: ClaimStatus,
    actor: { id: string; role: UserRole },
    reason: string | undefined,
    tx: PrismaTransaction,
  ): Promise<any> {
    const currentState = this.getState(claim.status);
    const context: ClaimTransitionContext = {
      claim,
      targetStatus,
      actor,
      reason,
      tx,
    };

    // 1. Validate permissions and legal transition path
    currentState.validateTransition(context);

    // 2. Execute any state-specific side effects (e.g. quota deduction upon settlement)
    if (currentState.executeSideEffects) {
      await currentState.executeSideEffects(context);
    }

    // 3. Persist new status and audit trail fields in database
    const updatedClaim = await tx.claim.update({
      where: { id: claim.id },
      data: {
        status: targetStatus as any,
        statusReason: reason?.trim() || null,
        reviewedBy: actor.id,
        reviewedAt: new Date(),
      },
      include: {
        items: true,
        ruleEvaluations: true,
        attachments: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            department: true,
          },
        },
      },
    });

    this.logger.log(
      `Claim ${claim.claimNumber} transitioned: ${claim.status} -> ${targetStatus} by actor ${actor.id} (${actor.role})`,
    );

    return updatedClaim;
  }
}
