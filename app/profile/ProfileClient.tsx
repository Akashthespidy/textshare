'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useClerk } from '@clerk/nextjs'
import Link from 'next/link'
import type { UserProfile } from '@/lib/db'
import { useProfileStore } from '@/lib/store'
import { updateUserSchema } from '@/lib/validators'

interface Props {
  me: UserProfile
}

export default function ProfileClient({ me }: Props) {
  const router = useRouter()
  const { signOut } = useClerk()
  const [name, setName] = useState(me.name)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const { isSaving, isDeleting, savedOk, error, setIsSaving, setIsDeleting, setSavedOk, setError } =
    useProfileStore()

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSavedOk(false)

    // Client-side Zod validation
    const parsed = updateUserSchema.safeParse({ name: name.trim() })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })
      if (res.ok) {
        setSavedOk(true)
        setTimeout(() => setSavedOk(false), 3000)
        router.refresh()
      } else {
        const d = await res.json()
        setError(d.error ?? 'Failed to save')
      }
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await fetch('/api/users', { method: 'DELETE' })
      await signOut()
      router.replace('/sign-in')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8 text-center text-white">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold mx-auto mb-3">
            {me.name[0]?.toUpperCase()}
          </div>
          <p className="text-lg font-semibold">{me.name}</p>
          <p className="text-indigo-200 text-sm">@{me.username}</p>
        </div>

        <div className="p-6 space-y-6">
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <div className="px-4 py-2.5 bg-gray-100 rounded-xl text-gray-500 text-sm">
                @{me.username} <span className="text-xs text-gray-400">(cannot be changed)</span>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}
            {savedOk && (
              <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">✓ Changes saved</p>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
              >
                {isSaving ? 'Saving…' : 'Save Changes'}
              </button>
              <Link
                href="/chat"
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors text-center"
              >
                Back to Chat
              </Link>
            </div>
          </form>

          {/* Danger zone */}
          <div className="border border-red-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-red-600 mb-1">Danger Zone</h3>
            <p className="text-xs text-gray-500 mb-3">
              Deleting your account removes your profile and signs you out.
            </p>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
              >
                Delete Account
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-red-600 font-medium">Are you sure?</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {isDeleting ? 'Deleting…' : 'Yes, Delete'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
