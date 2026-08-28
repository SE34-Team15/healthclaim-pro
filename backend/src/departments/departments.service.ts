import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  DepartmentResponseDto,
} from '@healthclaim/shared';

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Get active departments for public registration and employee profile selection
   */
  async getActiveDepartments(): Promise<DepartmentResponseDto[]> {
    const departments = await this.prisma.department.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    return departments.map((d) => ({
      id: d.id,
      code: d.code,
      name: d.name,
      description: d.description,
      isActive: d.isActive,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));
  }

  /**
   * Get all departments with user counts for Admin governance
   */
  async getAllDepartments(): Promise<DepartmentResponseDto[]> {
    const departments = await this.prisma.department.findMany({
      orderBy: { name: 'asc' },
    });

    // Query user count per department name
    const userCounts = await this.prisma.user.groupBy({
      by: ['department'],
      _count: { id: true },
      where: { department: { not: null } },
    });

    const countMap = new Map<string, number>();
    for (const uc of userCounts) {
      if (uc.department) {
        countMap.set(uc.department, uc._count.id);
      }
    }

    return departments.map((d) => ({
      id: d.id,
      code: d.code,
      name: d.name,
      description: d.description,
      isActive: d.isActive,
      userCount: countMap.get(d.name) || countMap.get(d.code) || 0,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));
  }

  /**
   * Create a new corporate department (Admin only)
   */
  async createDepartment(
    dto: CreateDepartmentDto,
    actorId: string,
  ): Promise<DepartmentResponseDto> {
    const upperCode = dto.code.trim().toUpperCase();
    const cleanName = dto.name.trim();

    const existingCode = await this.prisma.department.findUnique({
      where: { code: upperCode },
    });
    if (existingCode) {
      throw new ConflictException(`Department code '${upperCode}' already exists.`);
    }

    const existingName = await this.prisma.department.findUnique({
      where: { name: cleanName },
    });
    if (existingName) {
      throw new ConflictException(`Department name '${cleanName}' already exists.`);
    }

    const dept = await this.prisma.department.create({
      data: {
        code: upperCode,
        name: cleanName,
        description: dto.description?.trim(),
        isActive: true,
      },
    });

    await this.auditService.log({
      actorId,
      action: 'DEPARTMENT_CREATE',
      targetResource: 'Department',
      targetResourceId: dept.id,
      details: { code: dept.code, name: dept.name },
    });

    return {
      id: dept.id,
      code: dept.code,
      name: dept.name,
      description: dept.description,
      isActive: dept.isActive,
      userCount: 0,
      createdAt: dept.createdAt,
      updatedAt: dept.updatedAt,
    };
  }

  /**
   * Update department details or toggle active status (Admin only)
   */
  async updateDepartment(
    id: string,
    dto: UpdateDepartmentDto,
    actorId: string,
  ): Promise<DepartmentResponseDto> {
    const dept = await this.prisma.department.findUnique({ where: { id } });
    if (!dept) {
      throw new NotFoundException(`Department with ID '${id}' not found.`);
    }

    if (dto.name && dto.name.trim() !== dept.name) {
      const existingName = await this.prisma.department.findUnique({
        where: { name: dto.name.trim() },
      });
      if (existingName && existingName.id !== id) {
        throw new ConflictException(`Department name '${dto.name}' already exists.`);
      }
    }

    const updated = await this.prisma.department.update({
      where: { id },
      data: {
        name: dto.name ? dto.name.trim() : undefined,
        description: dto.description !== undefined ? dto.description.trim() : undefined,
        isActive: dto.isActive !== undefined ? dto.isActive : undefined,
      },
    });

    await this.auditService.log({
      actorId,
      action: 'DEPARTMENT_UPDATE',
      targetResource: 'Department',
      targetResourceId: updated.id,
      details: {
        previous: { name: dept.name, isActive: dept.isActive },
        updated: { name: updated.name, isActive: updated.isActive },
      },
    });

    return {
      id: updated.id,
      code: updated.code,
      name: updated.name,
      description: updated.description,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Delete or soft-deactivate a department (Admin only)
   */
  async deleteDepartment(id: string, actorId: string): Promise<{ message: string }> {
    const dept = await this.prisma.department.findUnique({ where: { id } });
    if (!dept) {
      throw new NotFoundException(`Department with ID '${id}' not found.`);
    }

    // Check if users belong to this department
    const usersInDept = await this.prisma.user.count({
      where: {
        OR: [{ department: dept.name }, { department: dept.code }],
      },
    });

    if (usersInDept > 0) {
      // Soft-deactivate to protect relational integrity
      await this.prisma.department.update({
        where: { id },
        data: { isActive: false },
      });

      await this.auditService.log({
        actorId,
        action: 'DEPARTMENT_DEACTIVATE',
        targetResource: 'Department',
        targetResourceId: dept.id,
        details: { reason: 'Has active users, soft-deactivated', code: dept.code },
      });

      return {
        message: `Department '${dept.name}' has ${usersInDept} associated user(s). It has been deactivated to preserve user records.`,
      };
    }

    await this.prisma.department.delete({ where: { id } });

    await this.auditService.log({
      actorId,
      action: 'DEPARTMENT_DELETE',
      targetResource: 'Department',
      targetResourceId: dept.id,
      details: { code: dept.code, name: dept.name },
    });

    return { message: `Department '${dept.name}' deleted successfully.` };
  }
}
