import { describe, it, expect } from 'vitest';
import { RuleAstCompiler } from '../src/rules/parser/rule-ast.compiler';
import { AndSpecification } from '../src/rules/composite/and.specification';
import { OrSpecification } from '../src/rules/composite/or.specification';
import { NotSpecification } from '../src/rules/composite/not.specification';
import { ComparisonSpecification } from '../src/rules/leaf/comparison.specification';
import {
  AstNode,
  LogicalOperator,
  ComparisonOperator,
} from '@healthclaim/shared';

describe('Dynamic Compliance Rule Engine (TDD - Composite + Specification Patterns)', () => {
  describe('Leaf ComparisonSpecification', () => {
    it('should evaluate EQUALS and NOT_EQUALS', () => {
      const spec = new ComparisonSpecification<{ category: string }>(
        'category',
        ComparisonOperator.EQUALS,
        'DENTAL',
      );

      expect(spec.isSatisfiedBy({ category: 'DENTAL' }).isPassed).toBe(true);
      expect(spec.isSatisfiedBy({ category: 'SURGERY' }).isPassed).toBe(false);
    });

    it('should evaluate numeric comparisons (GREATER_THAN, LESS_EQUAL)', () => {
      const gtSpec = new ComparisonSpecification<{ amount: number }>(
        'amount',
        ComparisonOperator.GREATER_THAN,
        100,
      );
      expect(gtSpec.isSatisfiedBy({ amount: 150 }).isPassed).toBe(true);
      expect(gtSpec.isSatisfiedBy({ amount: 100 }).isPassed).toBe(false);

      const leSpec = new ComparisonSpecification<{ amount: number }>(
        'amount',
        ComparisonOperator.LESS_EQUAL,
        500,
      );
      expect(leSpec.isSatisfiedBy({ amount: 500 }).isPassed).toBe(true);
      expect(leSpec.isSatisfiedBy({ amount: 501 }).isPassed).toBe(false);
    });

    it('should evaluate IN and NOT_IN arrays', () => {
      const inSpec = new ComparisonSpecification<{ grade: string }>(
        'grade',
        ComparisonOperator.IN,
        ['GRADE_A', 'GRADE_3A'],
      );

      expect(inSpec.isSatisfiedBy({ grade: 'GRADE_3A' }).isPassed).toBe(true);
      expect(inSpec.isSatisfiedBy({ grade: 'UNACCREDITED' }).isPassed).toBe(false);
    });

    it('should support nested property extraction (e.g. userQuota.remainingBalance)', () => {
      const nestedSpec = new ComparisonSpecification<{ quota: { remaining: number } }>(
        'quota.remaining',
        ComparisonOperator.GREATER_EQUAL,
        1000,
      );

      expect(nestedSpec.isSatisfiedBy({ quota: { remaining: 2500 } }).isPassed).toBe(true);
      expect(nestedSpec.isSatisfiedBy({ quota: { remaining: 500 } }).isPassed).toBe(false);
    });
  });

  describe('Composite Specifications (AND, OR, NOT)', () => {
    it('should evaluate AndSpecification requiring all children to pass', () => {
      const specA = new ComparisonSpecification<any>('totalAmount', ComparisonOperator.GREATER_THAN, 0);
      const specB = new ComparisonSpecification<any>('hospitalGrade', ComparisonOperator.EQUALS, 'GRADE_A');
      const andSpec = new AndSpecification([specA, specB]);

      expect(andSpec.isSatisfiedBy({ totalAmount: 200, hospitalGrade: 'GRADE_A' }).isPassed).toBe(true);
      expect(andSpec.isSatisfiedBy({ totalAmount: 0, hospitalGrade: 'GRADE_A' }).isPassed).toBe(false);
      expect(andSpec.isSatisfiedBy({ totalAmount: 200, hospitalGrade: 'GRADE_B' }).isPassed).toBe(false);
    });

    it('should evaluate OrSpecification passing if any child passes', () => {
      const specA = new ComparisonSpecification<any>('category', ComparisonOperator.EQUALS, 'EMERGENCY');
      const specB = new ComparisonSpecification<any>('totalAmount', ComparisonOperator.LESS_EQUAL, 200);
      const orSpec = new OrSpecification([specA, specB]);

      expect(orSpec.isSatisfiedBy({ category: 'EMERGENCY', totalAmount: 5000 }).isPassed).toBe(true);
      expect(orSpec.isSatisfiedBy({ category: 'CONSULTATION', totalAmount: 150 }).isPassed).toBe(true);
      expect(orSpec.isSatisfiedBy({ category: 'CONSULTATION', totalAmount: 300 }).isPassed).toBe(false);
    });

    it('should evaluate NotSpecification negating the inner condition', () => {
      const spec = new ComparisonSpecification<any>('category', ComparisonOperator.EQUALS, 'COSMETIC');
      const notSpec = new NotSpecification(spec);

      expect(notSpec.isSatisfiedBy({ category: 'SURGERY' }).isPassed).toBe(true);
      expect(notSpec.isSatisfiedBy({ category: 'COSMETIC' }).isPassed).toBe(false);
    });
  });

  describe('RuleAstCompiler Recursive AST Parsing', () => {
    it('should compile complex multi-level nested AST: AND(OR(A, B), NOT(C))', () => {
      // AST: Hospital is GRADE_A OR Grade_3A, AND Category is NOT Cosmetic
      const ast: AstNode = {
        type: 'LOGICAL',
        operator: LogicalOperator.AND,
        children: [
          {
            type: 'LOGICAL',
            operator: LogicalOperator.OR,
            children: [
              {
                type: 'COMPARISON',
                field: 'hospitalGrade',
                operator: ComparisonOperator.EQUALS,
                value: 'GRADE_A',
              },
              {
                type: 'COMPARISON',
                field: 'hospitalGrade',
                operator: ComparisonOperator.EQUALS,
                value: 'GRADE_3A',
              },
            ],
          },
          {
            type: 'LOGICAL',
            operator: LogicalOperator.NOT,
            children: [
              {
                type: 'COMPARISON',
                field: 'category',
                operator: ComparisonOperator.EQUALS,
                value: 'COSMETIC',
              },
            ],
          },
        ],
      };

      const compiledSpec = RuleAstCompiler.compile(ast);

      // Valid: Grade 3A and Surgery
      expect(
        compiledSpec.isSatisfiedBy({
          hospitalGrade: 'GRADE_3A',
          category: 'SURGERY',
        }).isPassed,
      ).toBe(true);

      // Invalid: Grade 3A but Cosmetic
      expect(
        compiledSpec.isSatisfiedBy({
          hospitalGrade: 'GRADE_3A',
          category: 'COSMETIC',
        }).isPassed,
      ).toBe(false);

      // Invalid: Unaccredited hospital
      expect(
        compiledSpec.isSatisfiedBy({
          hospitalGrade: 'UNKNOWN',
          category: 'SURGERY',
        }).isPassed,
      ).toBe(false);
    });
  });
});
