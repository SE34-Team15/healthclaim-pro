import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PoliciesService } from '../src/policies/policies.service';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

describe('PoliciesService (TDD)', () => {
  let service: PoliciesService;
  let mockPrismaService: any;

  beforeEach(() => {
    mockPrismaService = {
      benefitTier: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      userPolicyQuota: {
        upsert: vi.fn(),
        findMany: vi.fn(),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };

    service = new PoliciesService(mockPrismaService);
  });

  describe('getAllBenefitTiers', () => {
    it('should return all corporate tiers correctly formatted', async () => {
      mockPrismaService.benefitTier.findMany.mockResolvedValue([
        {
          id: 'tier-1',
          name: 'Standard Tier',
          code: 'TIER_STANDARD',
          annualLimit: 3000.0,
          defaultDeductible: 100.0,
          defaultCoPayRate: 0.8,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.getAllBenefitTiers();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Standard Tier');
      expect(result[0].annualLimit).toBe(3000.0);
    });
  });

  describe('createBenefitTier', () => {
    it('should create new tier and record audit log', async () => {
      mockPrismaService.benefitTier.findUnique.mockResolvedValue(null);
      mockPrismaService.benefitTier.create.mockResolvedValue({
        id: 'tier-new',
        name: 'VIP Elite Plan',
        code: 'TIER_VIP',
        annualLimit: 50000.0,
        defaultDeductible: 0.0,
        defaultCoPayRate: 1.0,
        isActive: true,
      });

      const result = await service.createBenefitTier(
        {
          name: 'VIP Elite Plan',
          code: 'TIER_VIP',
          annualLimit: 50000.0,
          defaultDeductible: 0.0,
          defaultCoPayRate: 1.0,
          isActive: true,
        },
        'admin-user-id',
      );

      expect(result).toBeDefined();
      expect(result.code).toBe('TIER_VIP');
      expect(mockPrismaService.auditLog.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if tier code already exists', async () => {
      mockPrismaService.benefitTier.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createBenefitTier(
          {
            name: 'Standard Tier',
            code: 'TIER_STANDARD',
            annualLimit: 3000,
            defaultDeductible: 100,
            defaultCoPayRate: 0.8,
            isActive: true,
          },
          'admin-id',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateBenefitTier', () => {
    it('should update benefit tier attributes and log action', async () => {
      mockPrismaService.benefitTier.findUnique.mockResolvedValue({
        id: 'tier-1',
        code: 'TIER_STANDARD',
        name: 'Old Name',
      });
      mockPrismaService.benefitTier.update.mockResolvedValue({
        id: 'tier-1',
        code: 'TIER_STANDARD',
        name: 'Updated Name',
        annualLimit: 4000,
        defaultDeductible: 100,
        defaultCoPayRate: 0.85,
        isActive: true,
      });

      const res = await service.updateBenefitTier(
        'tier-1',
        { name: 'Updated Name', annualLimit: 4000, defaultCoPayRate: 0.85 },
        'admin-id',
      );

      expect(res.name).toBe('Updated Name');
      expect(res.annualLimit).toBe(4000);
      expect(mockPrismaService.auditLog.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if tier does not exist', async () => {
      mockPrismaService.benefitTier.findUnique.mockResolvedValue(null);

      await expect(
        service.updateBenefitTier('unknown-tier', { name: 'New' }, 'admin-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteBenefitTier', () => {
    it('should delete tier if no active quotas reference it', async () => {
      mockPrismaService.benefitTier.findUnique.mockResolvedValue({
        id: 'tier-1',
        name: 'Unused Plan',
        code: 'TIER_UNUSED',
        userQuotas: [],
      });
      mockPrismaService.benefitTier.delete.mockResolvedValue({ id: 'tier-1' });

      const res = await service.deleteBenefitTier('tier-1', 'admin-id');
      expect(res.message).toContain('deleted successfully');
      expect(mockPrismaService.benefitTier.delete).toHaveBeenCalledWith({ where: { id: 'tier-1' } });
      expect(mockPrismaService.auditLog.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if active employee quotas are attached', async () => {
      mockPrismaService.benefitTier.findUnique.mockResolvedValue({
        id: 'tier-1',
        name: 'Active Plan',
        userQuotas: [{ id: 'quota-1' }],
      });

      await expect(service.deleteBenefitTier('tier-1', 'admin-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('assignTierToUser', () => {
    it('should upsert user policy quota and record audit log', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'emp-1', email: 'emp@test.com' });
      mockPrismaService.benefitTier.findUnique.mockResolvedValue({
        id: 'tier-1',
        code: 'TIER_EXECUTIVE',
        name: 'Executive Plan',
        annualLimit: 8000.0,
        defaultDeductible: 50.0,
        defaultCoPayRate: 0.9,
      });
      mockPrismaService.userPolicyQuota.upsert.mockResolvedValue({
        id: 'quota-1',
        userId: 'emp-1',
        fiscalYear: 2026,
        annualLimit: 8000.0,
        remainingBalance: 8000.0,
        cumulativeDeductibleSpent: 0,
        benefitTier: {
          id: 'tier-1',
          name: 'Executive Plan',
          code: 'TIER_EXECUTIVE',
          annualLimit: 8000.0,
          defaultDeductible: 50.0,
          defaultCoPayRate: 0.9,
        },
      });

      const result = await service.assignTierToUser(
        {
          userId: 'emp-1',
          benefitTierId: 'tier-1',
          fiscalYear: 2026,
        },
        'admin-id',
      );

      expect(result).toBeDefined();
      expect(result.remainingBalance).toBe(8000.0);
      expect(mockPrismaService.auditLog.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if employee does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.assignTierToUser(
          {
            userId: 'unknown-id',
            benefitTierId: 'tier-1',
            fiscalYear: 2026,
          },
          'admin-id',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if benefit tier does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'emp-1' });
      mockPrismaService.benefitTier.findUnique.mockResolvedValue(null);

      await expect(
        service.assignTierToUser(
          {
            userId: 'emp-1',
            benefitTierId: 'unknown-tier',
            fiscalYear: 2026,
          },
          'admin-id',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserQuotas', () => {
    it('should return all yearly quota records for a user', async () => {
      mockPrismaService.userPolicyQuota.findMany.mockResolvedValue([
        {
          id: 'quota-1',
          fiscalYear: 2026,
          annualLimit: 3000,
          remainingBalance: 3000,
          cumulativeDeductibleSpent: 0,
          benefitTier: {
            id: 'tier-1',
            name: 'Standard Tier',
            code: 'TIER_STANDARD',
            annualLimit: 3000,
            defaultDeductible: 100,
            defaultCoPayRate: 0.8,
          },
        },
      ]);

      const result = await service.getUserQuotas('emp-1');
      expect(result).toHaveLength(1);
      expect(result[0].fiscalYear).toBe(2026);
    });
  });
});
