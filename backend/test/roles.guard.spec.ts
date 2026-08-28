import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { UserRole } from '@healthclaim/shared';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

describe('RolesGuard (RBAC Matrix Checks)', () => {
  let rolesGuard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
  });

  function createMockExecutionContext(user: any): ExecutionContext {
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should allow access if no @Roles metadata is defined', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockExecutionContext({ role: UserRole.EMPLOYEE });

    const result = rolesGuard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should allow access when user role matches one of the required roles', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
      UserRole.SYSTEM_ADMIN,
      UserRole.SECURITY_AUDITOR,
    ]);
    const context = createMockExecutionContext({ role: UserRole.SYSTEM_ADMIN });

    const result = rolesGuard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw ForbiddenException when user has insufficient role (e.g. Employee accessing Admin endpoint)', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.SYSTEM_ADMIN]);
    const context = createMockExecutionContext({ role: UserRole.EMPLOYEE });

    expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when user object is missing in request', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.CLAIM_OFFICER]);
    const context = createMockExecutionContext(null);

    expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should enforce strict separation between Claim Officer and Finance Manager privileges', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.FINANCE_MANAGER]);
    const officerContext = createMockExecutionContext({ role: UserRole.CLAIM_OFFICER });

    expect(() => rolesGuard.canActivate(officerContext)).toThrow(ForbiddenException);
  });
});
