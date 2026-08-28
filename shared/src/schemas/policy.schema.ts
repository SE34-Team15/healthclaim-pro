import { z } from 'zod';

/**
 * Benefit Tier Schema
 */
export const BenefitTierSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Tier name is required'),
  code: z.string().min(1, 'Tier code is required'),
  description: z.string().nullable().optional(),
  annualLimit: z.number().nonnegative(),
  defaultDeductible: z.number().nonnegative(),
  defaultCoPayRate: z.number().min(0).max(1),
  isActive: z.boolean().default(true),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export type BenefitTier = z.infer<typeof BenefitTierSchema>;

/**
 * Create Benefit Tier Request Schema
 */
export const CreateBenefitTierSchema = z.object({
  name: z.string().min(1, 'Tier name is required'),
  code: z.string().min(1, 'Tier code is required'),
  description: z.string().optional(),
  annualLimit: z.number().positive('Annual limit must be greater than 0'),
  defaultDeductible: z.number().nonnegative('Deductible cannot be negative'),
  defaultCoPayRate: z.number().min(0).max(1, 'Co-pay rate must be between 0 and 1'),
  isActive: z.boolean().default(true),
});

export type CreateBenefitTier = z.infer<typeof CreateBenefitTierSchema>;

/**
 * User Policy Quota & Balance Schema
 */
export const UserPolicyQuotaSchema = z.object({
  id: z.string(),
  userId: z.string(),
  benefitTierId: z.string(),
  fiscalYear: z.number().int(),
  annualLimit: z.number().nonnegative(),
  remainingBalance: z.number().nonnegative(),
  cumulativeDeductibleSpent: z.number().nonnegative(),
  benefitTier: BenefitTierSchema.optional(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export type UserPolicyQuota = z.infer<typeof UserPolicyQuotaSchema>;

/**
 * Assign Policy Tier to User Request Schema
 */
export const AssignUserPolicySchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  benefitTierId: z.string().min(1, 'Benefit Tier ID is required'),
  fiscalYear: z.number().int().default(() => new Date().getFullYear()),
});

export type AssignUserPolicy = z.infer<typeof AssignUserPolicySchema>;
