import { UserRole } from '@healthclaim/shared';
import logoPng from '../assets/logo.png';
import faviconPng from '../assets/favicon.png';

export const BRAND_CONFIG = {
  name: 'HealthClaim',
  suffix: 'Pro',
  fullName: 'HealthClaim Pro',
  slogan: 'Smarter Claims • Faster Settlements • Stronger Privacy',
  description: 'Enterprise Medical Insurance & Intelligent Settlement Platform',
  logoUrl: logoPng,
  faviconUrl: faviconPng,
  appleTouchIcon: '/apple-touch-icon.png',
  themeColor: '#0a2540',
  accentColor: '#00a88f',
  compliance: 'Zero-Trust • PDPA & HIPAA Compliant',
} as const;

export interface RoleMeta {
  title: string;
  badgeLabel: string;
  workspaceTitle: string;
  workspaceSubtitle: string;
  scopeTag: string;
}

export const ROLE_METADATA: Record<UserRole, RoleMeta> = {
  [UserRole.EMPLOYEE]: {
    title: 'Employee',
    badgeLabel: 'Employee',
    workspaceTitle: 'Employee Medical Benefits',
    workspaceSubtitle: 'Track personal healthcare allowances, deductible thresholds, and reimbursement progression.',
    scopeTag: 'Employee Operations',
  },
  [UserRole.CLAIM_OFFICER]: {
    title: 'Claim Officer',
    badgeLabel: 'Claim Officer',
    workspaceTitle: 'First-Line Audit Workspace',
    workspaceSubtitle: 'Inspect claim submissions, evaluate dynamic AST compliance rules, and review hospital invoices.',
    scopeTag: 'First-Line Audit',
  },
  [UserRole.FINANCE_MANAGER]: {
    title: 'Finance Manager',
    badgeLabel: 'Finance Manager',
    workspaceTitle: 'Financial Settlement Console',
    workspaceSubtitle: 'Execute final approvals on approved claims, initiate disbursements, and export standardized settlement statements.',
    scopeTag: 'Corporate Treasury',
  },
  [UserRole.SYSTEM_ADMIN]: {
    title: 'System Administrator',
    badgeLabel: 'System Admin',
    workspaceTitle: 'Administrator Command Hub',
    workspaceSubtitle: 'Manage corporate enterprise users, configure benefit tiers, and oversee system security parameters.',
    scopeTag: 'System Administration',
  },
  [UserRole.SECURITY_AUDITOR]: {
    title: 'Security Auditor',
    badgeLabel: 'Security Auditor',
    workspaceTitle: 'Regulatory Compliance & Audit Governance',
    workspaceSubtitle: 'Master key governance and immutable security audit logs inspection under Singapore PDPA & HIPAA standards.',
    scopeTag: 'Compliance Audit',
  },
};
