import { AstNode, LogicalOperator } from '@healthclaim/shared';
import { ISpecification } from '../interfaces/specification.interface';
import { AndSpecification } from '../composite/and.specification';
import { OrSpecification } from '../composite/or.specification';
import { NotSpecification } from '../composite/not.specification';
import { ComparisonSpecification } from '../leaf/comparison.specification';

export class RuleAstCompiler {
  static compile<T extends Record<string, any>>(ast: AstNode): ISpecification<T> {
    if (ast.type === 'COMPARISON') {
      return new ComparisonSpecification<T>(ast.field, ast.operator, ast.value);
    }

    if (ast.type === 'LOGICAL') {
      const childSpecs = ast.children.map((child) => this.compile<T>(child));

      switch (ast.operator) {
        case LogicalOperator.AND:
          return new AndSpecification<T>(childSpecs);

        case LogicalOperator.OR:
          return new OrSpecification<T>(childSpecs);

        case LogicalOperator.NOT:
          if (childSpecs.length === 0) {
            throw new Error('NOT specification requires at least one child node');
          }
          return new NotSpecification<T>(childSpecs[0]);

        default:
          throw new Error('Unsupported logical operator');
      }
    }

    throw new Error('Invalid AST Node structure');
  }
}
