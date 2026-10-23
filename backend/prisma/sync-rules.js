const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('[DB Sync] Synchronizing compliance rules and AST definitions...');

  const rules = [
    {
      code: 'RULE_HOSPITAL_GRADE',
      name: 'Accredited Healthcare Provider Requirement',
      description:
        'Medical services must be rendered by accredited Grade 3A, Grade A, or certified Specialist Clinics for straight-through auto-validation.',
      priority: 10,
      astDefinition: {
        type: 'COMPARISON',
        field: 'hospitalGrade',
        operator: 'IN',
        value: ['GRADE_3A', 'GRADE_A', 'SPECIALIST_CLINIC'],
      },
    },
    {
      code: 'RULE_DENTAL_CAP',
      name: 'Dental Single Claim Cap',
      description:
        'Individual dental reimbursement claims must not exceed $1,000 without prior specialized authorization.',
      priority: 20,
      astDefinition: {
        type: 'LOGICAL',
        operator: 'OR',
        children: [
          { type: 'COMPARISON', field: 'category', operator: 'NOT_EQUALS', value: 'DENTAL' },
          { type: 'COMPARISON', field: 'totalAmount', operator: 'LESS_EQUAL', value: 1000 },
        ],
      },
    },
    {
      code: 'RULE_MIN_AMOUNT',
      name: 'Minimum Claim Value Validation',
      description:
        'Total claim amount must be strictly greater than $0 and have positive line-item totals.',
      priority: 30,
      astDefinition: {
        type: 'COMPARISON',
        field: 'totalAmount',
        operator: 'GREATER_THAN',
        value: 0,
      },
    },
  ];

  for (const r of rules) {
    const updated = await prisma.complianceRule.upsert({
      where: { code: r.code },
      update: {
        name: r.name,
        description: r.description,
        astDefinition: r.astDefinition,
        priority: r.priority,
        isActive: true,
      },
      create: {
        code: r.code,
        name: r.name,
        description: r.description,
        priority: r.priority,
        astDefinition: r.astDefinition,
        isActive: true,
      },
    });
    console.log(`[DB Sync] Synced rule "${updated.code}" (${updated.name})`);
  }

  console.log('[DB Sync] All compliance rules successfully synchronized with form options!');
}

main()
  .catch((err) => {
    console.error('[DB Sync ERROR]:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
