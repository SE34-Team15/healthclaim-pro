import { ClaimCategory } from '@healthclaim/shared';

export interface ActuarialItemInput {
  description: string;
  category: ClaimCategory;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface CalculationContext {
  claimCategory: ClaimCategory;
  items: ActuarialItemInput[];
  benefitTier: {
    name: string;
    code: string;
    annualLimit: number;
    defaultDeductible: number;
    defaultCoPayRate: number;
  };
  userQuota: {
    remainingBalance: number;
    annualLimit: number;
    cumulativeDeductibleSpent: number;
  };
  // Mutable state accumulated across pipeline execution
  state: {
    totalClaimed: number;
    eligibleAmount: number;
    ineligibleAmount: number;
    deductibleApplied: number;
    remainingDeductibleBefore: number;
    remainingDeductibleAfter: number;
    applicableCoPayRate: number;
    reimbursableAmount: number;
    employeeOutOfPocket: number;
    isCappedByQuota: boolean;
    itemBreakdown: {
      description: string;
      category: ClaimCategory;
      totalPrice: number;
      isEligible: boolean;
      coveredAmount: number;
      employeeShare: number;
    }[];
  };
}

export interface IActuarialStrategy {
  readonly name: string;
  execute(context: CalculationContext): void;
}
