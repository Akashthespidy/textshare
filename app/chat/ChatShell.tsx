'use client'

import { useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import type { UserProfile } from '@/lib/db'
import { useSidebarStore } from '@/lib/store'

interface Props {
  me: UserProfile
  children: React.ReactNode
}

export default function ChatShell({ me, children }: Props) {
  const pathname = usePathname()
  const {
    contacts, searchResults, searchQuery, isSearching,
    setContacts, setSearchResults, setSearchQuery, setIsSearching,
  } = useSidebarStore()

  const fetchContacts = useCallback(async () => {
    const res = await fetch('/api/conversations')
    if (res.ok) setContacts(await res.json())
  }, [setContacts])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/users?q=${encodeURIComponent(searchQuery)}`)
      if (res.ok) {
        const all: UserProfile[] = await res.json()
        setSearchResults(all.filter((u) => u.clerkId !== me.clerkId))
      }
      setIsSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, me.clerkId, setSearchResults, setIsSearching])

  const displayList = searchQuery.trim() ? searchResults : contacts
  const activeUsername = pathname.split('/chat/')[1]?.split('/')[0]

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-indigo-700">TextShare</h1>
            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                title="Profile"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </Link>
              <UserButton />
            </div>
          </div>

          {/* Me */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-semibold text-indigo-700 flex-shrink-0">
              {me.name[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{me.name}</p>
              <p className="text-xs text-gray-400">@{me.username}</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by username…"
              className="w-full pl-9 pr-3 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 text-gray-700"
            />
          </div>
        </div>

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto">
          {searchQuery.trim() && (
            <p className="text-xs text-gray-400 px-4 py-2 font-medium">
              {isSearching ? 'Searching…' : `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}`}
            </p>
          )}
          {!searchQuery.trim() && contacts.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              <p className="text-2xl mb-2">💬</p>
              <p>Search for a username above<br />to start a conversation</p>
            </div>
          )}
          {displayList.map((u) => {
            const isActive = activeUsername === u.username
            return (
              <Link
                key={u.clerkId}
                href={`/chat/${u.username}`}
                onClick={() => setSearchQuery('')}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                  isActive ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : ''
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {u.name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
                  <p className="text-xs text-gray-400 truncate">@{u.username}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">{children}</div>
    </div>
  )
}
