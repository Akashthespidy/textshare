import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { sendMessageSchema, deleteMessageSchema } from '@/lib/validators'
import { getMessages, sendMessage, deleteMessage, getUserByUsername } from '@/lib/db'

export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const withUsername = searchParams.get('with')
  if (!withUsername) return NextResponse.json({ error: 'Missing ?with= param' }, { status: 400 })

  const otherUser = await getUserByUsername(withUsername)
  if (!otherUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const msgs = await getMessages(userId, otherUser.clerkId)
  return NextResponse.json(msgs)
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = sendMessageSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    )
  }

  const { toUsername, content } = parsed.data

  const otherUser = await getUserByUsername(toUsername)
  if (!otherUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const msg = await sendMessage(userId, otherUser.clerkId, content)
  return NextResponse.json(msg, { status: 201 })
}

export async function DELETE(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const parsed = deleteMessageSchema.safeParse({ id })

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid message ID' },
      { status: 400 }
    )
  }

  const success = await deleteMessage(parsed.data.id, userId)
  if (!success) {
    return NextResponse.json(
      { error: 'Message not found or you are not authorized to delete it' },
      { status: 404 }
    )
  }

  return NextResponse.json({ success: true, id: parsed.data.id })
}
