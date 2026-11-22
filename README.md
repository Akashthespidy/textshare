# 💬 TextShare

A fast, lightweight, and beautiful text-sharing platform built to easily exchange massive texts (50,000+ words, reports in Bangla/any language, and VS Code-styled programming code) with instant 1-click copy functionality and a Messenger-like UI.

---

## ⚡ Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Push database schema to Neon PostgreSQL
pnpm db:push

# 3. Start local development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 📚 Complete Documentation

A comprehensive guide covering the full project structure, system architecture, database schema, mobile responsiveness, and 72-hour auto-clean policy is available in **[`DOCUMENTATION.md`](./DOCUMENTATION.md)**.

### ✨ Key Features:
- **Unlimited Text Size**: Share 50,000+ word notes and documents without WhatsApp/Messenger character limits.
- **Bangla & Multi-Language**: Native Unicode support with `dir="auto"` and Geist typography.
- **1-Click Full Text Copy**: Instant copy button on every message and popup notification.
- **VS Code Code Blocks**: Renders programming code in VS Code Dark+ theme with line numbers and copy button.
- **72-Hour Auto-Purge**: Old messages automatically clean up after 72 hours to keep the database fast and clean.
- **100% Mobile Responsive**: Dedicated mobile views, smooth back navigation, and iOS keyboard zoom fixes.
- **Neon + Drizzle + Zod + Zustand**: Serverless Postgres, type-safe schema, validation, and reactive state.
