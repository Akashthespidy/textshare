'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import Link from 'next/link'
import type { Message, UserProfile } from '@/lib/db'
import { useChatStore, useNotificationStore, useSidebarStore } from '@/lib/store'
import { sendMessageSchema } from '@/lib/validators'
import FormattedMessage from '../FormattedMessage'

interface Props {
  me: UserProfile
  other: UserProfile
  initialMessages: Message[]
}

export default function ChatWindow({ me, other, initialMessages }: Props) {
  const {
    messages, isSending, error,
    setMessages, addMessage, removeMessage, setIsSending, setError, reset,
  } = useChatStore()
  const { showPopup } = useNotificationStore()

  const [text, setText] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Track known message IDs so we only popup on genuinely NEW messages
  const knownIdsRef = useRef<Set<string>>(new Set(initialMessages.map((m) => m.id)))
  // Track IDs that arrived during this live session to show "NEW" badge on message
  const [newlyReceivedIds, setNewlyReceivedIds] = useState<Set<string>>(new Set())
  // Flag to prevent overlapping concurrent requests
  const isFetchingRef = useRef<boolean>(false)

  // Initialise store with server-fetched messages on mount / other user change
  useEffect(() => {
    reset()
    setMessages(initialMessages)
    knownIdsRef.current = new Set(initialMessages.map((m) => m.id))
    useSidebarStore.getState().markRead(other.username)
  }, [other.clerkId]) // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Single function to fetch messages and detect new incoming ones
  const fetchLatestMessages = useCallback(async () => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true

    try {
      const res = await fetch(`/api/messages?with=${encodeURIComponent(other.username)}`)
      if (!res.ok) return

      const fresh: Message[] = await res.json()

      // Check if any genuinely new messages arrived from the other person
      for (const msg of fresh) {
        if (!knownIdsRef.current.has(msg.id)) {
          knownIdsRef.current.add(msg.id)
          if (msg.senderId === other.clerkId) {
            setNewlyReceivedIds((prev) => new Set(prev).add(msg.id))

            // Mark conversation as having a NEW message in sidebar!
            useSidebarStore.getState().markUnread(other.username)

            // Trigger popup toast!
            showPopup({
              senderName: other.name,
              senderUsername: other.username,
              content: msg.content,
              createdAt: msg.createdAt,
            })
          }
        }
      }

      // Only update state if message list actually changed (prevents unnecessary re-renders)
      const currentList = useChatStore.getState().messages
      const lastCurrentId = currentList[currentList.length - 1]?.id
      const lastFreshId = fresh[fresh.length - 1]?.id

      if (currentList.length !== fresh.length || lastCurrentId !== lastFreshId) {
        setMessages(fresh)
      }
    } catch {
      // Ignore network errors during background check
    } finally {
      isFetchingRef.current = false
    }
  }, [other.username, other.clerkId, other.name, showPopup, setMessages])

  // Manual refresh button handler
  async function handleManualRefresh() {
    setIsRefreshing(true)
    await fetchLatestMessages()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  // ── Clean 2-second polling (pauses when tab is hidden) ─────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      // Pause polling when tab is hidden/minimized
      if (typeof document !== 'undefined' && document.hidden) return
      fetchLatestMessages()
    }, 2000)

    // Also fetch immediately when user returns to the tab
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchLatestMessages()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [fetchLatestMessages])

  async function sendMessage() {
    const content = text.trim()

    // Client-side Zod validation before hitting the API
    const parsed = sendMessageSchema.safeParse({ toUsername: other.username, content })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid message')
      return
    }

    setError(null)
    setText('')

    // Resize textarea back
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    // Optimistic message
    const optimisticId = `opt-${Date.now()}`
    knownIdsRef.current.add(optimisticId)
    const optimistic: Message = {
      id: optimisticId,
      senderId: me.clerkId,
      receiverId: other.clerkId,
      content,
      createdAt: new Date(),
    }
    addMessage(optimistic)
    scrollToBottom()

    setIsSending(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUsername: other.username, content }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to send')
      } else {
        await fetchLatestMessages()
      }
    } finally {
      setIsSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  async function copyText(content: string, id: string) {
    await navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function handleDeleteMessage(id: string) {
    if (deletingId) return
    setDeletingId(id)

    // Optimistically remove from state
    removeMessage(id)

    try {
      if (!id.startsWith('opt-')) {
        const res = await fetch(`/api/messages?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
        })
        if (!res.ok) {
          const data = await res.json()
          setError(data.error ?? 'Failed to delete message')
          await fetchLatestMessages()
        }
      }
    } catch {
      setError('Network error deleting message')
      await fetchLatestMessages()
    } finally {
      setDeletingId(null)
    }
  }

  function formatTime(isoOrDate: string | Date) {
    return new Date(isoOrDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  function formatDate(isoOrDate: string | Date) {
    const d = new Date(isoOrDate)
    const today = new Date()
    if (d.toDateString() === today.toDateString()) return 'Today'
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Group by date
  const grouped: { date: string; msgs: Message[] }[] = []
  for (const msg of messages) {
    const date = formatDate(msg.createdAt)
    const last = grouped[grouped.length - 1]
    if (last?.date === date) last.msgs.push(msg)
    else grouped.push({ date, msgs: [msg] })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-2.5 sm:gap-3 shadow-sm">
        {/* Back button on mobile to return to conversation list */}
        <Link
          href="/chat"
          className="md:hidden -ml-1 p-2 rounded-xl text-gray-600 hover:text-indigo-600 hover:bg-gray-100 active:bg-gray-200 transition-colors flex items-center justify-center flex-shrink-0"
          title="Back to conversations"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>

        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white font-semibold flex-shrink-0 shadow-sm">
          {other.name[0]?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-800 truncate text-sm sm:text-base">{other.name}</p>
          <p className="text-xs text-gray-400 truncate">@{other.username}</p>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-1.5 sm:p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            title="Refresh messages"
          >
            <svg
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <span className="hidden sm:inline text-xs text-gray-400 italic">
            Supports 100k+ words · Bangla ✓
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-sm">No messages yet. Say hello! 👋</p>
          </div>
        )}

        {grouped.map((group) => (
          <div key={group.date}>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium px-2">{group.date}</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {group.msgs.map((msg) => {
              const isMe = msg.senderId === me.clerkId

              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
                  <div className={`group relative max-w-[92%] sm:max-w-[85%] md:max-w-[78%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm select-text w-full ${
                        isMe
                          ? 'bg-indigo-600 text-white rounded-br-sm'
                          : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
                      }`}
                    >
                      <FormattedMessage content={msg.content} isMe={isMe} />
                    </div>

                    <div className={`flex items-center gap-2 mt-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      <span className="text-xs text-gray-400">{formatTime(msg.createdAt)}</span>
                      {!isMe && newlyReceivedIds.has(msg.id) && (
                        <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full tracking-wider animate-pulse shadow-sm">
                          New
                        </span>
                      )}
                      <button
                        onClick={() => copyText(msg.content, msg.id)}
                        className={`opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity text-xs flex items-center gap-1 px-2.5 py-1 rounded-full ${
                          isMe
                            ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title="Copy entire text"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-green-700 font-medium">Copied!</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      {/* Manual delete message button */}
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        disabled={deletingId === msg.id}
                        className={`opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity text-xs flex items-center gap-1 px-2.5 py-1 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors ${
                          deletingId === msg.id ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        title="Delete message"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        {error && (
          <p className="text-xs text-red-500 mb-2 px-1">{error}</p>
        )}
        <div className="flex items-end gap-3 bg-gray-100 rounded-2xl px-4 py-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
            }}
            onKeyDown={handleKeyDown}
            placeholder="Write a message… (any language, any length)"
            rows={1}
            className="flex-1 bg-transparent resize-none text-base sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none py-1.5 max-h-48 overflow-y-auto leading-relaxed"
            style={{ minHeight: '36px' }}
            dir="auto"
          />
          <button
            onClick={sendMessage}
            disabled={isSending || !text.trim()}
            className="flex-shrink-0 w-9 h-9 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-colors shadow-sm"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-center">
          Enter to send · Shift+Enter for new line · Hover message to copy full text
        </p>
      </div>
    </div>
  )
}
