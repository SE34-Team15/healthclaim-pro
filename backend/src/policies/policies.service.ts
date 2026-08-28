import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateBenefitTier,
  AssignUserPolicy,
} from '@healthclaim/shared';

@Injectable()
export class PoliciesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all corporate benefit tiers
   */
  async getAllBenefitTiers() {
    const tiers = await this.prisma.benefitTier.findMany({
      orderBy: { annualLimit: 'asc' },
    });

    return tiers.map((t) => ({
      id: t.id,
      name: t.name,
      code: t.code,
      description: t.description,
      annualLimit: Number(t.annualLimit),
      defaultDeductible: Number(t.defaultDeductible),
      defaultCoPayRate: Number(t.defaultCoPayRate),
      isActive: t.isActive,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  }

  /**
   * Create a new corporate benefit tier (Admin only)
   */
  async createBenefitTier(dto: CreateBenefitTier, actorId: string) {
    const existingCode = await this.prisma.benefitTier.findUnique({ where: { code: dto.code } });
    if (existingCode) {
      throw new ConflictException('A benefit tier with this code already exists');
    }

    const tier = await this.prisma.benefitTier.create({
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        annualLimit: dto.annualLimit,
        defaultDeductible: dto.defaultDeductible,
        defaultCoPayRate: dto.defaultCoPayRate,
        isActive: dto.isActive,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'CREATE_BENEFIT_TIER',
        targetResource: 'BENEFIT_TIER',
        targetResourceId: tier.id,
        details: { code: tier.code, name: tier.name, annualLimit: dto.annualLimit },
      },
    });

    return {
      ...tier,
      annualLimit: Number(tier.annualLimit),
      defaultDeductible: Number(tier.defaultDeductible),
      defaultCoPayRate: Number(tier.defaultCoPayRate),
    };
  }

  /**
   * Assign a policy tier to an employee and initialize/update quota for fiscal year
   */
  async assignTierToUser(dto: AssignUserPolicy, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException('Employee not found');
    }

    const tier = await this.prisma.benefitTier.findUnique({ where: { id: dto.benefitTierId } });
    if (!tier) {
      throw new NotFoundException('Benefit Tier not found');
    }

    const fiscalYear = dto.fiscalYear || new Date().getFullYear();

    const quota = await this.prisma.userPolicyQuota.upsert({
      where: {
        userId_fiscalYear: {
          userId: user.id,
          fiscalYear,
        },
      },
      update: {
        benefitTierId: tier.id,
        annualLimit: tier.annualLimit,
        remainingBalance: tier.annualLimit,
      },
      create: {
        userId: user.id,
        benefitTierId: tier.id,
        fiscalYear,
        annualLimit: tier.annualLimit,
        remainingBalance: tier.annualLimit,
        cumulativeDeductibleSpent: 0,
      },
      include: {
        benefitTier: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'ASSIGN_POLICY_TIER',
        targetResource: 'USER_POLICY_QUOTA',
        targetResourceId: quota.id,
        details: {
          targetUserId: user.id,
          targetEmail: user.email,
          tierCode: tier.code,
          fiscalYear,
        },
      },
    });

    return {
      id: quota.id,
      userId: quota.userId,
      fiscalYear: quota.fiscalYear,
      annualLimit: Number(quota.annualLimit),
      remainingBalance: Number(quota.remainingBalance),
      cumulativeDeductibleSpent: Number(quota.cumulativeDeductibleSpent),
      benefitTier: {
        id: quota.benefitTier.id,
        name: quota.benefitTier.name,
        code: quota.benefitTier.code,
        annualLimit: Number(quota.benefitTier.annualLimit),
        defaultDeductible: Number(quota.benefitTier.defaultDeductible),
        defaultCoPayRate: Number(quota.benefitTier.defaultCoPayRate),
      },
    };
  }

  /**
   * Get quota history for a user
   */
  async getUserQuotas(userId: string) {
    const quotas = await this.prisma.userPolicyQuota.findMany({
      where: { userId },
      include: { benefitTier: true },
      orderBy: { fiscalYear: 'desc' },
    });

    return quotas.map((q) => ({
      id: q.id,
      fiscalYear: q.fiscalYear,
      annualLimit: Number(q.annualLimit),
      remainingBalance: Number(q.remainingBalance),
      cumulativeDeductibleSpent: Number(q.cumulativeDeductibleSpent),
      benefitTier: {
        id: q.benefitTier.id,
        name: q.benefitTier.name,
        code: q.benefitTier.code,
        annualLimit: Number(q.benefitTier.annualLimit),
        defaultDeductible: Number(q.benefitTier.defaultDeductible),
        defaultCoPayRate: Number(q.benefitTier.defaultCoPayRate),
      },
    }));
  }
}
