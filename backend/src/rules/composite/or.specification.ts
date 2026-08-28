import { ISpecification, SpecificationResult } from '../interfaces/specification.interface';
import { BaseSpecification } from './base.specification';

export class OrSpecification<T> extends BaseSpecification<T> {
  constructor(private readonly specifications: ISpecification<T>[]) {
    super();
  }

  isSatisfiedBy(candidate: T): SpecificationResult {
    const failedReasons: string[] = [];

    for (const spec of this.specifications) {
      const result = spec.isSatisfiedBy(candidate);
      if (result.isPassed) {
        return { isPassed: true };
      }
      failedReasons.push(result.reason || 'Option rejected');
    }

    return {
      isPassed: false,
      reason: `None of the conditions were met: [${failedReasons.join(' OR ')}]`,
    };
  }
}
