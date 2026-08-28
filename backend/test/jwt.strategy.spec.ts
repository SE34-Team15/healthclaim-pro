import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { UnauthorizedException } from '@nestjs/common';
import { UserStatus } from '@healthclaim/shared';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let mockPrismaService: any;

  beforeEach(() => {
    mockPrismaService = {
      user: {
        findUnique: vi.fn(),
      },
    };
    strategy = new JwtStrategy(mockPrismaService);
  });

  it('should validate and return active user from payload', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({
      id: 'usr-1',
      email: 'user@healthclaim.pro',
      role: 'EMPLOYEE',
      status: UserStatus.ACTIVE,
      firstName: 'John',
      lastName: 'Doe',
      department: 'Engineering',
      isEmailVerified: true,
    });

    const user = await strategy.validate({
      sub: 'usr-1',
      email: 'user@healthclaim.pro',
      role: 'EMPLOYEE',
    });

    expect(user).toBeDefined();
    expect(user.id).toBe('usr-1');
  });

  it('should throw UnauthorizedException if user not found or inactive', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue(null);

    await expect(
      strategy.validate({
        sub: 'unknown-id',
        email: 'ghost@healthclaim.pro',
        role: 'EMPLOYEE',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
