import { NextResponse } from 'next/server'
import { cleanupOldMessages } from '@/lib/db'

// Optional CRON_SECRET authorization check for external schedulers
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // Allow if no secret is set

  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${secret}`
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const hours = parseInt(searchParams.get('hours') || '72', 10)
  const retentionHours = isNaN(hours) || hours <= 0 ? 72 : hours

  try {
    const deletedCount = await cleanupOldMessages(retentionHours)
    return NextResponse.json({
      success: true,
      message: `Successfully cleaned up ${deletedCount} message(s) older than ${retentionHours} hours.`,
      deletedCount,
      retentionHours,
      timestamp: new Date().toISOString(),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Cleanup failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  return GET(request)
}
