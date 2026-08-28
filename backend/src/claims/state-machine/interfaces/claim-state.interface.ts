import { ClaimStatus, UserRole } from '@healthclaim/shared';
import { PrismaClient } from '@prisma/client';

export type PrismaTransaction = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export interface ClaimTransitionContext {
  claim: any;
  targetStatus: ClaimStatus;
  actor: { id: string; role: UserRole };
  reason?: string;
  tx: PrismaTransaction;
}

export interface IClaimState {
  readonly status: ClaimStatus;
  canTransitionTo(targetStatus: ClaimStatus, actorRole: UserRole, isOwner: boolean): boolean;
  validateTransition(context: ClaimTransitionContext): void;
  executeSideEffects?(context: ClaimTransitionContext): Promise<void>;
}
