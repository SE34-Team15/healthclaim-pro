import { z } from 'zod';
import { UserRole, UserStatus } from '../enums/role.enum';

/**
 * User Public Profile Schema
 */
export const UserProfileSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  role: z.nativeEnum(UserRole),
  status: z.nativeEnum(UserStatus),
  department: z.string().nullable().optional(),
  isEmailVerified: z.boolean(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

/**
 * Self Update Profile Schema (Settings)
 */
export const UpdateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  email: z.string().email('Invalid email address').optional(),
  department: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').optional(),
});

export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;

/**
 * Update User Role Schema (Admin only)
 */
export const UpdateUserRoleSchema = z.object({
  role: z.nativeEnum(UserRole),
});

export type UpdateUserRole = z.infer<typeof UpdateUserRoleSchema>;

/**
 * Update User Status Schema (Admin only)
 */
export const UpdateUserStatusSchema = z.object({
  status: z.nativeEnum(UserStatus),
});

export type UpdateUserStatus = z.infer<typeof UpdateUserStatusSchema>;

/**
 * Admin Create User Schema
 */
export const AdminCreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.nativeEnum(UserRole),
  department: z.string().optional(),
  benefitTierId: z.string().optional(),
});

export type AdminCreateUser = z.infer<typeof AdminCreateUserSchema>;

/**
 * Admin Comprehensive User Profile & Credentials Update Schema
 */
export const AdminUpdateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  department: z.string().nullable().optional(),
  status: z.nativeEnum(UserStatus).optional(),
  role: z.nativeEnum(UserRole).optional(),
  resetPassword: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

export type AdminUpdateUserDto = z.infer<typeof AdminUpdateUserSchema>;

