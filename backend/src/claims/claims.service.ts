import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RuleEngineService } from '../rules/rules.service';
import { ActuarialService } from '../actuarial/actuarial.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateClaimRequest,
  ClaimResponseDto,
  ClaimStatus,
  UserRole,
  ActuarialCalculationPreviewDto,
} from '@healthclaim/shared';

@Injectable()
export class ClaimsService {
  private readonly logger = new Logger(ClaimsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ruleEngine: RuleEngineService,
    private readonly actuarialService: ActuarialService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Generates real-time actuarial calculation quote for a claim without persisting.
   */
  async previewCalculation(
    userId: string,
    dto: CreateClaimRequest,
  ): Promise<ActuarialCalculationPreviewDto> {
    const currentYear = new Date().getFullYear();

    const quota = await this.prisma.userPolicyQuota.findUnique({
      where: { userId_fiscalYear: { userId, fiscalYear: currentYear } },
      include: { benefitTier: true },
    });

    if (!quota) {
      throw new BadRequestException('No active medical policy quota found for the current fiscal year');
    }

    return this.actuarialService.calculate(
      dto.category,
      dto.items,
      {
        name: quota.benefitTier.name,
        code: quota.benefitTier.code,
        annualLimit: Number(quota.benefitTier.annualLimit),
        defaultDeductible: Number(quota.benefitTier.defaultDeductible),
        defaultCoPayRate: Number(quota.benefitTier.defaultCoPayRate),
      },
      {
        remainingBalance: Number(quota.remainingBalance),
        annualLimit: Number(quota.annualLimit),
        cumulativeDeductibleSpent: Number(quota.cumulativeDeductibleSpent),
      },
    );
  }

  /**
   * Submits a new claim: evaluates AST rules, runs actuarial calculation, and stores claim records.
   */
  async submitClaim(
    userId: string,
    dto: CreateClaimRequest,
    ipAddress?: string,
  ): Promise<ClaimResponseDto> {
    const currentYear = new Date().getFullYear();

    const quota = await this.prisma.userPolicyQuota.findUnique({
      where: { userId_fiscalYear: { userId, fiscalYear: currentYear } },
      include: { benefitTier: true },
    });

    if (!quota) {
      throw new BadRequestException('No active medical policy quota found for the current fiscal year');
    }

    const totalAmount = dto.items.reduce((sum, item) => sum + item.totalPrice, 0);

    // 1. Evaluate Dynamic Compliance Rules (AST Engine)
    const ruleEvaluation = await this.ruleEngine.evaluateCandidate({
      category: dto.category,
      totalAmount,
      hospitalName: dto.hospitalName,
      hospitalGrade: dto.hospitalGrade,
      items: dto.items,
      userQuota: {
        remainingBalance: Number(quota.remainingBalance),
        annualLimit: Number(quota.annualLimit),
        cumulativeDeductibleSpent: Number(quota.cumulativeDeductibleSpent),
      },
    });

    // 2. Run Actuarial Calculation Pipeline
    const calculation = this.actuarialService.calculate(
      dto.category,
      dto.items,
      {
        name: quota.benefitTier.name,
        code: quota.benefitTier.code,
        annualLimit: Number(quota.benefitTier.annualLimit),
        defaultDeductible: Number(quota.benefitTier.defaultDeductible),
        defaultCoPayRate: Number(quota.benefitTier.defaultCoPayRate),
      },
      {
        remainingBalance: Number(quota.remainingBalance),
        annualLimit: Number(quota.annualLimit),
        cumulativeDeductibleSpent: Number(quota.cumulativeDeductibleSpent),
      },
    );

    // Determine initial status based on automated rule audit
    const initialStatus = ruleEvaluation.allPassed
      ? ClaimStatus.AUTO_VALIDATED
      : ClaimStatus.FLAGGED_REVIEW;

    const claimNumber = `CLM-${currentYear}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // 3. Persist Claim in Database Transaction
    const claim = await this.prisma.$transaction(async (tx) => {
      const createdClaim = await tx.claim.create({
        data: {
          claimNumber,
          userId,
          fiscalYear: currentYear,
          category: dto.category as any,
          hospitalName: dto.hospitalName,
          hospitalGrade: dto.hospitalGrade || 'GRADE_A',
          invoiceDate: new Date(dto.invoiceDate),
          totalAmount,
          deductibleCovered: calculation.deductibleApplied,
          coPayRate: calculation.applicableCoPayRate,
          approvedAmount: calculation.reimbursedAmount,
          outOfPocketAmount: calculation.employeeOutOfPocket,
          status: initialStatus as any,
          notes: dto.notes,
          items: {
            create: calculation.breakdownByItem.map((item) => ({
              description: item.description,
              category: item.category as any,
              unitPrice: item.totalPrice,
              quantity: 1,
              totalPrice: item.totalPrice,
              isEligible: item.isEligible,
              rejectionReason: !item.isEligible ? 'Exceeds category reimbursement threshold' : null,
            })),
          },
          ruleEvaluations: {
            create: ruleEvaluation.results.map((r) => ({
              ruleId: r.ruleId,
              ruleCode: r.ruleCode,
              ruleName: r.ruleName,
              isPassed: r.isPassed,
              reason: r.reason,
              details: r.details,
            })),
          },
        },
        include: {
          items: true,
          ruleEvaluations: true,
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              department: true,
            },
          },
        },
      });

      return createdClaim;
    });

    // 4. Record Immutable Audit Log
    await this.auditService.log({
      actorId: userId,
      action: 'SUBMIT_CLAIM',
      targetResource: 'CLAIM',
      targetResourceId: claim.id,
      details: {
        claimNumber,
        category: dto.category,
        totalAmount,
        approvedAmount: calculation.reimbursedAmount,
        status: initialStatus,
        allRulesPassed: ruleEvaluation.allPassed,
      },
      ipAddress,
    });

    return this.mapToDto(claim);
  }

  /**
   * Retrieves all claims submitted by the current authenticated user.
   */
  async getMyClaims(userId: string): Promise<ClaimResponseDto[]> {
    const claims = await this.prisma.claim.findMany({
      where: { userId },
      include: {
        items: true,
        ruleEvaluations: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            department: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return claims.map((c) => this.mapToDto(c));
  }

  /**
   * Retrieves all claims for administrative review with optional status filtering.
   */
  async getAllClaims(status?: ClaimStatus, search?: string): Promise<ClaimResponseDto[]> {
    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { claimNumber: { contains: search, mode: 'insensitive' } },
        { hospitalName: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const claims = await this.prisma.claim.findMany({
      where,
      include: {
        items: true,
        ruleEvaluations: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            department: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return claims.map((c) => this.mapToDto(c));
  }

  /**
   * Retrieves a single claim by ID with role check.
   */
  async getClaimById(id: string, user: { id: string; role: UserRole }): Promise<ClaimResponseDto> {
    const claim = await this.prisma.claim.findUnique({
      where: { id },
      include: {
        items: true,
        ruleEvaluations: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            department: true,
          },
        },
      },
    });

    if (!claim) {
      throw new NotFoundException(`Claim with ID ${id} not found`);
    }

    // Employees can only view their own claims
    if (user.role === UserRole.EMPLOYEE && claim.userId !== user.id) {
      throw new ForbiddenException('You do not have permission to view this claim');
    }

    return this.mapToDto(claim);
  }

  private mapToDto(claim: any): ClaimResponseDto {
    return {
      id: claim.id,
      claimNumber: claim.claimNumber,
      userId: claim.userId,
      user: claim.user,
      fiscalYear: claim.fiscalYear,
      category: claim.category,
      hospitalName: claim.hospitalName,
      hospitalGrade: claim.hospitalGrade,
      invoiceDate: claim.invoiceDate.toISOString(),
      totalAmount: Number(claim.totalAmount),
      deductibleCovered: Number(claim.deductibleCovered),
      coPayRate: Number(claim.coPayRate),
      approvedAmount: Number(claim.approvedAmount),
      outOfPocketAmount: Number(claim.outOfPocketAmount),
      status: claim.status,
      notes: claim.notes,
      items: claim.items.map((i: any) => ({
        id: i.id,
        description: i.description,
        category: i.category,
        unitPrice: Number(i.unitPrice),
        quantity: i.quantity,
        totalPrice: Number(i.totalPrice),
        isEligible: i.isEligible,
        rejectionReason: i.rejectionReason,
      })),
      ruleEvaluations: claim.ruleEvaluations?.map((r: any) => ({
        ruleId: r.ruleId,
        ruleCode: r.ruleCode,
        ruleName: r.ruleName,
        isPassed: r.isPassed,
        reason: r.reason,
        details: r.details,
      })),
      createdAt: claim.createdAt.toISOString(),
      updatedAt: claim.updatedAt.toISOString(),
    };
  }
}
