import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserByClerkId, getUserByUsername, getMessages } from '@/lib/db'
import ChatWindow from './ChatWindow'

export const instant = false

export default async function ChatWithPage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const me = await getUserByClerkId(userId)
  if (!me) redirect('/setup-username')

  const other = await getUserByUsername(username)
  if (!other) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-400">User @{username} not found</p>
      </div>
    )
  }

  const initialMessages = await getMessages(userId, other.clerkId)

  return <ChatWindow key={other.clerkId} me={me} other={other} initialMessages={initialMessages} />
}
