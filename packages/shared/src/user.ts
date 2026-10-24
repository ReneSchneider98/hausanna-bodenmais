import { z } from 'zod';
import { idSchema } from './common.js';

export const userRoleSchema = z.enum(['admin', 'editor']);
export type UserRole = z.infer<typeof userRoleSchema>;

/** Was darf welche Rolle? (Admin: alles, Editor: alles außer Benutzer & Kanäle) */
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  editor: 'Redakteur',
};

export const userSchema = z.object({
  id: idSchema,
  email: z.string().email(),
  name: z.string(),
  role: userRoleSchema,
  active: z.boolean(),
  lastLoginAt: z.string().nullable(),
  createdAt: z.string(),
});
export type User = z.infer<typeof userSchema>;

export const passwordSchema = z.string().min(10, 'Passwort: mindestens 10 Zeichen').max(200);

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(1),
  role: userRoleSchema.default('editor'),
  password: passwordSchema,
});
export type CreateUser = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().trim().min(1).optional(),
  role: userRoleSchema.optional(),
  active: z.boolean().optional(),
  password: passwordSchema.optional(),
});
export type UpdateUser = z.infer<typeof updateUserSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});
export type Login = z.infer<typeof loginSchema>;
