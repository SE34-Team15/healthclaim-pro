import { CalculationContext, IActuarialStrategy } from '../interfaces/actuarial-strategy.interface';

export class QuotaLimitStrategy implements IActuarialStrategy {
  readonly name = 'QuotaLimitStrategy';

  execute(context: CalculationContext): void {
    const remainingQuota = context.userQuota.remainingBalance;
    const requestedReimbursement = context.state.reimbursableAmount;

    let finalReimbursement = requestedReimbursement;
    let isCapped = false;

    if (requestedReimbursement > remainingQuota) {
      finalReimbursement = Math.max(0, remainingQuota);
      isCapped = true;
    }

    context.state.reimbursableAmount = Number(finalReimbursement.toFixed(2));
    context.state.isCappedByQuota = isCapped;

    // Out-of-pocket is total claimed minus what insurance pays
    const totalClaimed = context.state.totalClaimed;
    context.state.employeeOutOfPocket = Number(
      Math.max(0, totalClaimed - finalReimbursement).toFixed(2),
    );
  }
}
