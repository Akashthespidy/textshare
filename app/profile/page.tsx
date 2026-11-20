import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserByClerkId } from '@/lib/db'
import ProfileClient from './ProfileClient'

export default async function ProfilePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const me = getUserByClerkId(userId)
  if (!me) redirect('/setup-username')

  return <ProfileClient me={me} />
}
