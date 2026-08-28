import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditService } from '../src/audit/audit.service';

describe('AuditService (TDD)', () => {
  let auditService: AuditService;
  let mockPrismaService: any;

  beforeEach(() => {
    mockPrismaService = {
      auditLog: {
        create: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
      },
    };

    auditService = new AuditService(mockPrismaService);
  });

  it('should create audit log entry with actor and metadata', async () => {
    mockPrismaService.auditLog.create.mockResolvedValue({
      id: 'log-1',
      actorId: 'usr-1',
      action: 'USER_LOGIN',
      targetResource: 'AUTH',
      targetResourceId: 'usr-1',
      details: { browser: 'Chrome' },
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla',
      createdAt: new Date(),
    });

    const res = await auditService.log({
      actorId: 'usr-1',
      action: 'USER_LOGIN',
      targetResource: 'AUTH',
      targetResourceId: 'usr-1',
      details: { browser: 'Chrome' },
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla',
    });

    expect(res).toBeDefined();
    expect(res.id).toBe('log-1');
    expect(mockPrismaService.auditLog.create).toHaveBeenCalled();
  });

  it('should query paginated audit logs with action and actor filters', async () => {
    mockPrismaService.auditLog.count.mockResolvedValue(1);
    mockPrismaService.auditLog.findMany.mockResolvedValue([
      {
        id: 'log-1',
        action: 'UPDATE_USER_ROLE',
        targetResource: 'USER',
        actor: {
          id: 'admin-1',
          email: 'admin@healthclaim.pro',
          firstName: 'Alexander',
          lastName: 'Vance',
          role: 'SYSTEM_ADMIN',
        },
      },
    ]);

    const result = await auditService.getAuditLogs({
      action: 'UPDATE_USER_ROLE',
      actorId: 'admin-1',
      page: 1,
      pageSize: 10,
    });

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].action).toBe('UPDATE_USER_ROLE');
  });
});
