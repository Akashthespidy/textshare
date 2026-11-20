import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createUserSchema, updateUserSchema, searchQuerySchema } from '@/lib/validators'
import {
  createUser,
  getUserByClerkId,
  isUsernameTaken,
  searchUsers,
  updateUser,
  deleteUser,
} from '@/lib/db'

export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const parsed = searchQuerySchema.safeParse({ q: searchParams.get('q') ?? undefined })

  if (parsed.success && parsed.data.q) {
    const results = await searchUsers(parsed.data.q)
    return NextResponse.json(results)
  }

  const user = await getUserByClerkId(userId)
  return NextResponse.json(user)
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await getUserByClerkId(userId)
  if (existing) return NextResponse.json({ error: 'User already set up' }, { status: 400 })

  const body = await request.json()
  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    )
  }

  const { username, name } = parsed.data

  if (await isUsernameTaken(username)) {
    return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
  }

  const clerkUser = await currentUser()
  const user = await createUser({
    clerkId: userId,
    username,
    name,
    avatarUrl: clerkUser?.imageUrl ?? null,
  })

  return NextResponse.json(user, { status: 201 })
}

export async function PATCH(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = updateUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    )
  }

  const updated = await updateUser(userId, parsed.data)
  return NextResponse.json(updated)
}

export async function DELETE() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await deleteUser(userId)
  return NextResponse.json({ ok: true })
}
