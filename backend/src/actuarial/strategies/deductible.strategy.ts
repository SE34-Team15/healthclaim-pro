import { CalculationContext, IActuarialStrategy } from '../interfaces/actuarial-strategy.interface';

export class DeductibleStrategy implements IActuarialStrategy {
  readonly name = 'DeductibleStrategy';

  execute(context: CalculationContext): void {
    const planDeductible = context.benefitTier.defaultDeductible;
    const spentSoFar = context.userQuota.cumulativeDeductibleSpent;

    const remainingDeductible = Math.max(0, planDeductible - spentSoFar);
    context.state.remainingDeductibleBefore = remainingDeductible;

    // Deductible is absorbed by the eligible amount
    const eligibleAmount = context.state.eligibleAmount;
    const deductibleToApply = Math.min(eligibleAmount, remainingDeductible);

    context.state.deductibleApplied = deductibleToApply;
    context.state.remainingDeductibleAfter = Math.max(0, remainingDeductible - deductibleToApply);

    // Eligible amount remaining after deductible
    context.state.eligibleAmount = Math.max(0, eligibleAmount - deductibleToApply);
  }
}
