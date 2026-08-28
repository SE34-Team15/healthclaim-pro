import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Ip,
} from '@nestjs/common';
import { ClaimsService } from './claims.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  CreateClaimSchema,
  CreateClaimRequest,
  TransitionClaimStatusSchema,
  TransitionClaimStatusRequest,
  UserRole,
  ClaimStatus,
} from '@healthclaim/shared';

@Controller('claims')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Post('preview')
  async previewCalculation(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(CreateClaimSchema)) dto: CreateClaimRequest,
  ) {
    return this.claimsService.previewCalculation(userId, dto);
  }

  @Post()
  async submitClaim(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(CreateClaimSchema)) dto: CreateClaimRequest,
    @Ip() ipAddress: string,
  ) {
    return this.claimsService.submitClaim(userId, dto, ipAddress);
  }

  @Post(':id/transition')
  async transitionClaimStatus(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: UserRole },
    @Body(new ZodValidationPipe(TransitionClaimStatusSchema)) dto: TransitionClaimStatusRequest,
    @Ip() ipAddress: string,
  ) {
    return this.claimsService.transitionStatus(id, dto.targetStatus, user, dto.reason, ipAddress);
  }

  @Delete(':id/force-purge')
  @Roles(UserRole.SYSTEM_ADMIN)
  async forcePurgeClaim(
    @Param('id') id: string,
    @CurrentUser('id') adminUserId: string,
    @Ip() ipAddress: string,
  ) {
    return this.claimsService.forcePurgeClaim(id, adminUserId, ipAddress);
  }

  @Get('my-claims')
  async getMyClaims(@CurrentUser('id') userId: string) {
    return this.claimsService.getMyClaims(userId);
  }

  @Get()
  @Roles(
    UserRole.CLAIM_OFFICER,
    UserRole.FINANCE_MANAGER,
    UserRole.SYSTEM_ADMIN,
    UserRole.SECURITY_AUDITOR,
  )
  async getAllClaims(
    @Query('status') status?: ClaimStatus,
    @Query('search') search?: string,
  ) {
    return this.claimsService.getAllClaims(status, search);
  }

  @Get(':id')
  async getClaimById(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.claimsService.getClaimById(id, user);
  }
}
