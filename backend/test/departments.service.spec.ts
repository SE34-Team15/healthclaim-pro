import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DepartmentsService } from '../src/departments/departments.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('DepartmentsService (TDD)', () => {
  let service: DepartmentsService;
  let mockPrismaService: any;
  let mockAuditService: any;

  beforeEach(() => {
    mockPrismaService = {
      department: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      user: {
        groupBy: vi.fn().mockResolvedValue([]),
        count: vi.fn(),
      },
    };

    mockAuditService = {
      log: vi.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    service = new DepartmentsService(mockPrismaService, mockAuditService);
  });

  describe('getActiveDepartments', () => {
    it('should return active departments', async () => {
      mockPrismaService.department.findMany.mockResolvedValue([
        {
          id: 'dept-1',
          code: 'ENG',
          name: 'Engineering',
          description: 'Software Eng',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.getActiveDepartments();
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('ENG');
      expect(result[0].name).toBe('Engineering');
    });
  });

  describe('getAllDepartments', () => {
    it('should return all departments with user count aggregates', async () => {
      mockPrismaService.department.findMany.mockResolvedValue([
        {
          id: 'dept-1',
          code: 'ENG',
          name: 'Engineering',
          description: 'Software Eng',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      mockPrismaService.user.groupBy.mockResolvedValue([
        {
          department: 'Engineering',
          _count: { id: 5 },
        },
      ]);

      const result = await service.getAllDepartments();
      expect(result).toHaveLength(1);
      expect(result[0].userCount).toBe(5);
    });
  });

  describe('createDepartment', () => {
    it('should create new department and audit log', async () => {
      mockPrismaService.department.findUnique.mockResolvedValue(null);
      mockPrismaService.department.create.mockResolvedValue({
        id: 'dept-new',
        code: 'AI_LAB',
        name: 'AI Research Lab',
        description: 'Machine Learning',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createDepartment(
        {
          code: 'ai_lab',
          name: 'AI Research Lab',
          description: 'Machine Learning',
        },
        'admin-1',
      );

      expect(result.code).toBe('AI_LAB');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DEPARTMENT_CREATE',
          targetResourceId: 'dept-new',
        }),
      );
    });

    it('should throw ConflictException if department code exists', async () => {
      mockPrismaService.department.findUnique.mockResolvedValueOnce({
        id: 'dept-existing',
        code: 'ENG',
        name: 'Engineering',
      });

      await expect(
        service.createDepartment(
          { code: 'ENG', name: 'Engineering Devs' },
          'admin-1',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateDepartment', () => {
    it('should update department details', async () => {
      mockPrismaService.department.findUnique
        .mockResolvedValueOnce({
          id: 'dept-1',
          code: 'ENG',
          name: 'Engineering',
          isActive: true,
        })
        .mockResolvedValueOnce(null);

      mockPrismaService.department.update.mockResolvedValue({
        id: 'dept-1',
        code: 'ENG',
        name: 'Engineering & AI',
        description: 'Updated description',
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.updateDepartment(
        'dept-1',
        { name: 'Engineering & AI', isActive: false },
        'admin-1',
      );

      expect(result.name).toBe('Engineering & AI');
      expect(result.isActive).toBe(false);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DEPARTMENT_UPDATE' }),
      );
    });
  });

  describe('deleteDepartment', () => {
    it('should delete department if no users are associated', async () => {
      mockPrismaService.department.findUnique.mockResolvedValue({
        id: 'dept-1',
        code: 'TEST',
        name: 'Test Dept',
      });
      mockPrismaService.user.count.mockResolvedValue(0);
      mockPrismaService.department.delete.mockResolvedValue({});

      const result = await service.deleteDepartment('dept-1', 'admin-1');
      expect(result.message).toContain('deleted successfully');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DEPARTMENT_DELETE' }),
      );
    });

    it('should soft-deactivate department if users are associated', async () => {
      mockPrismaService.department.findUnique.mockResolvedValue({
        id: 'dept-1',
        code: 'ENG',
        name: 'Engineering',
      });
      mockPrismaService.user.count.mockResolvedValue(3);
      mockPrismaService.department.update.mockResolvedValue({
        id: 'dept-1',
        isActive: false,
      });

      const result = await service.deleteDepartment('dept-1', 'admin-1');
      expect(result.message).toContain('deactivated to preserve user records');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DEPARTMENT_DEACTIVATE' }),
      );
    });
  });
});
