import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserByClerkId } from '@/lib/db'
import ChatShell from './ChatShell'

export const instant = false

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const me = getUserByClerkId(userId)
  if (!me) redirect('/setup-username')

  return <ChatShell me={me}>{children}</ChatShell>
}
