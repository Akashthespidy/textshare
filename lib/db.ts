import { db } from './drizzle'
import { users, messages } from './schema'
import { eq, or, and, ilike } from 'drizzle-orm'
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
  const rows = await db
    .insert(messages)
    .values({ senderId, receiverId, content })
    .returning()
  return rows[0]
}

export async function deleteMessage(messageId: string, clerkId: string): Promise<boolean> {
  try {
    const rows = await db
      .delete(messages)
      .where(
        and(
          eq(messages.id, messageId),
          or(eq(messages.senderId, clerkId), eq(messages.receiverId, clerkId))
        )
      )
      .returning({ id: messages.id })
    return rows.length > 0
  } catch {
    return false
  }
}

export async function getConversationPartnerIds(clerkId: string): Promise<string[]> {
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
