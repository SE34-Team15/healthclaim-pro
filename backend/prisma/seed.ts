import { PrismaClient, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for HealthClaim Pro...');

  const currentYear = new Date().getFullYear();
  const defaultPassword = await bcrypt.hash('Password123!', 10);

  // 1. Create Benefit Tiers
  console.log('Creating corporate benefit tiers...');
  const standardTier = await prisma.benefitTier.upsert({
    where: { code: 'TIER_STANDARD' },
    update: {},
    create: {
      name: 'Standard Corporate Plan',
      code: 'TIER_STANDARD',
      description: 'Standard medical coverage for full-time employees with 80% co-pay.',
      annualLimit: 3000.0,
      defaultDeductible: 100.0,
      defaultCoPayRate: 0.8,
      isActive: true,
    },
  });

  const executiveTier = await prisma.benefitTier.upsert({
    where: { code: 'TIER_EXECUTIVE' },
    update: {},
    create: {
      name: 'Executive Leadership Plan',
      code: 'TIER_EXECUTIVE',
      description: 'Enhanced medical coverage for senior management and leads with 90% co-pay.',
      annualLimit: 8000.0,
      defaultDeductible: 50.0,
      defaultCoPayRate: 0.9,
      isActive: true,
    },
  });

  const premiumTier = await prisma.benefitTier.upsert({
    where: { code: 'TIER_PREMIUM' },
    update: {},
    create: {
      name: 'Premium Global Care Plan',
      code: 'TIER_PREMIUM',
      description: 'Comprehensive global medical coverage with zero deductible and 95% co-pay.',
      annualLimit: 20000.0,
      defaultDeductible: 0.0,
      defaultCoPayRate: 0.95,
      isActive: true,
    },
  });

  // 2. Create Users for all 5 Enterprise RBAC Roles
  console.log('Creating demo users for 5 enterprise RBAC roles...');

  // System Administrator
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@healthclaim.pro' },
    update: { passwordHash: defaultPassword },
    create: {
      email: 'admin@healthclaim.pro',
      passwordHash: defaultPassword,
      firstName: 'Alexander',
      lastName: 'Vance',
      role: Role.SYSTEM_ADMIN,
      status: UserStatus.ACTIVE,
      department: 'IT Infrastructure & Security',
      isEmailVerified: true,
    },
  });

  // Claim Officer
  const officerUser = await prisma.user.upsert({
    where: { email: 'officer@healthclaim.pro' },
    update: { passwordHash: defaultPassword },
    create: {
      email: 'officer@healthclaim.pro',
      passwordHash: defaultPassword,
      firstName: 'Sarah',
      lastName: 'Jenkins',
      role: Role.CLAIM_OFFICER,
      status: UserStatus.ACTIVE,
      department: 'Medical Claims Operations',
      isEmailVerified: true,
    },
  });

  // Finance Manager
  const financeUser = await prisma.user.upsert({
    where: { email: 'finance@healthclaim.pro' },
    update: { passwordHash: defaultPassword },
    create: {
      email: 'finance@healthclaim.pro',
      passwordHash: defaultPassword,
      firstName: 'Marcus',
      lastName: 'Sterling',
      role: Role.FINANCE_MANAGER,
      status: UserStatus.ACTIVE,
      department: 'Corporate Treasury & Finance',
      isEmailVerified: true,
    },
  });

  // Security Auditor
  const auditorUser = await prisma.user.upsert({
    where: { email: 'auditor@healthclaim.pro' },
    update: { passwordHash: defaultPassword },
    create: {
      email: 'auditor@healthclaim.pro',
      passwordHash: defaultPassword,
      firstName: 'Elena',
      lastName: 'Rostova',
      role: Role.SECURITY_AUDITOR,
      status: UserStatus.ACTIVE,
      department: 'Risk Governance & Audit',
      isEmailVerified: true,
    },
  });

  // Standard Employee
  const employeeUser = await prisma.user.upsert({
    where: { email: 'employee@healthclaim.pro' },
    update: { passwordHash: defaultPassword },
    create: {
      email: 'employee@healthclaim.pro',
      passwordHash: defaultPassword,
      firstName: 'David',
      lastName: 'Miller',
      role: Role.EMPLOYEE,
      status: UserStatus.ACTIVE,
      department: 'Product Engineering',
      isEmailVerified: true,
    },
  });

  // Executive Employee
  const execEmployee = await prisma.user.upsert({
    where: { email: 'executive@healthclaim.pro' },
    update: { passwordHash: defaultPassword },
    create: {
      email: 'executive@healthclaim.pro',
      passwordHash: defaultPassword,
      firstName: 'Sophia',
      lastName: 'Chen',
      role: Role.EMPLOYEE,
      status: UserStatus.ACTIVE,
      department: 'Executive Office',
      isEmailVerified: true,
    },
  });

  // 3. Assign Quotas for Employees
  console.log('Assigning initial policy quotas for current fiscal year...');

  await prisma.userPolicyQuota.upsert({
    where: {
      userId_fiscalYear: {
        userId: employeeUser.id,
        fiscalYear: currentYear,
      },
    },
    update: {},
    create: {
      userId: employeeUser.id,
      benefitTierId: standardTier.id,
      fiscalYear: currentYear,
      annualLimit: standardTier.annualLimit,
      remainingBalance: standardTier.annualLimit,
      cumulativeDeductibleSpent: 0,
    },
  });

  await prisma.userPolicyQuota.upsert({
    where: {
      userId_fiscalYear: {
        userId: execEmployee.id,
        fiscalYear: currentYear,
      },
    },
    update: {},
    create: {
      userId: execEmployee.id,
      benefitTierId: executiveTier.id,
      fiscalYear: currentYear,
      annualLimit: executiveTier.annualLimit,
      remainingBalance: executiveTier.annualLimit,
      cumulativeDeductibleSpent: 0,
    },
  });

  // 4. Seed Dynamic Compliance Rules (AST format)
  console.log('Seeding compliance rule AST definitions...');

  // Rule 1: Hospital Qualification (Grade must be valid)
  await prisma.complianceRule.upsert({
    where: { code: 'RULE_HOSPITAL_GRADE' },
    update: {},
    create: {
      code: 'RULE_HOSPITAL_GRADE',
      name: 'Hospital Qualification Requirement',
      description: 'Medical services must be rendered by accredited Grade A, Grade 3A, or certified Specialist institutions.',
      priority: 10,
      astDefinition: {
        type: 'COMPARISON',
        field: 'hospitalGrade',
        operator: 'IN',
        value: ['GRADE_A', 'GRADE_3A', 'PUBLIC_HOSPITAL', 'SPECIALIST_CLINIC'],
      },
      isActive: true,
    },
  });

  // Rule 2: Single Dental Claim Cap ($1,000 threshold)
  await prisma.complianceRule.upsert({
    where: { code: 'RULE_DENTAL_CAP' },
    update: {},
    create: {
      code: 'RULE_DENTAL_CAP',
      name: 'Dental Single Claim Cap',
      description: 'Individual dental reimbursement claims must not exceed $1,000 without prior specialized authorization.',
      priority: 20,
      astDefinition: {
        type: 'LOGICAL',
        operator: 'OR',
        children: [
          {
            type: 'COMPARISON',
            field: 'category',
            operator: 'NOT_EQUALS',
            value: 'DENTAL',
          },
          {
            type: 'COMPARISON',
            field: 'totalAmount',
            operator: 'LESS_EQUAL',
            value: 1000,
          },
        ],
      },
      isActive: true,
    },
  });

  // Rule 3: Minimum Claim Validity & Invoice Items Required
  await prisma.complianceRule.upsert({
    where: { code: 'RULE_MIN_AMOUNT' },
    update: {},
    create: {
      code: 'RULE_MIN_AMOUNT',
      name: 'Minimum Claim Value Validation',
      description: 'Total claim amount must be strictly greater than $0 and have positive line-item totals.',
      priority: 30,
      astDefinition: {
        type: 'COMPARISON',
        field: 'totalAmount',
        operator: 'GREATER_THAN',
        value: 0,
      },
      isActive: true,
    },
  });

  // 5. Initial Seed Audit Log
  await prisma.auditLog.create({
    data: {
      action: 'SYSTEM_INITIALIZATION',
      targetResource: 'DATABASE_SEED',
      details: {
        initializedRoles: Object.values(Role),
        seededUsersCount: 6,
        seededTiersCount: 3,
        seededRulesCount: 3,
        fiscalYear: currentYear,
      },
    },
  });

  console.log('✅ Seeding completed successfully!');
  console.log('Default credentials for all users: Password123!');
  console.log('- Admin: admin@healthclaim.pro');
  console.log('- Claim Officer: officer@healthclaim.pro');
  console.log('- Finance Manager: finance@healthclaim.pro');
  console.log('- Security Auditor: auditor@healthclaim.pro');
  console.log('- Employee: employee@healthclaim.pro');
  console.log('- Executive: executive@healthclaim.pro');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
