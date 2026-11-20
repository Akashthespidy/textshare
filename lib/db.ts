import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function readJson<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
  } catch {
    return fallback
  }
}

function writeJson(filePath: string, data: unknown) {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

// ── User profile ──────────────────────────────────────────────────────────────

export interface UserProfile {
  clerkId: string
  username: string
  name: string
  avatarUrl?: string
  createdAt: string
}

function usersFilePath() {
  return path.join(DATA_DIR, 'users.json')
}

function getUsersMap(): Record<string, UserProfile> {
  return readJson<Record<string, UserProfile>>(usersFilePath(), {})
}

export function getUserByClerkId(clerkId: string): UserProfile | null {
  const users = getUsersMap()
  return users[clerkId] ?? null
}

export function getUserByUsername(username: string): UserProfile | null {
  const users = getUsersMap()
  return Object.values(users).find((u) => u.username === username) ?? null
}

export function createUser(profile: UserProfile) {
  const users = getUsersMap()
  users[profile.clerkId] = profile
  writeJson(usersFilePath(), users)
}

export function updateUser(clerkId: string, updates: Partial<Omit<UserProfile, 'clerkId'>>) {
  const users = getUsersMap()
  if (!users[clerkId]) throw new Error('User not found')
  users[clerkId] = { ...users[clerkId], ...updates }
  writeJson(usersFilePath(), users)
  return users[clerkId]
}

export function deleteUser(clerkId: string) {
  const users = getUsersMap()
  delete users[clerkId]
  writeJson(usersFilePath(), users)
}

export function isUsernameTaken(username: string): boolean {
  const users = getUsersMap()
  return Object.values(users).some((u) => u.username === username)
}

export function getAllUsers(): UserProfile[] {
  return Object.values(getUsersMap())
}

// ── Messages ──────────────────────────────────────────────────────────────────

export interface Message {
  id: string
  senderId: string   // clerkId
  receiverId: string // clerkId
  content: string
  createdAt: string
}

function conversationId(a: string, b: string): string {
  return [a, b].sort().join('__')
}

function messagesFilePath(convId: string) {
  return path.join(DATA_DIR, 'conversations', `${convId}.json`)
}

export function getMessages(clerkIdA: string, clerkIdB: string): Message[] {
  const convId = conversationId(clerkIdA, clerkIdB)
  return readJson<Message[]>(messagesFilePath(convId), [])
}

export function sendMessage(senderId: string, receiverId: string, content: string): Message {
  const convId = conversationId(senderId, receiverId)
  const messages = readJson<Message[]>(messagesFilePath(convId), [])
  const msg: Message = {
    id: crypto.randomUUID(),
    senderId,
    receiverId,
    content,
    createdAt: new Date().toISOString(),
  }
  messages.push(msg)
  writeJson(messagesFilePath(convId), messages)
  return msg
}

export function getConversationPartners(clerkId: string): string[] {
  const convDir = path.join(DATA_DIR, 'conversations')
  if (!fs.existsSync(convDir)) return []
  const files = fs.readdirSync(convDir)
  const partners: string[] = []
  for (const file of files) {
    if (!file.endsWith('.json')) continue
    const parts = file.replace('.json', '').split('__')
    if (parts.includes(clerkId)) {
      const partner = parts.find((p) => p !== clerkId)
      if (partner) partners.push(partner)
    }
  }
  return partners
}
