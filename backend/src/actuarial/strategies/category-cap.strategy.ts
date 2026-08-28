import { ClaimCategory } from '@healthclaim/shared';
import { CalculationContext, IActuarialStrategy } from '../interfaces/actuarial-strategy.interface';

export class CategoryCapStrategy implements IActuarialStrategy {
  readonly name = 'CategoryCapStrategy';

  // Category specific ceiling caps
  private readonly categoryCaps: Partial<Record<ClaimCategory, number>> = {
    [ClaimCategory.DENTAL]: 1000.0,
    [ClaimCategory.OPTICAL]: 500.0,
    [ClaimCategory.HEALTH_SCREENING]: 800.0,
  };

  execute(context: CalculationContext): void {
    let eligibleSum = 0;
    let ineligibleSum = 0;

    const categorySubtotals: Partial<Record<ClaimCategory, number>> = {};

    for (const item of context.items) {
      const currentCatTotal = (categorySubtotals[item.category] || 0) + item.totalPrice;
      categorySubtotals[item.category] = currentCatTotal;

      const cap = this.categoryCaps[item.category];
      let itemEligible = item.totalPrice;
      let isEligible = true;

      // If category has a cap and this item exceeds the cap
      if (cap !== undefined && currentCatTotal > cap) {
        const excess = currentCatTotal - cap;
        itemEligible = Math.max(0, item.totalPrice - excess);
        if (itemEligible <= 0) {
          isEligible = false;
        }
      }

      const itemIneligible = item.totalPrice - itemEligible;
      eligibleSum += itemEligible;
      ineligibleSum += itemIneligible;

      context.state.itemBreakdown.push({
        description: item.description,
        category: item.category,
        totalPrice: item.totalPrice,
        isEligible,
        coveredAmount: itemEligible,
        employeeShare: itemIneligible,
      });
    }

    context.state.totalClaimed = eligibleSum + ineligibleSum;
    context.state.eligibleAmount = eligibleSum;
    context.state.ineligibleAmount = ineligibleSum;
  }
}
