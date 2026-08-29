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

    it('should throw BadRequestException on invalid invoice date format', async () => {
      await expect(
        service.submitClaim('user-123', {
          category: ClaimCategory.CONSULTATION,
          invoiceDate: 'invalid-date-string',
          hospitalName: 'Hospital',
          items: [],
        }),
      ).rejects.toThrow('Invalid invoice date format.');
    });
  });

  describe('transitionStatus', () => {
    it('should throw NotFoundException if claim does not exist', async () => {
      prismaMock.claim.findUnique.mockResolvedValue(null);
      await expect(
        service.transitionStatus(
          'non-existent',
          ClaimStatus.OFFICER_APPROVED,
          { id: 'officer-1', role: UserRole.CLAIM_OFFICER },
        ),
      ).rejects.toThrow('not found');
    });

    it('should transition status and record audit log', async () => {
      const existingClaim = {
        id: 'claim-123',
        status: ClaimStatus.SUBMITTED,
        userId: 'user-123',
        fiscalYear: 2026,
      };
      prismaMock.claim.findUnique.mockResolvedValue(existingClaim);

      const result = await service.transitionStatus(
        'claim-123',
        ClaimStatus.OFFICER_APPROVED,
        { id: 'officer-1', role: UserRole.CLAIM_OFFICER },
        'Approved by officer',
        '127.0.0.1',
      );

      expect(result.status).toBe(ClaimStatus.OFFICER_APPROVED);
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TRANSITION_CLAIM_STATUS',
          targetResourceId: 'claim-123',
        }),
      );
    });
  });

  describe('getMyClaims', () => {
    it('should retrieve claims belonging to the user', async () => {
      prismaMock.claim.findMany.mockResolvedValue([
        {
          id: 'claim-123',
          claimNumber: 'CLM-2026-ABCDEF',
          userId: 'user-123',
          fiscalYear: 2026,
          category: ClaimCategory.CONSULTATION,
          hospitalName: 'Hospital',
          totalAmount: 100,
          approvedAmount: 80,
          deductibleCovered: 20,
          coPayRate: 0.8,
          outOfPocketAmount: 20,
          status: ClaimStatus.SUBMITTED,
          items: [],
          ruleEvaluations: [],
          attachments: [],
          user: mockUser,
          createdAt: new Date(),
          updatedAt: new Date(),
          invoiceDate: new Date(),
        },
      ]);

      const myClaims = await service.getMyClaims('user-123');
      expect(myClaims).toHaveLength(1);
      expect(myClaims[0].id).toBe('claim-123');
      expect(prismaMock.claim.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123' },
        }),
      );
    });
  });

  describe('getAllClaims', () => {
    it('should filter by single status or multiple statuses and search term', async () => {
      prismaMock.claim.findMany.mockResolvedValue([]);

      await service.getAllClaims('SUBMITTED', 'Singapore');
      expect(prismaMock.claim.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'SUBMITTED',
            OR: expect.any(Array),
          }),
        }),
      );

      await service.getAllClaims('SUBMITTED,AUTO_VALIDATED', undefined);
      expect(prismaMock.claim.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['SUBMITTED', 'AUTO_VALIDATED'] },
          }),
        }),
      );
    });
  });

  describe('getClaimById', () => {
    it('should throw NotFoundException if claim not found', async () => {
      prismaMock.claim.findUnique.mockResolvedValue(null);
      await expect(
        service.getClaimById('missing-claim', { id: 'user-1', role: UserRole.EMPLOYEE }),
      ).rejects.toThrow('not found');
    });

    it('should throw ForbiddenException if employee views another user claim', async () => {
      prismaMock.claim.findUnique.mockResolvedValue({
        id: 'claim-123',
        userId: 'user-other',
      });

      await expect(
        service.getClaimById('claim-123', { id: 'user-1', role: UserRole.EMPLOYEE }),
      ).rejects.toThrow('You do not have permission to view this claim voucher.');
    });

    it('should return claim if employee views their own claim or if reviewer views claim', async () => {
      const claim = {
        id: 'claim-123',
        claimNumber: 'CLM-2026-ABCDEF',
        userId: 'user-1',
        fiscalYear: 2026,
        category: ClaimCategory.CONSULTATION,
        hospitalName: 'Hospital',
        totalAmount: 100,
        approvedAmount: 80,
        deductibleCovered: 20,
        coPayRate: 0.8,
        outOfPocketAmount: 20,
        status: ClaimStatus.SUBMITTED,
        items: [],
        ruleEvaluations: [],
        attachments: [],
        user: mockUser,
        createdAt: new Date(),
        updatedAt: new Date(),
        invoiceDate: new Date(),
      };
      prismaMock.claim.findUnique.mockResolvedValue(claim);

      const res = await service.getClaimById('claim-123', { id: 'user-1', role: UserRole.EMPLOYEE });
      expect(res.id).toBe('claim-123');

      const officerRes = await service.getClaimById('claim-123', { id: 'officer-1', role: UserRole.CLAIM_OFFICER });
      expect(officerRes.id).toBe('claim-123');
    });
  });

  describe('forcePurgeClaim', () => {
    it('should throw NotFoundException if claim is missing', async () => {
      prismaMock.claim.findUnique.mockResolvedValue(null);
      await expect(service.forcePurgeClaim('missing-claim', 'admin-1')).rejects.toThrow('not found');
    });

    it('should delete storage attachments and cascade delete DB claim', async () => {
      prismaMock.claim.findUnique.mockResolvedValue({
        id: 'claim-123',
        attachments: [{ storageKey: 'key1.enc' }, { storageKey: 'key2.enc' }],
      });
      prismaMock.claim.delete = vi.fn().mockResolvedValue({});

      const result = await service.forcePurgeClaim('claim-123', 'admin-1', '127.0.0.1');
      expect(result.success).toBe(true);
      expect(prismaMock.claim.delete).toHaveBeenCalledWith({ where: { id: 'claim-123' } });
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'FORCE_PURGE_CLAIM',
        }),
      );
    });
  });
});

