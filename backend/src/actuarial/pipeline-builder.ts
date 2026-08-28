import { IActuarialStrategy, CalculationContext } from './interfaces/actuarial-strategy.interface';
import { CategoryCapStrategy } from './strategies/category-cap.strategy';
import { DeductibleStrategy } from './strategies/deductible.strategy';
import { TieredCoPayStrategy } from './strategies/tiered-copay.strategy';
import { QuotaLimitStrategy } from './strategies/quota-limit.strategy';

export class ActuarialPipelineBuilder {
  private strategies: IActuarialStrategy[] = [];

  withCategoryCaps(): this {
    this.strategies.push(new CategoryCapStrategy());
    return this;
  }

  withDeductibleAbsorption(): this {
    this.strategies.push(new DeductibleStrategy());
    return this;
  }

  withTieredCoPay(): this {
    this.strategies.push(new TieredCoPayStrategy());
    return this;
  }

  withQuotaLimitEnforcement(): this {
    this.strategies.push(new QuotaLimitStrategy());
    return this;
  }

  build(): (context: CalculationContext) => CalculationContext {
    const pipeline = [...this.strategies];
    return (context: CalculationContext) => {
      for (const strategy of pipeline) {
        strategy.execute(context);
      }
      return context;
    };
  }

  static createStandardPipeline() {
    return new ActuarialPipelineBuilder()
      .withCategoryCaps()
      .withDeductibleAbsorption()
      .withTieredCoPay()
      .withQuotaLimitEnforcement()
      .build();
  }
}
