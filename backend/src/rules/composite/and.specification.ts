import { ISpecification, SpecificationResult } from '../interfaces/specification.interface';
import { BaseSpecification } from './base.specification';

export class AndSpecification<T> extends BaseSpecification<T> {
  constructor(private readonly specifications: ISpecification<T>[]) {
    super();
  }

  isSatisfiedBy(candidate: T): SpecificationResult {
    const failedReasons: string[] = [];
    const detailsList: Record<string, any>[] = [];

    for (const spec of this.specifications) {
      const result = spec.isSatisfiedBy(candidate);
      if (!result.isPassed) {
        failedReasons.push(result.reason || 'Requirement failed');
        if (result.details) detailsList.push(result.details);
      }
    }

    if (failedReasons.length > 0) {
      return {
        isPassed: false,
        reason: failedReasons.join('; '),
        details: { failures: detailsList },
      };
    }

    return { isPassed: true };
  }
}
