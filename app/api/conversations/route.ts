import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getUserByClerkId, getConversationPartners, getAllUsers } from '@/lib/db'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const partnerIds = getConversationPartners(userId)
  const allUsers = getAllUsers()

  const partners = partnerIds
    .map((id) => allUsers.find((u) => u.clerkId === id))
    .filter(Boolean)

  return NextResponse.json(partners)
}
