# Deploy to Vercel

## 1. Log in (one time)

```bash
cd c:\Users\ASUS\Downloads\fable
npx vercel login
```

Browser opens → sign in with GitHub/Google/email.

## 2. Add environment variables

**Option A — Vercel Dashboard (easiest)**

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. After first deploy, open your project → **Settings** → **Environment Variables**
3. Add each variable below (copy values from your `.env.local`)

| Variable | Required |
|----------|----------|
| `TELEGRAM_BOT_TOKEN` | ✅ |
| `TELEGRAM_CHAT_ID` | ✅ |
| `PAGER_SECRET_CODE` | ✅ (e.g. `707`) |
| `NEXT_PUBLIC_PAGER_MESSAGE` | ✅ (use `\n` for line breaks) |
| `NEXT_PUBLIC_SUPABASE_URL` | optional |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | optional |

**Option B — CLI**

```bash
npx vercel env add TELEGRAM_BOT_TOKEN
npx vercel env add TELEGRAM_CHAT_ID
npx vercel env add PAGER_SECRET_CODE
npx vercel env add NEXT_PUBLIC_PAGER_MESSAGE
```

Repeat for each — paste the value when prompted. Select **Production**, **Preview**, and **Development**.

## 3. Deploy

```bash
npm run deploy
```

First run asks a few questions — use defaults:

- Set up and deploy? **Y**
- Which scope? **your account**
- Link to existing project? **N** (first time)
- Project name? **something unguessable** e.g. `studio-707-blackstones`
- Directory? **./** (Enter)

You get a live URL like:

```
https://studio-707-blackstones.vercel.app
```

## 4. Redeploy after env changes

If you add env vars *after* the first deploy, redeploy so they take effect:

```bash
npm run deploy
```

## Security note

The site has no login — **the obscure URL is the security**. Pick a random project name. Don't share the link publicly.

## Test on phone

Open the production URL on her phone. All interactions (strum, stickers, setlist, pager) should ping Telegram exactly like local.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Telegram not pinging | Check env vars in Vercel dashboard, redeploy |
| Pager message shows default text | Set `NEXT_PUBLIC_PAGER_MESSAGE` in Vercel, redeploy |
| YouTube won't autoplay on mobile | Normal — some browsers block autoplay; tap ▶ on the link in the list |
| Build fails | Run `npm run build` locally first to see the error |
