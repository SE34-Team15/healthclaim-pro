import { z } from 'zod';
import { RuleEvaluationResult } from './rule.schema';

export enum ClaimCategory {
  CONSULTATION = 'CONSULTATION',
  MEDICATION = 'MEDICATION',
  SURGERY = 'SURGERY',
  HOSPITALIZATION = 'HOSPITALIZATION',
  DENTAL = 'DENTAL',
  OPTICAL = 'OPTICAL',
  HEALTH_SCREENING = 'HEALTH_SCREENING',
  OTHER = 'OTHER',
}

export enum ClaimStatus {
  SUBMITTED = 'SUBMITTED',
  AUTO_VALIDATED = 'AUTO_VALIDATED',
  FLAGGED_REVIEW = 'FLAGGED_REVIEW',
  OFFICER_APPROVED = 'OFFICER_APPROVED',
  OFFICER_REJECTED = 'OFFICER_REJECTED',
  FINANCE_APPROVED = 'FINANCE_APPROVED',
  SETTLED = 'SETTLED',
  CANCELLED = 'CANCELLED',
}

export const ClaimItemSchema = z.object({
  id: z.string().uuid().optional(),
  description: z.string().min(1, 'Description is required'),
  category: z.nativeEnum(ClaimCategory),
  unitPrice: z.number().positive('Unit price must be greater than 0'),
  quantity: z.number().int().positive('Quantity must be at least 1').default(1),
  totalPrice: z.number().positive('Total price must be greater than 0'),
  isEligible: z.boolean().default(true),
  rejectionReason: z.string().nullable().optional(),
});

export type ClaimItem = z.infer<typeof ClaimItemSchema>;

export const CreateClaimSchema = z.object({
  category: z.nativeEnum(ClaimCategory),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  hospitalName: z.string().min(1, 'Hospital or clinic name is required'),
  hospitalGrade: z.string().optional().default('GRADE_A'),
  notes: z.string().optional(),
  items: z.array(ClaimItemSchema).min(1, 'At least one claim item is required'),
  attachmentIds: z.array(z.string().uuid()).optional().default([]),
});

export type CreateClaimRequest = z.infer<typeof CreateClaimSchema>;

export const TransitionClaimStatusSchema = z.object({
  targetStatus: z.nativeEnum(ClaimStatus),
  reason: z.string().optional(),
});

export type TransitionClaimStatusRequest = z.infer<typeof TransitionClaimStatusSchema>;

export interface ReceiptAttachmentDto {
  id: string;
  claimId?: string | null;
  fileName: string;
  fileSize: number;
  mimeType: string;
  checksum: string;
  createdAt: string;
  previewUrl?: string;
}

export interface ActuarialCalculationPreviewDto {
  totalClaimedAmount: number;
  eligibleAmount: number;
  ineligibleAmount: number;
  deductibleApplied: number;
  remainingDeductibleBefore: number;
  remainingDeductibleAfter: number;
  applicableCoPayRate: number;
  reimbursedAmount: number;
  employeeOutOfPocket: number;
  quotaBeforeClaim: number;
  quotaAfterClaim: number;
  benefitTierName: string;
  isCappedByQuota: boolean;
  breakdownByItem: {
    description: string;
    category: ClaimCategory;
    totalPrice: number;
    isEligible: boolean;
    coveredAmount: number;
    employeeShare: number;
  }[];
}

export interface ClaimResponseDto {
  id: string;
  claimNumber: string;
  userId: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    department?: string | null;
  };
  fiscalYear: number;
  category: ClaimCategory;
  hospitalName: string;
  hospitalGrade?: string | null;
  invoiceDate: string;
  totalAmount: number;
  deductibleCovered: number;
  coPayRate: number;
  approvedAmount: number;
  outOfPocketAmount: number;
  status: ClaimStatus;
  statusReason?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  notes?: string | null;
  items: ClaimItem[];
  ruleEvaluations?: RuleEvaluationResult[];
  attachments?: ReceiptAttachmentDto[];
  createdAt: string;
  updatedAt: string;
}
