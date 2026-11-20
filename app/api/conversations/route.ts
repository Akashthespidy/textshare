import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getConversationPartners } from '@/lib/db'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const partners = await getConversationPartners(userId)
  return NextResponse.json(partners)
}
