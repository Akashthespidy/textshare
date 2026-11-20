import { z } from 'zod'

// ── Username ───────────────────────────────────────────────────────────────

export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers, and underscores allowed')

// ── Create user ────────────────────────────────────────────────────────────

export const createUserSchema = z.object({
  username: usernameSchema,
  name: z.string().min(1, 'Name is required').max(60).trim(),
})

export type CreateUserInput = z.infer<typeof createUserSchema>

// ── Update user ────────────────────────────────────────────────────────────

export const updateUserSchema = z.object({
  name: z.string().min(1).max(60).trim().optional(),
  avatarUrl: z.string().url().optional().nullable(),
})

export type UpdateUserInput = z.infer<typeof updateUserSchema>

// ── Send message ───────────────────────────────────────────────────────────

export const sendMessageSchema = z.object({
  toUsername: usernameSchema,
  content: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(100_000, 'Message too long (max 100,000 characters)'),
})

export type SendMessageInput = z.infer<typeof sendMessageSchema>

// ── Search query ───────────────────────────────────────────────────────────

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(50).optional(),
})
