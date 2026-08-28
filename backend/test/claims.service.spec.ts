import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClaimsService } from '../src/claims/claims.service';
import { ClaimCategory, ClaimStatus, UserRole } from '@healthclaim/shared';

describe('ClaimsService (TDD)', () => {
  let service: ClaimsService;
  let prismaMock: any;
  let ruleEngineMock: any;
  let actuarialServiceMock: any;
  let auditServiceMock: any;

  const mockUser = {
    id: 'user-123',
    email: 'employee@healthclaim.pro',
    firstName: 'David',
    lastName: 'Miller',
    role: UserRole.EMPLOYEE,
    department: 'Engineering',
  };

  const mockQuota = {
    id: 'quota-123',
    userId: 'user-123',
    fiscalYear: 2026,
    annualLimit: 3000,
    remainingBalance: 3000,
    cumulativeDeductibleSpent: 0,
    benefitTier: {
      id: 'tier-1',
      name: 'Standard Corporate Plan',
      code: 'TIER_STANDARD',
      annualLimit: 3000,
      defaultDeductible: 100,
      defaultCoPayRate: 0.8,
    },
  };

  beforeEach(() => {
    prismaMock = {
      userPolicyQuota: {
        findUnique: vi.fn().mockResolvedValue(mockQuota),
        findMany: vi.fn().mockResolvedValue([{ fiscalYear: 2026 }]),
      },
      claim: {
        create: vi.fn().mockImplementation(({ data }: any) => ({
          id: 'claim-123',
          claimNumber: 'CLM-2026-ABCDEF',
          userId: 'user-123',
          fiscalYear: 2026,
          category: ClaimCategory.CONSULTATION,
          hospitalName: 'Singapore General Hospital',
          hospitalGrade: 'GRADE_3A',
          invoiceDate: new Date('2026-08-28'),
          totalAmount: 500,
          deductibleCovered: 100,
          coPayRate: 0.8,
          approvedAmount: 320,
          outOfPocketAmount: 180,
          status: data?.status || ClaimStatus.AUTO_VALIDATED,
          notes: null,
          items: [],
          ruleEvaluations: [],
          attachments: [],
          user: mockUser,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      $transaction: vi.fn((callback: any) => callback(prismaMock)),
    };

    ruleEngineMock = {
      evaluateCandidate: vi.fn().mockResolvedValue({
        allPassed: true,
        results: [
          {
            ruleId: 'rule-1',
            ruleCode: 'RULE_HOSPITAL_GRADE',
            ruleName: 'Hospital Grade',
            isPassed: true,
          },
        ],
      }),
    };

    actuarialServiceMock = {
      calculate: vi.fn().mockReturnValue({
        totalClaimedAmount: 500,
        eligibleAmount: 400,
        ineligibleAmount: 0,
        deductibleApplied: 100,
        remainingDeductibleBefore: 100,
        remainingDeductibleAfter: 0,
        applicableCoPayRate: 0.8,
        reimbursedAmount: 320,
        employeeOutOfPocket: 180,
        quotaBeforeClaim: 3000,
        quotaAfterClaim: 2680,
        benefitTierName: 'Standard Corporate Plan',
        isCappedByQuota: false,
        breakdownByItem: [
          {
            description: 'Specialist Consultation',
            category: ClaimCategory.CONSULTATION,
            totalPrice: 500,
            isEligible: true,
            coveredAmount: 320,
            employeeShare: 180,
          },
        ],
      }),
    };

    auditServiceMock = {
      log: vi.fn().mockResolvedValue({}),
    };

    const storageServiceMock: any = {
      deleteStoredFile: vi.fn().mockResolvedValue(undefined),
    };

    const stateMachineMock: any = {
      transition: vi.fn().mockImplementation((claim, targetStatus, actor, reason) => ({
        ...claim,
        status: targetStatus,
        statusReason: reason || null,
        reviewedBy: actor.id,
        reviewedAt: new Date(),
        items: [],
        ruleEvaluations: [],
        attachments: [],
        user: mockUser,
        invoiceDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    };

    service = new ClaimsService(
      prismaMock,
      ruleEngineMock,
      actuarialServiceMock,
      auditServiceMock,
      storageServiceMock,
      stateMachineMock,
    );
  });

  describe('previewCalculation', () => {
    it('should generate calculation preview without persisting to database', async () => {
      const preview = await service.previewCalculation('user-123', {
        category: ClaimCategory.CONSULTATION,
        invoiceDate: '2026-08-28',
        hospitalName: 'Singapore General Hospital',
        hospitalGrade: 'GRADE_3A',
        items: [
          {
            description: 'Specialist Consultation',
            category: ClaimCategory.CONSULTATION,
            unitPrice: 500,
            quantity: 1,
            totalPrice: 500,
            isEligible: true,
          },
        ],
      });

      expect(preview.reimbursedAmount).toBe(320);
      expect(preview.employeeOutOfPocket).toBe(180);
      expect(prismaMock.claim.create).not.toHaveBeenCalled();
    });
  });

  describe('submitClaim', () => {
    it('should evaluate rules, calculate actuarial numbers, and create claim', async () => {
      const createdClaim = {
        id: 'claim-123',
        claimNumber: 'CLM-2026-ABCDEF',
        userId: 'user-123',
        fiscalYear: 2026,
        category: ClaimCategory.CONSULTATION,
        hospitalName: 'Singapore General Hospital',
        hospitalGrade: 'GRADE_3A',
        invoiceDate: new Date('2026-08-28'),
        totalAmount: 500,
        deductibleCovered: 100,
        coPayRate: 0.8,
        approvedAmount: 320,
        outOfPocketAmount: 180,
        status: ClaimStatus.AUTO_VALIDATED,
        notes: null,
        items: [
          {
            id: 'item-1',
            description: 'Specialist Consultation',
            category: ClaimCategory.CONSULTATION,
            unitPrice: 500,
            quantity: 1,
            totalPrice: 500,
            isEligible: true,
            rejectionReason: null,
          },
        ],
        ruleEvaluations: [
          {
            id: 'eval-1',
            ruleId: 'rule-1',
            ruleCode: 'RULE_HOSPITAL_GRADE',
            ruleName: 'Hospital Grade',
            isPassed: true,
            reason: null,
            details: null,
          },
        ],
        user: mockUser,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.claim.create.mockResolvedValue(createdClaim);

      const result = await service.submitClaim('user-123', {
        category: ClaimCategory.CONSULTATION,
        invoiceDate: '2026-08-28',
        hospitalName: 'Singapore General Hospital',
        hospitalGrade: 'GRADE_3A',
        items: [
          {
            description: 'Specialist Consultation',
            category: ClaimCategory.CONSULTATION,
            unitPrice: 500,
            quantity: 1,
            totalPrice: 500,
            isEligible: true,
          },
        ],
      });

      expect(ruleEngineMock.evaluateCandidate).toHaveBeenCalled();
      expect(actuarialServiceMock.calculate).toHaveBeenCalled();
      expect(prismaMock.claim.create).toHaveBeenCalled();
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SUBMIT_CLAIM',
          targetResource: 'CLAIM',
        }),
      );
      expect(result.status).toBe(ClaimStatus.AUTO_VALIDATED);
      expect(result.approvedAmount).toBe(320);
    });

    it('should flag claim for review if any AST rule fails', async () => {
      ruleEngineMock.evaluateCandidate.mockResolvedValue({
        allPassed: false,
        results: [
          {
            ruleId: 'rule-1',
            ruleCode: 'RULE_HOSPITAL_GRADE',
            ruleName: 'Hospital Grade',
            isPassed: false,
            reason: 'Hospital grade unaccredited',
          },
        ],
      });

      prismaMock.claim.create.mockImplementation(({ data }: any) => ({
        id: 'claim-124',
        claimNumber: 'CLM-2026-XYZ123',
        userId: 'user-123',
        fiscalYear: 2026,
        category: ClaimCategory.CONSULTATION,
        hospitalName: 'Unaccredited Clinic',
        hospitalGrade: 'UNKNOWN',
        invoiceDate: new Date('2026-08-28'),
        totalAmount: 500,
        deductibleCovered: 100,
        coPayRate: 0.8,
        approvedAmount: 320,
        outOfPocketAmount: 180,
        status: data.status,
        notes: null,
        items: [],
        ruleEvaluations: [],
        user: mockUser,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await service.submitClaim('user-123', {
        category: ClaimCategory.CONSULTATION,
        invoiceDate: '2026-08-28',
        hospitalName: 'Unaccredited Clinic',
        hospitalGrade: 'UNKNOWN',
        items: [
          {
            description: 'Specialist Consultation',
            category: ClaimCategory.CONSULTATION,
            unitPrice: 500,
            quantity: 1,
            totalPrice: 500,
            isEligible: true,
          },
        ],
      });

      expect(result.status).toBe(ClaimStatus.FLAGGED_REVIEW);
    });

    it('should reject claim if user has no active policy quota for fiscal year', async () => {
      prismaMock.userPolicyQuota.findUnique = vi.fn().mockResolvedValue(null);
      prismaMock.userPolicyQuota.findMany = vi.fn().mockResolvedValue([]);

      await expect(
        service.submitClaim('unassigned-user', {
          category: ClaimCategory.CONSULTATION,
          invoiceDate: '2026-08-28',
          hospitalName: 'Singapore General Hospital',
          items: [
            {
              description: 'Consultation',
              category: ClaimCategory.CONSULTATION,
              unitPrice: 150,
              quantity: 1,
              totalPrice: 150,
              isEligible: true,
            },
          ],
        }),
      ).rejects.toThrow('No active medical policy quota found on your account');
    });

    it('should reject claim if invoice date is outside the active policy fiscal year', async () => {
      prismaMock.userPolicyQuota.findUnique = vi.fn().mockResolvedValue(null);
      prismaMock.userPolicyQuota.findMany = vi.fn().mockResolvedValue([{ fiscalYear: 2026 }]);

      await expect(
        service.submitClaim('user-123', {
          category: ClaimCategory.CONSULTATION,
          invoiceDate: '2024-05-10',
          hospitalName: 'Singapore General Hospital',
          items: [
            {
              description: 'Past Year Consultation',
              category: ClaimCategory.CONSULTATION,
              unitPrice: 150,
              quantity: 1,
              totalPrice: 150,
              isEligible: true,
            },
          ],
        }),
      ).rejects.toThrow('outside your active policy coverage years (2026)');
    });

    it('should correctly link and reload attachments when attachmentIds are provided', async () => {
      prismaMock.receiptAttachment = {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      };
      prismaMock.claim.findUnique = vi.fn().mockResolvedValue({
        id: 'claim-123',
        claimNumber: 'CLM-2026-ABCDEF',
        userId: 'user-123',
        fiscalYear: 2026,
        category: ClaimCategory.CONSULTATION,
        hospitalName: 'Singapore General Hospital',
        hospitalGrade: 'GRADE_3A',
        invoiceDate: new Date('2026-08-28'),
        totalAmount: 500,
        deductibleCovered: 100,
        coPayRate: 0.8,
        approvedAmount: 320,
        outOfPocketAmount: 180,
        status: ClaimStatus.AUTO_VALIDATED,
        notes: null,
        items: [],
        ruleEvaluations: [],
        attachments: [
          {
            id: 'att-1',
            fileName: 'receipt.png',
            fileSize: 1024,
            mimeType: 'image/png',
            storageKey: 'key.enc',
            checksum: 'abc',
            createdAt: new Date(),
          },
        ],
        user: mockUser,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.submitClaim('user-123', {
        category: ClaimCategory.CONSULTATION,
        invoiceDate: '2026-08-28',
        hospitalName: 'Singapore General Hospital',
        items: [
          {
            description: 'Specialist Consultation',
            category: ClaimCategory.CONSULTATION,
            unitPrice: 500,
            quantity: 1,
            totalPrice: 500,
            isEligible: true,
          },
        ],
        attachmentIds: ['att-1'],
      });

      expect(result.attachments).toHaveLength(1);
      expect(result.attachments[0].id).toBe('att-1');
    });
  });
});
