import { Controller, Get, Query, UseGuards, Res, Header } from '@nestjs/common';
import { Response } from 'express';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@healthclaim/shared';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * List system audit logs (Security Auditor & System Admin only)
   */
  @Get('logs')
  @Roles(UserRole.SECURITY_AUDITOR, UserRole.SYSTEM_ADMIN)
  async getAuditLogs(
    @Query('action') action?: string,
    @Query('actorId') actorId?: string,
    @Query('targetResource') targetResource?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.auditService.getAuditLogs({
      action,
      actorId,
      targetResource,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  /**
   * Export audit logs as CSV spreadsheet
   */
  @Get('export/csv')
  @Roles(UserRole.SECURITY_AUDITOR, UserRole.SYSTEM_ADMIN)
  async exportAuditLogsCsv(
    @Query('action') action: string | undefined,
    @Res() res: Response,
  ) {
    const csvData = await this.auditService.exportAuditLogsCsv(action);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `healthclaim_audit_logs_${dateStr}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvData);
  }
}
