import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalyticsService } from '../src/analytics/analytics.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { ClaimStatus, ClaimCategory } from '@prisma/client';

describe('AnalyticsService (Unit Tests)', () => {
  let service: AnalyticsService;
  let prisma: PrismaService;

  beforeEach(() => {
    prisma = {
      user: {
        count: vi.fn(),
        groupBy: vi.fn(),
      },
      department: {
        count: vi.fn(),
        findMany: vi.fn(),
      },
      benefitTier: {
        findMany: vi.fn(),
      },
      userPolicyQuota: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        groupBy: vi.fn(),
      },
      claim: {
        count: vi.fn(),
        findMany: vi.fn(),
        groupBy: vi.fn(),
      },
      ruleEvaluationLog: {
        findMany: vi.fn(),
      },
      complianceRule: {
        findMany: vi.fn(),
      },
      auditLog: {
        count: vi.fn(),
        findMany: vi.fn(),
      },
    } as unknown as PrismaService;

    service = new AnalyticsService(prisma);
  });

  describe('getAdminOverview', () => {
    it('should aggregate organization, department workforce, and policy enrollment accurately', async () => {
      (prisma.user.count as any)
        .mockResolvedValueOnce(10) // totalMembers
        .mockResolvedValueOnce(10); // activeMembers

      (prisma.department.count as any).mockResolvedValueOnce(8);
      (prisma.claim.count as any)
        .mockResolvedValueOnce(8) // totalClaimsCount
        .mockResolvedValueOnce(7); // approvedClaimsCount

      (prisma.department.findMany as any).mockResolvedValueOnce([
        { id: 'd1', code: 'ENG', name: 'Engineering & IT' },
        { id: 'd2', code: 'FIN', name: 'Finance & Treasury' },
      ]);

      (prisma.benefitTier.findMany as any).mockResolvedValueOnce([
        { id: 't1', code: 'TIER_STANDARD', name: 'Standard Plan', annualLimit: 3000 },
      ]);

      (prisma.user.groupBy as any).mockResolvedValueOnce([
        { department: 'Engineering & IT', _count: { id: 6 } },
        { department: 'Finance & Treasury', _count: { id: 2 } },
      ]);

      (prisma.claim.findMany as any).mockResolvedValueOnce([
        { id: 'c1', user: { department: 'Engineering & IT' } },
        { id: 'c2', user: { department: 'Engineering & IT' } },
        { id: 'c3', user: { department: 'Finance & Treasury' } },
      ]);

      (prisma.userPolicyQuota.groupBy as any).mockResolvedValueOnce([
        { benefitTierId: 't1', _count: { id: 8 }, _sum: { annualLimit: 24000 } },
      ]);

      (prisma.userPolicyQuota.findMany as any).mockResolvedValueOnce([
        { annualLimit: 3000, remainingBalance: 2000 },
        { annualLimit: 3000, remainingBalance: 500 },
      ]);

      const result = await service.getAdminOverview();

      expect(result.totalMembers).toBe(10);
      expect(result.activeMembers).toBe(10);
      expect(result.activeRate).toBe(100);
      expect(result.totalDepartments).toBe(8);
      expect(result.totalAllocatedPool).toBe(24000);
      expect(result.totalClaimsCount).toBe(8);
      expect(result.approvedClaimsCount).toBe(7);
      expect(result.globalApprovalRate).toBe(88);
      expect(result.departmentWorkforceAndClaims).toEqual([
        { department: 'Engineering / IT', memberCount: 6, claimCount: 2 },
        { department: 'Finance / Treasury', memberCount: 2, claimCount: 1 },
      ]);
      expect(result.departmentPerCapitaStats.length).toBe(2);
      expect(result.monthlyThroughput.length).toBe(12);
      expect(result.quotaUtilizationDistribution.length).toBe(4);
      expect(result.policyTierEnrollment).toEqual([
        { tierName: 'Standard Plan', tierCode: 'TIER_STANDARD', enrolledCount: 8, annualLimit: 3000 },
      ]);
    });
  });

  describe('getFinanceAnalytics', () => {
    it('should compute treasury solvency, dynamic department spending, and aging backlog', async () => {
      (prisma.userPolicyQuota.findMany as any).mockResolvedValueOnce([
        { annualLimit: 3000 },
        { annualLimit: 8000 },
      ]);

      (prisma.claim.findMany as any).mockResolvedValueOnce([
        {
          id: 'c1',
          status: ClaimStatus.SETTLED,
          approvedAmount: 880,
          deductibleCovered: 100,
          invoiceDate: new Date('2026-06-15'),
          createdAt: new Date(Date.now() - 3600000 * 10), // 10h ago
          user: { department: 'Engineering & IT' },
        },
        {
          id: 'c2',
          status: ClaimStatus.OFFICER_APPROVED,
          approvedAmount: 280,
          deductibleCovered: 0,
          invoiceDate: new Date('2026-07-20'),
          createdAt: new Date(Date.now() - 3600000 * 30), // 30h ago (< 48h)
          user: { department: 'Engineering & IT' },
        },
      ]);

      (prisma.department.findMany as any).mockResolvedValueOnce([
        { id: 'd1', code: 'ENG', name: 'Engineering & IT' },
      ]);

      const result = await service.getFinanceAnalytics();

      expect(result.totalCorporatePool).toBe(11000);
      expect(result.settledDisbursements).toBe(880);
      expect(result.pendingLiquidity).toBe(280);
      expect(result.deductiblesAbsorbed).toBe(100);
      expect(result.solvencyRate).toBe(92);
      expect(result.departmentSpending).toEqual([
        { department: 'Engineering / IT', totalDisbursed: 1160, claimCount: 2, avgPerClaim: 580 },
      ]);
      expect(result.agingBacklog).toEqual([
        { bucket: '< 24 Hours', amount: 0, count: 0 },
        { bucket: '24 - 48 Hours', amount: 280, count: 1 },
        { bucket: '> 48 Hours', amount: 0, count: 0 },
      ]);
    });
  });

  describe('getUnderwritingAnalytics', () => {
    it('should calculate STP rate, rule execution hotness, and hospital grade distribution', async () => {
      (prisma.claim.findMany as any).mockResolvedValueOnce([
        {
          id: 'c1',
          status: ClaimStatus.AUTO_VALIDATED,
          hospitalGrade: 'GRADE_3A',
          category: ClaimCategory.HOSPITALIZATION,
          totalAmount: 1200,
          createdAt: new Date('2026-06-15T10:00:00Z'),
          reviewedAt: new Date('2026-06-15T12:00:00Z'), // 2h latency
        },
        {
          id: 'c2',
          status: ClaimStatus.FLAGGED_REVIEW,
          hospitalGrade: 'CLINIC',
          category: ClaimCategory.DENTAL,
          totalAmount: 1250,
          createdAt: new Date('2026-08-22T10:00:00Z'),
          reviewedAt: null,
        },
      ]);

      (prisma.ruleEvaluationLog.findMany as any).mockResolvedValueOnce([
        { ruleCode: 'RULE_HOSPITAL_GRADE', ruleName: 'Hospital Grade', isPassed: true },
        { ruleCode: 'RULE_HOSPITAL_GRADE', ruleName: 'Hospital Grade', isPassed: false },
        { ruleCode: 'RULE_DENTAL_CAP', ruleName: 'Dental Cap', isPassed: false },
      ]);

      (prisma.complianceRule.findMany as any).mockResolvedValueOnce([
        { code: 'RULE_HOSPITAL_GRADE', name: 'Hospital Grade' },
        { code: 'RULE_DENTAL_CAP', name: 'Dental Cap' },
      ]);

      const result = await service.getUnderwritingAnalytics();

      expect(result.totalClaims).toBe(2);
      expect(result.autoValidatedCount).toBe(1);
      expect(result.flaggedCount).toBe(1);
      expect(result.stpRate).toBe(50);
      expect(result.avgTriageLatencyHours).toBe(2);
      expect(result.ruleExecutionStats).toEqual([
        { name: 'RULE_HOSPITAL_GRADE', ruleName: 'Hospital Grade', executions: 2, flagged: 1 },
        { name: 'RULE_DENTAL_CAP', ruleName: 'Dental Cap', executions: 1, flagged: 1 },
      ]);
      expect(result.hospitalGradeDistribution).toEqual([
        { name: 'Public Restructured Hospital', gradeCode: 'GRADE_3A', value: 1 },
        { name: 'Private GP / Family Clinic', gradeCode: 'CLINIC', value: 1 },
      ]);
    });
  });

  describe('getSecurityAnalytics', () => {
    it('should aggregate audit log domains and privileged operations', async () => {
      (prisma.auditLog.count as any).mockResolvedValueOnce(35);
      (prisma.auditLog.findMany as any).mockResolvedValueOnce([
        {
          id: 'l1',
          action: 'ADMIN_UPDATE_USER_PROFILE',
          targetResource: 'USER',
          ipAddress: '127.0.0.1',
          createdAt: new Date(),
          actor: { firstName: 'Admin', lastName: 'User', role: 'SYSTEM_ADMIN' },
        },
        {
          id: 'l2',
          action: 'SUBMIT_CLAIM',
          targetResource: 'CLAIM',
          ipAddress: '127.0.0.1',
          createdAt: new Date(),
          actor: { firstName: 'Emp', lastName: 'User', role: 'EMPLOYEE' },
        },
      ]);
      (prisma.user.count as any).mockResolvedValueOnce(10);
      (prisma.department.count as any).mockResolvedValueOnce(8);

      const result = await service.getSecurityAnalytics();

      expect(result.totalLogsCount).toBe(35);
      expect(result.privilegedOperationsCount).toBe(1);
      expect(result.complianceScore).toBe(100);
      expect(result.eventsByResource).toEqual([
        { name: 'IAM & User Mutations', resource: 'USER', value: 1 },
        { name: 'Claims Workflow', resource: 'CLAIM', value: 1 },
      ]);
      expect(result.privilegedOpsBreakdown).toEqual([
        { action: 'ADMIN UPDATE USER PROFILE', count: 1 },
      ]);
      expect(result.securityActivityTrend.length).toBe(7);
    });
  });

  describe('getEmployeeAnalytics', () => {
    it('should calculate personal quota burn rate and category breakdown', async () => {
      (prisma.userPolicyQuota.findFirst as any).mockResolvedValueOnce({
        annualLimit: 3000,
        remainingBalance: 1640,
        cumulativeDeductibleSpent: 100,
        benefitTier: { name: 'Standard Corporate Plan', defaultDeductible: 100, defaultCoPayRate: 0.8 },
      });

      (prisma.claim.findMany as any).mockResolvedValueOnce([
        {
          id: 'c1',
          totalAmount: 1200,
          approvedAmount: 880,
          status: ClaimStatus.SETTLED,
          invoiceDate: new Date('2026-06-15'),
          items: [
            { category: ClaimCategory.HOSPITALIZATION, totalPrice: 900 },
            { category: ClaimCategory.HOSPITALIZATION, totalPrice: 300 },
          ],
        },
        {
          id: 'c2',
          totalAmount: 350,
          approvedAmount: 280,
          status: ClaimStatus.OFFICER_APPROVED,
          invoiceDate: new Date('2026-07-20'),
          items: [{ category: ClaimCategory.DENTAL, totalPrice: 350 }],
        },
      ]);

      const result = await service.getEmployeeAnalytics('user-123');

      expect(result.tierName).toBe('Standard Corporate Plan');
      expect(result.totalLimit).toBe(3000);
      expect(result.remaining).toBe(1640);
      expect(result.spent).toBe(1360);
      expect(result.quotaBurnRate).toBe(45);
      expect(result.totalBilledYtd).toBe(1550);
      expect(result.totalReimbursedYtd).toBe(1160);
      expect(result.corporateSavingsRate).toBe(75);
      expect(result.categoryBreakdown).toEqual([
        { name: 'HOSPITALIZATION', value: 1200 },
        { name: 'DENTAL', value: 350 },
      ]);
    });
  });
});
