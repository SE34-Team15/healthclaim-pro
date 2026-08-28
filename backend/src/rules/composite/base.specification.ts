import { ISpecification, SpecificationResult } from '../interfaces/specification.interface';

export abstract class BaseSpecification<T> implements ISpecification<T> {
  abstract isSatisfiedBy(candidate: T): SpecificationResult;

  and(other: ISpecification<T>): ISpecification<T> {
    const { AndSpecification } = require('./and.specification');
    return new AndSpecification([this, other]);
  }

  or(other: ISpecification<T>): ISpecification<T> {
    const { OrSpecification } = require('./or.specification');
    return new OrSpecification([this, other]);
  }

  not(): ISpecification<T> {
    const { NotSpecification } = require('./not.specification');
    return new NotSpecification(this);
  }
}
