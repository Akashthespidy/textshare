import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getMessages, sendMessage, getUserByClerkId, getUserByUsername } from '@/lib/db'

export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const withUsername = searchParams.get('with')
  if (!withUsername) return NextResponse.json({ error: 'Missing ?with= param' }, { status: 400 })

  const otherUser = getUserByUsername(withUsername)
  if (!otherUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const messages = getMessages(userId, otherUser.clerkId)
  return NextResponse.json(messages)
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { toUsername, content } = await request.json() as { toUsername: string; content: string }
  if (!content?.trim()) return NextResponse.json({ error: 'Empty message' }, { status: 400 })

  const otherUser = getUserByUsername(toUsername)
  if (!otherUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const msg = sendMessage(userId, otherUser.clerkId, content.trim())
  return NextResponse.json(msg)
}
