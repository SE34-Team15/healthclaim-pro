import { Controller, Get, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@healthclaim/shared';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Admin Overview Telemetry
   */
  @Get('admin-overview')
  @Roles(UserRole.SYSTEM_ADMIN)
  async getAdminOverview() {
    return this.analyticsService.getAdminOverview();
  }

  /**
   * Finance Manager & Treasury Telemetry
   */
  @Get('finance')
  @Roles(UserRole.FINANCE_MANAGER, UserRole.SYSTEM_ADMIN)
  async getFinanceAnalytics() {
    return this.analyticsService.getFinanceAnalytics();
  }

  /**
   * Underwriting & AST Rule Telemetry
   */
  @Get('underwriting')
  @Roles(UserRole.CLAIM_OFFICER, UserRole.SYSTEM_ADMIN)
  async getUnderwritingAnalytics() {
    return this.analyticsService.getUnderwritingAnalytics();
  }

  /**
   * Security Auditor & Compliance Telemetry
   */
  @Get('security')
  @Roles(UserRole.SECURITY_AUDITOR, UserRole.SYSTEM_ADMIN)
  async getSecurityAnalytics() {
    return this.analyticsService.getSecurityAnalytics();
  }

  /**
   * Employee Personal Healthcare & Quota Telemetry
   */
  @Get('employee-me')
  async getEmployeeAnalytics(@CurrentUser('id') userId: string) {
    return this.analyticsService.getEmployeeAnalytics(userId);
  }
}
