import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import {
  createUser,
  getUserByClerkId,
  getUserByUsername,
  isUsernameTaken,
  getAllUsers,
} from '@/lib/db'
import { currentUser } from '@clerk/nextjs/server'

export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')

  if (q) {
    const all = getAllUsers()
    const results = all.filter(
      (u) => u.username.includes(q) || u.name.toLowerCase().includes(q.toLowerCase())
    )
    return NextResponse.json(results)
  }

  const user = getUserByClerkId(userId)
  return NextResponse.json(user)
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = getUserByClerkId(userId)
  if (existing) return NextResponse.json({ error: 'User already set up' }, { status: 400 })

  const { username, name } = await request.json() as { username: string; name: string }

  if (!username || username.length < 3) {
    return NextResponse.json({ error: 'Username too short' }, { status: 400 })
  }
  if (!/^[a-z0-9_]+$/.test(username)) {
    return NextResponse.json({ error: 'Invalid username format' }, { status: 400 })
  }
  if (isUsernameTaken(username)) {
    return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
  }

  const clerkUser = await currentUser()
  createUser({
    clerkId: userId,
    username,
    name: name || username,
    avatarUrl: clerkUser?.imageUrl,
    createdAt: new Date().toISOString(),
  })

  return NextResponse.json({ ok: true })
}

export async function PATCH(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const updates = await request.json() as { name?: string; avatarUrl?: string }

  const { updateUser } = await import('@/lib/db')
  const updated = updateUser(userId, updates)
  return NextResponse.json(updated)
}

export async function DELETE() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { deleteUser } = await import('@/lib/db')
  deleteUser(userId)
  return NextResponse.json({ ok: true })
}
