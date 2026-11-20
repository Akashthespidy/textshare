import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserByClerkId } from '@/lib/db'

export default async function Home() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const user = getUserByClerkId(userId)

  if (!user) {
    redirect('/setup-username')
  }

  redirect('/chat')
}
