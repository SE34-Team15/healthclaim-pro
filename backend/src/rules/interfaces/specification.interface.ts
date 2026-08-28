export interface SpecificationResult {
  isPassed: boolean;
  reason?: string;
  details?: Record<string, any>;
}

export interface ISpecification<T> {
  isSatisfiedBy(candidate: T): SpecificationResult;
  and(other: ISpecification<T>): ISpecification<T>;
  or(other: ISpecification<T>): ISpecification<T>;
  not(): ISpecification<T>;
}
