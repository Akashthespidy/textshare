'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import type { Message, UserProfile } from '@/lib/db'
import { useChatStore, useNotificationStore } from '@/lib/store'
import { sendMessageSchema } from '@/lib/validators'

interface Props {
  me: UserProfile
  other: UserProfile
  initialMessages: Message[]
}

export default function ChatWindow({ me, other, initialMessages }: Props) {
  const {
    messages, isSending, error,
    setMessages, addMessage, setIsSending, setError, reset,
  } = useChatStore()
  const { showPopup } = useNotificationStore()

  const [text, setText] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Track known message IDs so we only popup on genuinely NEW messages
  const knownIdsRef = useRef<Set<string>>(new Set(initialMessages.map((m) => m.id)))
  // Track last active timestamp for smart idle backoff
  const lastActiveRef = useRef<number>(Date.now())

  // Initialise store with server-fetched messages on mount / other user change
  useEffect(() => {
    reset()
    setMessages(initialMessages)
    knownIdsRef.current = new Set(initialMessages.map((m) => m.id))
    lastActiveRef.current = Date.now()
  }, [other.clerkId]) // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Single function to fetch messages and detect new incoming ones
  const fetchLatestMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages?with=${encodeURIComponent(other.username)}`)
      if (!res.ok) return

      const fresh: Message[] = await res.json()

      // Check if any genuinely new messages arrived from the other person
      let hasNewIncoming = false
      for (const msg of fresh) {
        if (!knownIdsRef.current.has(msg.id)) {
          knownIdsRef.current.add(msg.id)
          if (msg.senderId === other.clerkId) {
            hasNewIncoming = true
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

      // Only update state if message list actually changed
      const currentList = useChatStore.getState().messages
      const lastCurrentId = currentList[currentList.length - 1]?.id
      const lastFreshId = fresh[fresh.length - 1]?.id

      if (currentList.length !== fresh.length || lastCurrentId !== lastFreshId) {
        setMessages(fresh)
        if (hasNewIncoming) {
          lastActiveRef.current = Date.now()
        }
      }
    } catch {
      // Ignore network errors during background check
    }
  }, [other.username, other.clerkId, other.name, showPopup, setMessages])

  // Manual refresh button handler
  async function handleManualRefresh() {
    setIsRefreshing(true)
    lastActiveRef.current = Date.now()
    await fetchLatestMessages()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  // ── Smart polling with visibility pause and idle backoff ───────────────────
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null
    let isCancelled = false

    const scheduleNextCheck = () => {
      if (isCancelled) return

      // Do NOT poll when the tab or window is hidden / backgrounded
      if (typeof document !== 'undefined' && document.hidden) {
        return
      }

      // Calculate adaptive interval based on idle time
      const timeSinceActive = Date.now() - lastActiveRef.current
      let delayMs: number
      if (timeSinceActive < 30_000) {
        delayMs = 7000 // Active chatting: 7s
      } else if (timeSinceActive < 120_000) {
        delayMs = 15000 // Idle for > 30s: 15s
      } else {
        delayMs = 30000 // Long idle: 30s
      }

      timeoutId = setTimeout(async () => {
        if (isCancelled) return
        if (typeof document !== 'undefined' && !document.hidden) {
          await fetchLatestMessages()
        }
        scheduleNextCheck()
      }, delayMs)
    }

    // Start scheduler
    scheduleNextCheck()

    // Immediately fetch when tab regains visibility or focus
    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        lastActiveRef.current = Date.now()
        fetchLatestMessages()
        if (timeoutId) clearTimeout(timeoutId)
        scheduleNextCheck()
      }
    }

    window.addEventListener('focus', handleVisibilityOrFocus)
    document.addEventListener('visibilitychange', handleVisibilityOrFocus)

    return () => {
      isCancelled = true
      if (timeoutId) clearTimeout(timeoutId)
      window.removeEventListener('focus', handleVisibilityOrFocus)
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
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
    lastActiveRef.current = Date.now()

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
    lastActiveRef.current = Date.now()
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
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-3 shadow-sm">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white font-semibold flex-shrink-0 shadow-sm">
          {other.name[0]?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-800 truncate">{other.name}</p>
          <p className="text-xs text-gray-400 truncate">@{other.username}</p>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
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
              const isLong = msg.content.length > 300

              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
                  <div className={`group relative max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm select-text ${
                        isMe
                          ? 'bg-indigo-600 text-white rounded-br-sm'
                          : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
                      } ${isLong ? 'max-h-80 overflow-y-auto' : ''}`}
                      dir="auto"
                    >
                      {msg.content}
                    </div>

                    <div className={`flex items-center gap-2 mt-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      <span className="text-xs text-gray-400">{formatTime(msg.createdAt)}</span>
                      <button
                        onClick={() => copyText(msg.content, msg.id)}
                        className={`opacity-0 group-hover:opacity-100 transition-opacity text-xs flex items-center gap-1 px-2.5 py-1 rounded-full ${
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
              lastActiveRef.current = Date.now()
              setText(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
            }}
            onKeyDown={handleKeyDown}
            placeholder="Write a message… (any language, any length)"
            rows={1}
            className="flex-1 bg-transparent resize-none text-sm text-gray-800 placeholder-gray-400 focus:outline-none py-1 max-h-48 overflow-y-auto leading-relaxed"
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
