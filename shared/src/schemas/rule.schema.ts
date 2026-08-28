import { z } from 'zod';

export enum LogicalOperator {
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
}

export enum ComparisonOperator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  GREATER_THAN = 'GREATER_THAN',
  GREATER_EQUAL = 'GREATER_EQUAL',
  LESS_THAN = 'LESS_THAN',
  LESS_EQUAL = 'LESS_EQUAL',
  IN = 'IN',
  NOT_IN = 'NOT_IN',
  CONTAINS = 'CONTAINS',
}

export const ComparisonAstNodeSchema = z.object({
  type: z.literal('COMPARISON'),
  field: z.string().min(1),
  operator: z.nativeEnum(ComparisonOperator),
  value: z.any(),
});

export type ComparisonAstNode = z.infer<typeof ComparisonAstNodeSchema>;

export type AstNode =
  | ComparisonAstNode
  | {
      type: 'LOGICAL';
      operator: LogicalOperator;
      children: AstNode[];
    };

export const RuleAstNodeSchema: z.ZodType<AstNode> = z.lazy(() =>
  z.union([
    ComparisonAstNodeSchema,
    z.object({
      type: z.literal('LOGICAL'),
      operator: z.nativeEnum(LogicalOperator),
      children: z.array(RuleAstNodeSchema).min(1),
    }),
  ]),
);

export type LogicalAstNode = Extract<AstNode, { type: 'LOGICAL' }>;

export const ComplianceRuleSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  priority: z.number().int().default(100),
  astDefinition: RuleAstNodeSchema,
  isActive: z.boolean().default(true),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export type ComplianceRule = z.infer<typeof ComplianceRuleSchema>;

export const CreateComplianceRuleSchema = z.object({
  code: z.string().min(1, 'Rule code is required'),
  name: z.string().min(1, 'Rule name is required'),
  description: z.string().optional(),
  priority: z.number().int().optional(),
  astDefinition: RuleAstNodeSchema,
  isActive: z.boolean().default(true),
});

export type CreateComplianceRuleDto = z.infer<typeof CreateComplianceRuleSchema>;

export const UpdateComplianceRuleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: z.number().int().optional(),
  astDefinition: RuleAstNodeSchema.optional(),
  isActive: z.boolean().optional(),
});

export type UpdateComplianceRuleDto = z.infer<typeof UpdateComplianceRuleSchema>;

export const ReorderRulesSchema = z.object({
  ruleIds: z.array(z.string()).min(1, 'At least one rule ID required'),
});

export type ReorderRulesDto = z.infer<typeof ReorderRulesSchema>;

export interface RuleEvaluationResult {
  ruleId: string;
  ruleCode: string;
  ruleName: string;
  isPassed: boolean;
  reason?: string;
  details?: Record<string, any>;
}
