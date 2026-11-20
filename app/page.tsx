import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserByClerkId } from '@/lib/db'

export const instant = false

export default async function Home() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const user = await getUserByClerkId(userId)

  if (!user) {
    redirect('/setup-username')
  }

  redirect('/chat')
}
