import { ISpecification, SpecificationResult } from '../interfaces/specification.interface';
import { BaseSpecification } from './base.specification';

export class NotSpecification<T> extends BaseSpecification<T> {
  constructor(private readonly specification: ISpecification<T>) {
    super();
  }

  isSatisfiedBy(candidate: T): SpecificationResult {
    const result = this.specification.isSatisfiedBy(candidate);
    if (result.isPassed) {
      return {
        isPassed: false,
        reason: `Condition negated: must NOT satisfy (${result.reason || 'inner condition passed'})`,
      };
    }

    return { isPassed: true };
  }
}
