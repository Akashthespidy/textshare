# 📖 TextShare — Complete Project Documentation

> A lightweight, modern, and beautiful text-sharing platform built to exchange massive notes (50,000+ words, reports in Bangla/any language, and VS Code-styled programming code) with instant 1-click copy functionality and real-time Messenger-like UI.

---

## 📑 Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Directory & File Structure](#project-directory--file-structure)
4. [How It Works (System Architecture & Flows)](#how-it-works-system-architecture--flows)
   - [Authentication & First-Time Setup](#1-authentication--first-time-setup)
   - [User Search & Discovery](#2-user-search--discovery)
   - [Messaging & Real-Time Sync](#3-messaging--real-time-sync)
   - [VS Code Code Block Highlighting](#4-vs-code-code-block-highlighting)
   - [In-App Popup Toast Notifications](#5-in-app-popup-toast-notifications)
   - [Mobile Responsiveness Architecture](#6-mobile-responsiveness-architecture)
   - [72-Hour Automatic Database Purge](#7-72-hour-automatic-database-purge)
5. [Database Schema (Neon PostgreSQL + Drizzle)](#database-schema-neon-postgresql--drizzle)
6. [State Management (Zustand Stores)](#state-management-zustand-stores)
7. [Validation Layer (Zod)](#validation-layer-zod)
8. [Environment Variables](#environment-variables)
9. [Local Development & Deployment Guide](#local-development--deployment-guide)

---

## 🚀 Project Overview

### The Problem It Solves
Popular messaging apps like WhatsApp or Messenger have character limits, strip indentation, struggle with multi-thousand-word documents, and make copying large reports (e.g. 50,000 words in Bangla) on mobile devices painful and prone to truncation.

### The Solution: TextShare
- **Unlimited Text Size**: Share up to 100,000+ characters per message with zero lag.
- **Universal Language & Bangla Support**: Native Unicode handling with `dir="auto"` and Geist font rendering.
- **1-Click Copy Everywhere**: Hover over any message or popup to copy the entire document directly to your clipboard.
- **VS Code Style Code Blocks**: Automatically detects programming code and renders it like a dark VS Code editor file with colored window dots, file tabs, line numbers, and PrismJS syntax highlighting.
- **72-Hour Database Auto-Clean**: Automatically purges old messages after 3 days to keep your database lean, fast, and free of bloat.
- **Full Mobile Phone Support**: Adapts automatically on phones (showing either the conversation list or full-screen chat with a Back button).

---

## 🛠️ Tech Stack

| Layer | Technology | Description |
|---|---|---|
| **Framework** | **Next.js 16.4.6 (App Router)** | Modern full-stack React framework with Turbopack & Partial Prerendering |
| **Authentication** | **Clerk (`@clerk/nextjs`)** | User auth, session tokens, and security proxy |
| **Database** | **Neon Serverless PostgreSQL** | Cloud-native serverless Postgres instance |
| **ORM** | **Drizzle ORM (`drizzle-orm`)** | Type-safe schema definition and SQL query builder |
| **Data Validation** | **Zod (`zod`)** | Strict schema validation on API routes and client forms |
| **State Management** | **Zustand (`zustand`)** | Lightweight client stores for messages, sidebar, and popups |
| **Syntax Highlighting**| **PrismJS (`prismjs`)** | 20+ programming languages styled with VS Code Dark+ theme |
| **Styling** | **Tailwind CSS v4** | Next-generation utility-first styling with 100dvh mobile viewport |

---

## 📁 Project Directory & File Structure

```text
textshare/
├── app/
│   ├── api/
│   │   ├── conversations/
│   │   │   └── route.ts            # GET: Returns user's active conversation partners
│   │   ├── cron/
│   │   │   └── cleanup/
│   │   │       └── route.ts        # GET/POST: 72-hour automated message purge endpoint
│   │   ├── messages/
│   │   │   └── route.ts            # GET & POST: Retrieve & send messages with Zod validation
│   │   └── users/
│   │       └── route.ts            # GET, POST, PATCH, DELETE: User profile CRUD & search
│   ├── chat/
│   │   ├── [username]/
│   │   │   ├── ChatWindow.tsx      # Main chat view: 2s polling, message bubbles, scroll, copy
│   │   │   └── page.tsx            # Server page: loads initial conversation messages
│   │   ├── ChatShell.tsx           # Messenger shell: sidebar, user search, unread "NEW" badges
│   │   ├── CodeBlock.tsx           # VS Code file component with line numbers & language tabs
│   │   ├── FormattedMessage.tsx    # Message parser: detects code blocks, raw code, & normal text
│   │   ├── NotificationToast.tsx   # Top-right Messenger-style popup toast with full-text copy
│   │   ├── layout.tsx              # Chat layout wrapping with ChatShell & Clerk auth check
│   │   └── page.tsx                # Empty state view when no conversation is selected
│   ├── profile/
│   │   ├── ProfileClient.tsx       # Profile management UI (edit name, view username, delete account)
│   │   └── page.tsx                # Server page protecting profile route
│   ├── setup-username/
│   │   └── page.tsx                # Mandatory first-login username setup page
│   ├── sign-in/[[...sign-in]]/
│   │   └── page.tsx                # Clerk sign-in page with Suspense boundary
│   ├── sign-up/[[...sign-up]]/
│   │   └── page.tsx                # Clerk sign-up page with Suspense boundary
│   ├── globals.css                 # Global CSS + VS Code Dark+ syntax highlighting styles
│   ├── layout.tsx                  # Root HTML shell with ClerkProvider & viewport settings
│   └── page.tsx                    # Root entrypoint: redirects to /sign-in, /setup-username, or /chat
├── lib/
│   ├── db.ts                       # Database helper methods (queries, mutations, 72-hr auto-clean)
│   ├── drizzle.ts                  # Neon serverless HTTP database connection client
│   ├── schema.ts                   # Drizzle PostgreSQL schema (users & messages tables)
│   ├── store.ts                    # Zustand stores (useChatStore, useSidebarStore, useNotificationStore)
│   └── validators.ts               # Zod validation schemas for all requests
├── drizzle/                        # Drizzle database migration snapshots
├── public/                         # Static assets and icons
├── drizzle.config.ts               # Drizzle Kit CLI configuration
├── next.config.ts                  # Next.js configuration (cacheComponents, Turbopack)
├── package.json                    # Dependencies & npm scripts
├── proxy.ts                        # Next.js 16 route proxy (replaces legacy middleware.ts)
├── vercel.json                     # Vercel Cron scheduled configuration (every 6 hours)
└── DOCUMENTATION.md                # Complete project documentation (this file)
```

---

## 🧠 How It Works (System Architecture & Flows)

### 1. Authentication & First-Time Setup
1. **Clerk Proxy Protection (`proxy.ts`)**:
   - Every request is intercepted by Next.js 16's `proxy.ts`.
   - Public routes (`/sign-in`, `/sign-up`, `/api/cron/*`) are accessible without auth.
   - Any unauthenticated request to `/chat`, `/profile`, or `/setup-username` is redirected to `/sign-in`.
2. **First Login Detection (`app/page.tsx` & `app/chat/layout.tsx`)**:
   - When a user logs in via Clerk, the server verifies whether a corresponding record exists in the Neon `users` table via `getUserByClerkId(userId)`.
   - If not found, the user is immediately routed to `/setup-username`.
   - On `/setup-username`, the user chooses a unique `@username` (3–30 lowercase alphanumeric characters + underscores).
   - Once submitted, their profile is saved to Neon, and they are sent to `/chat`.

---

### 2. User Search & Discovery
1. The sidebar search bar in `ChatShell.tsx` queries `GET /api/users?q=<search>`.
2. Requests are debounced by **300ms** to avoid unnecessary database hits.
3. Matching users appear in real-time in the sidebar. Clicking any user opens the chat `/chat/[username]`.

---

### 3. Messaging & Real-Time Sync
1. **Sending Messages**:
   - User types in the auto-resizing textarea in `ChatWindow.tsx` and hits `Enter`.
   - The message is validated with Zod (`sendMessageSchema`).
   - An **optimistic message** is appended to the UI immediately for zero-lag feeling.
   - A `POST /api/messages` request is dispatched to Neon.
2. **Clean 2-Second Polling (`2000ms`)**:
   - Messages are fetched every 2 seconds via `GET /api/messages?with=<username>`.
   - **Concurrency Guard (`isFetchingRef`)**: Prevents duplicate or overlapping requests if network is slow.
   - **Tab Visibility Pause**: When the user switches tabs or minimizes their phone browser (`document.hidden`), polling **stops completely**, conserving bandwidth and database queries.
   - **Instant Focus Fetch**: The moment the user re-opens or focuses the tab, an immediate fetch is triggered.
   - **State Diffing**: The UI only re-renders if new messages arrived (comparing message count and last ID).

---

### 4. VS Code Code Block Highlighting
Whenever code is sent, `FormattedMessage.tsx` and `CodeBlock.tsx` render it with high-fidelity IDE styling:
- **Markdown Fences**: Supports standard ```` ```lang ... ``` ```` syntax.
- **Raw Code Detection**: Automatically recognizes unformatted pasted code (JavaScript, TypeScript, Python, SQL, HTML, Java, Bash, C++, JSON, etc.) and provides a toggle button (`View in VS Code` / `View as Text`).
- **VS Code Theme**:
  - Mac window buttons (`🔴 🟡 🟢`).
  - Active file tab with language-specific icon (`index.js`, `main.py`, `query.sql`, etc.).
  - Line numbers with hover highlighting.
  - Dedicated **Copy Code** button in the header.
  - Token syntax coloring powered by PrismJS matching VS Code Dark+.

---

### 5. In-App Popup Toast Notifications
When a message arrives from the other user:
- `ChatWindow.tsx` detects the incoming message.
- A popup event is pushed to `useNotificationStore`.
- `NotificationToast.tsx` animates a card into the top-right corner.
- Shows the sender's avatar, name, `@username`, and a message preview with full Bangla/RTL support (`dir="auto"`).
- Contains a **"Copy Full Text"** button that copies all 50,000+ words directly to the clipboard without needing to navigate into the message.
- Automatically dismisses after 6 seconds or via the `✕` close button.

---

### 6. Mobile Responsiveness Architecture
On desktop (screens ≥ 768px), the sidebar and chat window sit side-by-side. On mobile phones (iPhone/Android screens < 768px):
- **Conversation List View**: When on `/chat`, the sidebar takes **100% full width**.
- **Chat View**: The moment a user is tapped, the sidebar hides (`hidden md:flex`) and the chat window occupies **100% full screen**.
- **Mobile Back Button (`←`)**: A back arrow appears in the chat header on mobile to smoothly return to the conversation list.
- **No iOS Auto-Zoom Bug**: Textarea font size is configured to `16px` (`text-base sm:text-sm`) so mobile Safari won't zoom into the screen when opening the keyboard.
- **Dynamic Viewport Height**: Configured with `h-[100dvh]` so mobile navigation bars don't cut off messages.

---

### 7. 72-Hour Automatic Database Purge
To prevent the Neon database from accumulating gigabytes of massive text notes:
- **Retention Rule**: Any message whose `createdAt` timestamp is older than **72 hours (3 days)** is permanently deleted.
- **User Accounts Protected**: The `users` table is never deleted; users maintain their usernames and profiles permanently.
- **Dual Cleanup Triggers**:
  1. **In-App Auto-Purge (`lib/db.ts`)**: Whenever someone loads messages, sends a message, or loads conversations, a throttled background cleanup check (`triggerAutoCleanup()`) runs (at most once every 10 minutes).
  2. **Automated Scheduled Cron (`app/api/cron/cleanup/route.ts` & `vercel.json`)**: Configured to run every 6 hours (`0 */6 * * *`) via Vercel Cron. Can also be triggered manually:
     ```bash
     curl https://your-domain.com/api/cron/cleanup
     ```

---

## 🗄️ Database Schema (Neon PostgreSQL + Drizzle)

Defined in [`lib/schema.ts`](file:///Users/ahmed_akash/personal/textshare/textshare/lib/schema.ts):

### `users` Table
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | Primary Key, Default Random | Unique internal user ID |
| `clerk_id` | `text` | Not Null, Unique | Clerk Auth user identifier |
| `username` | `text` | Not Null, Unique | Public handle (e.g. `@akash`) |
| `name` | `text` | Not Null | Display name |
| `avatar_url`| `text` | Nullable | Profile picture URL from Clerk |
| `created_at`| `timestamp with time zone` | Not Null, Default Now | Account creation timestamp |

### `messages` Table
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | Primary Key, Default Random | Unique message ID |
| `sender_id`| `text` | Not Null | `clerk_id` of the sender |
| `receiver_id`| `text` | Not Null | `clerk_id` of the recipient |
| `content` | `text` | Not Null | Message body (unlimited words, Bangla, code) |
| `created_at`| `timestamp with time zone` | Not Null, Default Now | Sent timestamp (used for 72-hr purge) |

---

## ⚡ State Management (Zustand Stores)

Defined in [`lib/store.ts`](file:///Users/ahmed_akash/personal/textshare/textshare/lib/store.ts):

1. **`useChatStore`**:
   - `messages`: Active message list.
   - `isSending`: Pending state during message submission.
   - `error`: Error banner string if sending fails.
2. **`useSidebarStore`**:
   - `contacts`: User's list of previous conversation partners.
   - `searchResults`: Filtered user search results.
   - `searchQuery`: Debounced search query string.
   - `unreadMap`: Dictionary of usernames with unread messages (powers the pulsing `NEW` badge).
3. **`useNotificationStore`**:
   - `popups`: Queue of active floating toast notifications.
   - `showPopup()`: Triggers a new popup toast.
   - `removePopup()`: Dismisses a popup by ID.
4. **`useProfileStore`**:
   - Handles saving and account deletion modal states.

---

## 🛡️ Validation Layer (Zod)

Defined in [`lib/validators.ts`](file:///Users/ahmed_akash/personal/textshare/textshare/lib/validators.ts):

- `usernameSchema`: Validates length (3–30 characters) and lowercase regex `^[a-z0-9_]+$`.
- `createUserSchema`: Validates username and display name.
- `updateUserSchema`: Validates profile updates.
- `sendMessageSchema`: Validates recipient username and message text (up to 100,000 characters).
- `searchQuerySchema`: Validates search terms.

---

## 🔑 Environment Variables

The project requires the following keys in your `.env` file:

```env
# Clerk Authentication Keys (from https://dashboard.clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Clerk URL Routing
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/

# Neon Serverless PostgreSQL Connection String (from https://console.neon.tech)
DATABASE_URL=postgresql://user:password@ep-...neon.tech/neondb?sslmode=require

# (Optional) Secret token to secure the /api/cron/cleanup endpoint
CRON_SECRET=your-optional-secret-here
```

---

## 💻 Local Development & Deployment Guide

### Running Locally
```bash
# 1. Install dependencies
pnpm install

# 2. Push schema to your Neon database
pnpm db:push

# 3. Start development server
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts
- `pnpm dev`: Starts Next.js development server.
- `pnpm build`: Creates an optimized production build.
- `pnpm start`: Starts production server.
- `pnpm db:push`: Pushes Drizzle schema directly to Neon DB.
- `pnpm db:studio`: Opens Drizzle Studio browser interface for database inspection.

### Deploying to Vercel
1. Push your repository to GitHub.
2. Import the repository in [Vercel](https://vercel.com).
3. Add the environment variables from `.env` into the Vercel project settings.
4. Deploy! Vercel will automatically detect `vercel.json` and set up the 6-hourly 72-hour message purge cron job.
