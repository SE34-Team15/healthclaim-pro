import { z } from 'zod';

export const CreateDepartmentSchema = z.object({
  code: z
    .string()
    .min(2, 'Department code must be at least 2 characters')
    .max(20, 'Department code cannot exceed 20 characters')
    .toUpperCase(),
  name: z
    .string()
    .min(2, 'Department name must be at least 2 characters')
    .max(100, 'Department name cannot exceed 100 characters'),
  description: z.string().max(255).optional(),
});

export type CreateDepartmentDto = z.infer<typeof CreateDepartmentSchema>;

export const UpdateDepartmentSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(255).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateDepartmentDto = z.infer<typeof UpdateDepartmentSchema>;

export interface DepartmentResponseDto {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  userCount?: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}
