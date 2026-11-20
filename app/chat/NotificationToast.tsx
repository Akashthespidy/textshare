'use client'

import { useState, useEffect } from 'react'
import { useNotificationStore, type ToastNotification } from '@/lib/store'

function SingleToast({ notif }: { notif: ToastNotification }) {
  const { removePopup } = useNotificationStore()
  const [copied, setCopied] = useState(false)

  // Auto dismiss after 6 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      removePopup(notif.id)
    }, 6000)
    return () => clearTimeout(timer)
  }, [notif.id, removePopup])

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    await navigator.clipboard.writeText(notif.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Preview snippet: first 120 chars
  const preview =
    notif.content.length > 120
      ? notif.content.slice(0, 120) + '…'
      : notif.content

  return (
    <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-indigo-100 shadow-2xl rounded-2xl p-4 transition-all duration-300 animate-in slide-in-from-top-4 fade-in hover:shadow-indigo-100">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0">
            {notif.senderName[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                New Message
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-900 truncate">
              {notif.senderName} <span className="text-xs font-normal text-gray-400">@{notif.senderUsername}</span>
            </p>
          </div>
        </div>
        <button
          onClick={() => removePopup(notif.id)}
          className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
          title="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Message preview snippet */}
      <div
        className="bg-indigo-50/70 border border-indigo-100/50 rounded-xl p-2.5 text-xs text-gray-700 leading-relaxed max-h-24 overflow-y-auto break-words select-text mb-3"
        dir="auto"
      >
        {preview}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            copied
              ? 'bg-green-600 text-white shadow-sm'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
          }`}
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>Copied Full Text!</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy Full Text</span>
            </>
          )}
        </button>

        <span className="text-[10px] text-gray-400">
          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}

export default function NotificationToast() {
  const { popups } = useNotificationStore()

  if (popups.length === 0) return null

  return (
    <div className="fixed top-3 right-3 left-3 sm:left-auto sm:right-4 z-50 flex flex-col gap-2.5 max-w-sm w-auto sm:w-full pointer-events-none">
      {popups.map((notif) => (
        <SingleToast key={notif.id} notif={notif} />
      ))}
    </div>
  )
}
