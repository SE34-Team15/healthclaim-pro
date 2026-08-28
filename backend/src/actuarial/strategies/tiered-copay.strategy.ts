import { CalculationContext, IActuarialStrategy } from '../interfaces/actuarial-strategy.interface';

export class TieredCoPayStrategy implements IActuarialStrategy {
  readonly name = 'TieredCoPayStrategy';

  execute(context: CalculationContext): void {
    const postDeductibleAmount = context.state.eligibleAmount;
    const baseCoPayRate = context.benefitTier.defaultCoPayRate;

    context.state.applicableCoPayRate = baseCoPayRate;

    // Standard reimbursement calculation based on policy co-pay rate
    const reimbursable = postDeductibleAmount * baseCoPayRate;
    context.state.reimbursableAmount = Number(reimbursable.toFixed(2));
  }
}
