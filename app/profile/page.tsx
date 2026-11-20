import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserByClerkId } from '@/lib/db'
import ProfileClient from './ProfileClient'

export const instant = false

export default async function ProfilePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const me = await getUserByClerkId(userId)
  if (!me) redirect('/setup-username')

  return <ProfileClient me={me} />
}
