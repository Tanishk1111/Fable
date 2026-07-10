# Fable — Studio 707

A mobile-first interactive SPA built with Next.js. Guitar case vibes, secret pager, setlist drops.

## Quick Start

```bash
npm install
cp .env.local.example .env.local
# Fill in WEBHOOK_URL (Discord or Telegram)
npm run dev
```

Open on your phone (same Wi‑Fi): `http://<your-ip>:3000`

## Setup

### 1. Webhook (required for phone pings)

**Discord:** Server Settings → Integrations → Webhooks → copy URL  
**Telegram:** `@BotFather` → create bot → get token →  
`https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<CHAT_ID>`

Add to `.env.local`:
```
WEBHOOK_URL=https://discord.com/api/webhooks/...
```

### 2. Supabase (optional — setlist persistence)

Create a `setlist` table:

```sql
create table setlist (
  id uuid default gen_random_uuid() primary key,
  url text not null,
  created_at timestamptz default now()
);
```

Add to `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Without Supabase, links still ping your webhook and show locally in-session.

### 3. Audio files

Drop these into `public/audio/`:

| File | Purpose |
|------|---------|
| `amp-hum.mp3` | Amp warm-up on power click |
| `strum.mp3` | Guitar strum on string swipe |
| `button-click.mp3` | Sticker tap |
| `pager-beep.mp3` | Keypad press |
| `pager-ring.mp3` | Correct 707 code |
| `tape-write.mp3` | Setlist submit |

The app works without them — sounds simply won't play.

## Interactions

| Action | Webhook message |
|--------|-----------------|
| Strum strings | "The guitar was strummed..." |
| NANA sticker | "Black Stones vibe..." |
| NewJeans sticker | "Super Shy vibe..." |
| Deftones sticker | "White Pony vibe..." |
| Pager code 707 | "Secret code entered..." |
| Setlist submit | Link + notification |

## Deploy (Vercel)

```bash
npx vercel
```

Add env vars in Vercel dashboard. Use an unguessable URL — that's the security model.

## Project Structure

```
src/
├── app/           # Next.js App Router + API routes
├── components/    # UI (Guitar, Overlays, Intro)
├── lib/           # Howler, Supabase, Webhook helpers
└── store/         # Zustand view state
public/
├── images/stickers/  # nana, newjeans, deftones
└── audio/            # Sound effects (you add these)
```
