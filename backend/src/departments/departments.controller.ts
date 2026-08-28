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
import { DepartmentsService } from './departments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import {
  UserRole,
  CreateDepartmentDto,
  CreateDepartmentSchema,
  UpdateDepartmentDto,
  UpdateDepartmentSchema,
  DepartmentResponseDto,
} from '@healthclaim/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  /**
   * List active corporate departments (Public / for Registration & Dropdowns)
   */
  @Get()
  async getActiveDepartments(): Promise<DepartmentResponseDto[]> {
    return this.departmentsService.getActiveDepartments();
  }

  /**
   * List all departments with metrics (Admin governance only)
   */
  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN)
  async getAllDepartments(): Promise<DepartmentResponseDto[]> {
    return this.departmentsService.getAllDepartments();
  }

  /**
   * Create a new corporate department (Admin only)
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN)
  async createDepartment(
    @Body(new ZodValidationPipe(CreateDepartmentSchema)) dto: CreateDepartmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DepartmentResponseDto> {
    return this.departmentsService.createDepartment(dto, user.id);
  }

  /**
   * Update department details or toggle active status (Admin only)
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN)
  async updateDepartment(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateDepartmentSchema)) dto: UpdateDepartmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DepartmentResponseDto> {
    return this.departmentsService.updateDepartment(id, dto, user.id);
  }

  /**
   * Delete or soft-deactivate a department (Admin only)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN)
  async deleteDepartment(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    return this.departmentsService.deleteDepartment(id, user.id);
  }
}
