import { create } from 'zustand'
import type { Message, UserProfile } from '@/lib/db'

// ── Chat store ─────────────────────────────────────────────────────────────

interface ChatState {
  messages: Message[]
  isSending: boolean
  isLoading: boolean
  error: string | null

  setMessages: (msgs: Message[]) => void
  addMessage: (msg: Message) => void
  setIsSending: (v: boolean) => void
  setIsLoading: (v: boolean) => void
  setError: (e: string | null) => void
  reset: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isSending: false,
  isLoading: false,
  error: null,

  setMessages: (msgs) => set({ messages: msgs }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setIsSending: (v) => set({ isSending: v }),
  setIsLoading: (v) => set({ isLoading: v }),
  setError: (e) => set({ error: e }),
  reset: () => set({ messages: [], isSending: false, isLoading: false, error: null }),
}))

// ── Contacts / sidebar store ───────────────────────────────────────────────

interface SidebarState {
  contacts: UserProfile[]
  searchResults: UserProfile[]
  searchQuery: string
  isSearching: boolean

  setContacts: (c: UserProfile[]) => void
  setSearchResults: (r: UserProfile[]) => void
  setSearchQuery: (q: string) => void
  setIsSearching: (v: boolean) => void
}

export const useSidebarStore = create<SidebarState>((set) => ({
  contacts: [],
  searchResults: [],
  searchQuery: '',
  isSearching: false,

  setContacts: (c) => set({ contacts: c }),
  setSearchResults: (r) => set({ searchResults: r }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setIsSearching: (v) => set({ isSearching: v }),
}))

// ── Profile store ──────────────────────────────────────────────────────────

interface ProfileState {
  isSaving: boolean
  isDeleting: boolean
  savedOk: boolean
  error: string | null

  setIsSaving: (v: boolean) => void
  setIsDeleting: (v: boolean) => void
  setSavedOk: (v: boolean) => void
  setError: (e: string | null) => void
}

export const useProfileStore = create<ProfileState>((set) => ({
  isSaving: false,
  isDeleting: false,
  savedOk: false,
  error: null,

  setIsSaving: (v) => set({ isSaving: v }),
  setIsDeleting: (v) => set({ isDeleting: v }),
  setSavedOk: (v) => set({ savedOk: v }),
  setError: (e) => set({ error: e }),
}))

// ── Notification popup store ──────────────────────────────────────────────

export interface ToastNotification {
  id: string
  senderName: string
  senderUsername: string
  content: string
  createdAt: Date | string
}

interface NotificationState {
  popups: ToastNotification[]
  showPopup: (notif: Omit<ToastNotification, 'id'>) => void
  removePopup: (id: string) => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  popups: [],
  showPopup: (notif) => {
    const id = `popup-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    set((s) => ({
      // Keep at most 3 popups stacked to avoid cluttering
      popups: [...s.popups.slice(-2), { ...notif, id }],
    }))
  },
  removePopup: (id) =>
    set((s) => ({ popups: s.popups.filter((p) => p.id !== id) })),
}))
