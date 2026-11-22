import { db } from './drizzle'
import { users, messages } from './schema'
import { eq, or, and, ilike, lt } from 'drizzle-orm'
import type { User, Message, NewUser } from './schema'

// ── Re-export types for convenience ──────────────────────────────────────────
export type { User as UserProfile, Message }

// ── Users ─────────────────────────────────────────────────────────────────────

export async function getUserByClerkId(clerkId: string): Promise<User | null> {
  const rows = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1)
  return rows[0] ?? null
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const rows = await db.select().from(users).where(eq(users.username, username)).limit(1)
  return rows[0] ?? null
}

export async function isUsernameTaken(username: string): Promise<boolean> {
  const rows = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1)
  return rows.length > 0
}

export async function createUser(data: NewUser): Promise<User> {
  const rows = await db.insert(users).values(data).returning()
  return rows[0]
}

export async function updateUser(clerkId: string, data: Partial<Pick<User, 'name' | 'avatarUrl'>>): Promise<User> {
  const rows = await db.update(users).set(data).where(eq(users.clerkId, clerkId)).returning()
  if (!rows[0]) throw new Error('User not found')
  return rows[0]
}

export async function deleteUser(clerkId: string): Promise<void> {
  await db.delete(users).where(eq(users.clerkId, clerkId))
}

export async function searchUsers(query: string): Promise<User[]> {
  return db
    .select()
    .from(users)
    .where(
      or(
        ilike(users.username, `%${query}%`),
        ilike(users.name, `%${query}%`)
      )
    )
    .limit(20)
}

// ── Messages ──────────────────────────────────────────────────────────────────

export async function getMessages(clerkIdA: string, clerkIdB: string): Promise<Message[]> {
  void triggerAutoCleanup()
  return db
    .select()
    .from(messages)
    .where(
      or(
        and(eq(messages.senderId, clerkIdA), eq(messages.receiverId, clerkIdB)),
        and(eq(messages.senderId, clerkIdB), eq(messages.receiverId, clerkIdA))
      )
    )
    .orderBy(messages.createdAt)
}

export async function sendMessage(
  senderId: string,
  receiverId: string,
  content: string
): Promise<Message> {
  void triggerAutoCleanup()
  const rows = await db
    .insert(messages)
    .values({ senderId, receiverId, content })
    .returning()
  return rows[0]
}

export async function getConversationPartnerIds(clerkId: string): Promise<string[]> {
  void triggerAutoCleanup()
  // Get all unique users this person has exchanged messages with
  const sent = await db
    .selectDistinct({ partnerId: messages.receiverId })
    .from(messages)
    .where(eq(messages.senderId, clerkId))

  const received = await db
    .selectDistinct({ partnerId: messages.senderId })
    .from(messages)
    .where(eq(messages.receiverId, clerkId))

  const all = [...sent.map((r) => r.partnerId), ...received.map((r) => r.partnerId)]
  return [...new Set(all)]
}

export async function getConversationPartners(clerkId: string): Promise<User[]> {
  const partnerIds = await getConversationPartnerIds(clerkId)
  if (partnerIds.length === 0) return []

  // Fetch each partner's profile
  const result = await Promise.all(
    partnerIds.map((id) => getUserByClerkId(id))
  )
  return result.filter((u): u is User => u !== null)
}

// ── 72-Hour Auto Cleanup ──────────────────────────────────────────────────────

let lastCleanupTimestamp = 0
const AUTO_CLEANUP_THROTTLE_MS = 10 * 60 * 1000 // Run at most once every 10 minutes

/**
 * Permanently deletes messages older than retentionHours (default: 72 hours).
 * Keeps the database clean and lightweight.
 * Returns the count of deleted messages.
 */
export async function cleanupOldMessages(retentionHours = 72): Promise<number> {
  const cutoff = new Date(Date.now() - retentionHours * 60 * 60 * 1000)
  const deleted = await db
    .delete(messages)
    .where(lt(messages.createdAt, cutoff))
    .returning({ id: messages.id })
  return deleted.length
}

/**
 * Throttled background trigger for auto-cleanup during normal app usage.
 * Runs at most once every 10 minutes without slowing down user requests.
 */
export async function triggerAutoCleanup(retentionHours = 72): Promise<void> {
  const now = Date.now()
  if (now - lastCleanupTimestamp < AUTO_CLEANUP_THROTTLE_MS) return
  lastCleanupTimestamp = now

  try {
    await cleanupOldMessages(retentionHours)
  } catch (err) {
    console.error('Background message cleanup error:', err)
  }
}
