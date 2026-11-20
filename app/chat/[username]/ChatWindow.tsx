'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import type { Message, UserProfile } from '@/lib/db'
import { useChatStore } from '@/lib/store'
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

  const [text, setText] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Initialise store with server-fetched messages on mount / other user change
  useEffect(() => {
    reset()
    setMessages(initialMessages)
  }, [other.clerkId]) // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  // Poll for new messages every 3 s
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/messages?with=${encodeURIComponent(other.username)}`)
      if (res.ok) setMessages(await res.json())
    }, 3000)
    return () => clearInterval(interval)
  }, [other.username, setMessages])

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
    const optimistic: Message = {
      id: `opt-${Date.now()}`,
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
        const fresh = await fetch(`/api/messages?with=${encodeURIComponent(other.username)}`)
        if (fresh.ok) setMessages(await fresh.json())
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
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white font-semibold flex-shrink-0">
          {other.name[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-gray-800">{other.name}</p>
          <p className="text-xs text-gray-400">@{other.username}</p>
        </div>
        <div className="ml-auto text-xs text-gray-400 italic">Any language · 100k chars · Bangla ✓</div>
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
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
                        isMe
                          ? 'bg-indigo-600 text-white rounded-br-sm'
                          : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
                      } ${isLong ? 'max-h-64 overflow-y-auto' : ''}`}
                    >
                      {msg.content}
                    </div>

                    <div className={`flex items-center gap-2 mt-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      <span className="text-xs text-gray-400">{formatTime(msg.createdAt)}</span>
                      <button
                        onClick={() => copyText(msg.content, msg.id)}
                        className={`opacity-0 group-hover:opacity-100 transition-opacity text-xs flex items-center gap-1 px-2 py-0.5 rounded-full ${
                          isMe
                            ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {copiedId === msg.id ? (
                          <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                            Copied!
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy
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
            className="flex-shrink-0 w-9 h-9 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1 text-center">
          Enter to send · Shift+Enter for new line · Hover a message to copy
        </p>
      </div>
    </div>
  )
}
