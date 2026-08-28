import { ComparisonOperator } from '@healthclaim/shared';
import { BaseSpecification } from '../composite/base.specification';
import { SpecificationResult } from '../interfaces/specification.interface';

export class ComparisonSpecification<T extends Record<string, any>> extends BaseSpecification<T> {
  constructor(
    private readonly field: string,
    private readonly operator: ComparisonOperator,
    private readonly expectedValue: any,
  ) {
    super();
  }

  isSatisfiedBy(candidate: T): SpecificationResult {
    const actualValue = this.extractFieldValue(candidate, this.field);

    let isPassed = false;

    switch (this.operator) {
      case ComparisonOperator.EQUALS:
        isPassed = actualValue === this.expectedValue;
        break;

      case ComparisonOperator.NOT_EQUALS:
        isPassed = actualValue !== this.expectedValue;
        break;

      case ComparisonOperator.GREATER_THAN:
        isPassed = Number(actualValue) > Number(this.expectedValue);
        break;

      case ComparisonOperator.GREATER_EQUAL:
        isPassed = Number(actualValue) >= Number(this.expectedValue);
        break;

      case ComparisonOperator.LESS_THAN:
        isPassed = Number(actualValue) < Number(this.expectedValue);
        break;

      case ComparisonOperator.LESS_EQUAL:
        isPassed = Number(actualValue) <= Number(this.expectedValue);
        break;

      case ComparisonOperator.IN:
        isPassed = Array.isArray(this.expectedValue) && this.expectedValue.includes(actualValue);
        break;

      case ComparisonOperator.NOT_IN:
        isPassed = Array.isArray(this.expectedValue) && !this.expectedValue.includes(actualValue);
        break;

      case ComparisonOperator.CONTAINS:
        if (typeof actualValue === 'string') {
          isPassed = actualValue.includes(String(this.expectedValue));
        } else if (Array.isArray(actualValue)) {
          isPassed = actualValue.includes(this.expectedValue);
        }
        break;

      default:
        isPassed = false;
    }

    if (!isPassed) {
      return {
        isPassed: false,
        reason: `Field '${this.field}' (value: ${JSON.stringify(actualValue)}) failed operator '${this.operator}' against target ${JSON.stringify(this.expectedValue)}`,
        details: {
          field: this.field,
          operator: this.operator,
          actualValue,
          expectedValue: this.expectedValue,
        },
      };
    }

    return { isPassed: true };
  }

  private extractFieldValue(obj: any, path: string): any {
    if (!obj || typeof obj !== 'object') return undefined;
    return path.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), obj);
  }
}
