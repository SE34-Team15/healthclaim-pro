import { ISpecification, SpecificationResult } from '../interfaces/specification.interface';

export abstract class BaseSpecification<T> implements ISpecification<T> {
  abstract isSatisfiedBy(candidate: T): SpecificationResult;

  and(other: ISpecification<T>): ISpecification<T> {
    const self = this;
    return new class extends BaseSpecification<T> {
      isSatisfiedBy(candidate: T): SpecificationResult {
        const r1 = self.isSatisfiedBy(candidate);
        if (!r1.isPassed) return r1;
        return other.isSatisfiedBy(candidate);
      }
    }();
  }

  or(other: ISpecification<T>): ISpecification<T> {
    const self = this;
    return new class extends BaseSpecification<T> {
      isSatisfiedBy(candidate: T): SpecificationResult {
        const r1 = self.isSatisfiedBy(candidate);
        if (r1.isPassed) return r1;
        return other.isSatisfiedBy(candidate);
      }
    }();
  }

  not(): ISpecification<T> {
    const self = this;
    return new class extends BaseSpecification<T> {
      isSatisfiedBy(candidate: T): SpecificationResult {
        const r = self.isSatisfiedBy(candidate);
        return { isPassed: !r.isPassed, reason: r.isPassed ? 'Condition negated' : undefined };
      }
    }();
  }
}

