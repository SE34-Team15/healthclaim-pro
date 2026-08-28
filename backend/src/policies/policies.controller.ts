import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PoliciesService } from './policies.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import {
  UserRole,
  CreateBenefitTier,
  CreateBenefitTierSchema,
  UpdateBenefitTier,
  UpdateBenefitTierSchema,
  AssignUserPolicy,
  AssignUserPolicySchema,
} from '@healthclaim/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('policies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  /**
   * List all benefit tiers
   */
  @Get('tiers')
  async getAllTiers() {
    return this.policiesService.getAllBenefitTiers();
  }

  /**
   * Create a new corporate benefit tier (Admin only)
   */
  @Post('tiers')
  @Roles(UserRole.SYSTEM_ADMIN)
  async createTier(
    @Body(new ZodValidationPipe(CreateBenefitTierSchema)) dto: CreateBenefitTier,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.policiesService.createBenefitTier(dto, actor.id);
  }

  /**
   * Update an existing benefit tier (Admin only)
   */
  @Patch('tiers/:id')
  @Roles(UserRole.SYSTEM_ADMIN)
  async updateTier(
    @Param('id') tierId: string,
    @Body(new ZodValidationPipe(UpdateBenefitTierSchema)) dto: UpdateBenefitTier,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.policiesService.updateBenefitTier(tierId, dto, actor.id);
  }

  /**
   * Delete a benefit tier (Admin only)
   */
  @Delete('tiers/:id')
  @Roles(UserRole.SYSTEM_ADMIN)
  async deleteTier(
    @Param('id') tierId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.policiesService.deleteBenefitTier(tierId, actor.id);
  }

  /**
   * Assign policy tier to an employee (Admin only)
   */
  @Post('assign')
  @Roles(UserRole.SYSTEM_ADMIN)
  async assignPolicy(
    @Body(new ZodValidationPipe(AssignUserPolicySchema)) dto: AssignUserPolicy,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.policiesService.assignTierToUser(dto, actor.id);
  }

  /**
   * Get quota breakdown for a specific user
   */
  @Get('quotas/:userId')
  async getUserQuotas(
    @Param('userId') userId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    // Regular employees can only query their own quotas
    if (currentUser.role === UserRole.EMPLOYEE && currentUser.id !== userId) {
      return this.policiesService.getUserQuotas(currentUser.id);
    }
    return this.policiesService.getUserQuotas(userId);
  }
}
