import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record structured audit log
   */
  async log(entry: {
    actorId?: string;
    action: string;
    targetResource: string;
    targetResourceId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        actorId: entry.actorId,
        action: entry.action,
        targetResource: entry.targetResource,
        targetResourceId: entry.targetResourceId,
        details: entry.details,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    });
  }

  /**
   * Retrieve audit logs with filters (Auditor & Admin)
   */
  async getAuditLogs(params?: {
    action?: string;
    actorId?: string;
    targetResource?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 50;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (params?.action) where.action = params.action;
    if (params?.actorId) where.actorId = params.actorId;
    if (params?.targetResource) where.targetResource = params.targetResource;

    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Generate CSV format for audit log export
   */
  async exportAuditLogsCsv(action?: string): Promise<string> {
    const where: any = {};
    if (action && action !== 'ALL') where.action = action;

    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    const headers = [
      'Timestamp (ISO)',
      'Event Action',
      'Actor Name',
      'Actor Email',
      'Actor Role',
      'Target Resource',
      'Target Resource ID',
      'IP Origin',
      'Details Snapshot',
    ];

    const escapeCsv = (str: string | undefined | null) => {
      if (str === undefined || str === null) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = logs.map((log) => [
      escapeCsv(log.createdAt.toISOString()),
      escapeCsv(log.action),
      escapeCsv(log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : 'System Kernel'),
      escapeCsv(log.actor?.email || 'system'),
      escapeCsv(log.actor?.role || 'SYSTEM'),
      escapeCsv(log.targetResource),
      escapeCsv(log.targetResourceId || 'N/A'),
      escapeCsv(log.ipAddress || '127.0.0.1'),
      escapeCsv(log.details ? JSON.stringify(log.details) : ''),
    ]);

    // Prepend UTF-8 BOM (\uFEFF) so Excel opens multilingual CSV flawlessly
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    return csvContent;
  }
}
