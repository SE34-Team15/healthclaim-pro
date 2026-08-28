/**
 * Enterprise RBAC Roles for HealthClaim Pro
 */
export enum UserRole {
  EMPLOYEE = 'EMPLOYEE',
  CLAIM_OFFICER = 'CLAIM_OFFICER',
  FINANCE_MANAGER = 'FINANCE_MANAGER',
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  SECURITY_AUDITOR = 'SECURITY_AUDITOR',
}

/**
 * Status for user accounts
 */
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}
