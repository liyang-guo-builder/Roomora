# Roomora 🏠

**AI room restyling that stays faithful to your actual space.**

Live at **[room-ora.com](https://room-ora.com)**

Roomora takes a photo of a real room and restyles it in a new look, modern, Scandinavian, Japandi, and more, while keeping the room's true geometry, windows, and proportions intact. It's mobile-first, bilingual (English / Chinese), and runs on a simple credit-based model.

## Features

- 📸 Upload a photo of any real room
- 🎨 Restyle it into a chosen aesthetic while preserving the space faithfully
- 🌍 Bilingual UI (EN / 中文)
- 💳 Credit-based usage with Stripe checkout
- 📱 Mobile-first design

## Tech stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Styling | Tailwind CSS v4 |
| Backend / Auth / DB | Supabase |
| AI image generation | FAL.ai |
| Payments | Stripe |
| Hosting | Vercel |

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.local.example` to `.env.local` and fill in your Supabase, FAL.ai, and Stripe keys.

## Status

Live in production. Go-to-market via RedNote, Instagram, and TikTok.

---

Built by [Liyang Guo](https://github.com/liyang-guo-builder).
