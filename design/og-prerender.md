# OG / Social Sharing Previews

## Problem

Loam is a client-side SPA. Social media scrapers (Slack, Discord, Twitter/X, iMessage, LinkedIn, Facebook) do a fast static HTML fetch — they don't execute JavaScript. So any `<meta og:*>` tags set by React are invisible to them, and link previews are blank.

Google does execute JS (headless Chrome), so `<title>` and `<meta description>` are indexed. But Loam's public URLs contain an encoded token that makes them hard to discover organically anyway, so traditional SEO is largely moot.

The practical goal is: **when someone shares a Loam post link, the preview shows the post title and excerpt instead of nothing**.

`og:image` was considered and dropped — no good way to auto-generate one, and title+description alone is sufficient for useful previews.

---

## How it works (all options)

The core logic is the same regardless of where it runs:

1. Inspect the incoming `User-Agent` header for known crawler strings:
   `Twitterbot`, `facebookexternalhit`, `Slackbot`, `Discordbot`, `LinkedInBot`, `WhatsApp`, etc.
2. For humans → pass through to the normal SPA, unchanged.
3. For bots:
   - Parse the URL to extract the index token and optional post slug
   - Decode the token (base64 URL-safe `e2` or plain `e1`) → index URL
   - Fetch the already-public `index.json`
   - For the garden home: use `index.title` + `index.tagline`
   - For a post page: find the matching entry, use its `title` + `excerpt`
   - Return a minimal HTML stub with `<meta property="og:title">` and `<meta property="og:description">`

The index token decoding logic already exists in `src/lib/indexToken.ts` — needs porting to whatever runtime.

The `.well-known/loam.json` masked-domain flow should also be supported: if the request comes from a masked domain, fetch `/.well-known/loam.json` to get the index URL instead of decoding a token.

---

## Options

### Option 1: Cloudflare Worker (recommended)

A Worker deployed on Cloudflare's edge network. Runs at the CDN layer — no separate server needed.

**How it works:**
- User deploys their own Worker instance (one-time `wrangler deploy`)
- Sets one env var: `LOAM_ORIGIN=https://loam.dgt.is`
- Points their garden domain at the Worker
- Worker proxies all human traffic to the origin SPA; bots get the OG stub

**Pros:**
- Free tier: 100k requests/day, more than enough for a personal garden
- Zero infrastructure to maintain
- Global edge network — fast for bots and humans alike
- Could be published as a template in this repo so anyone can fork and deploy

**Cons:**
- Requires a Cloudflare account
- `wrangler` CLI setup (one-time, well-documented)

**Self-host fallback:**
Same TypeScript logic, different runtime adapter (Bun HTTP server). See Option 2.

---

### Option 2: Self-hosted microservice (Bun/Node)

A small HTTP server (~100 lines) that does the same bot-detect + OG injection. Deployed as a sidecar alongside the Caddy + SPA Docker setup.

**How it works:**
- Runs on a separate port (e.g. 3001)
- Caddy routes bot User-Agents to it, humans go straight to the SPA
- Same bot detection + index fetch + OG stub logic as Option 1

**Pros:**
- No external service dependency
- Fits naturally with the existing Docker Compose setup
- Could publish a `ghcr.io/jonocodes/loam-og` Docker image

**Cons:**
- More infrastructure to run and keep alive
- Users need a server (already have one if they're self-hosting Loam)

**Caddy config sketch:**
```
@bots header User-Agent *bot* *crawler* *spider* *Slack* *Discord* *Twitter* *Facebook*
handle @bots {
  reverse_proxy localhost:3001
}
handle {
  root * /srv
  try_files {path} /index.html
  file_server
}
```

---

### Option 3: Hosted prerender service (Prerender.io or similar)

Use an existing service that runs headless Chrome to render pages and cache the output. Caddy routes bot traffic to it.

**How it works:**
- Sign up for Prerender.io (free tier exists) or self-host `prerender/prerender` Docker image
- Add a Caddy middleware to route bots to `https://service.prerender.io/{original-url}`
- The service renders the full SPA and caches it

**Pros:**
- No custom code to write
- Handles any future JS-rendered content automatically

**Cons:**
- External dependency (Prerender.io) or heavy self-hosted container (headless Chrome is ~500MB)
- Slower than Options 1/2 (full page render vs. a single index.json fetch)
- Cached pages can go stale; invalidation requires configuration
- Overkill for just title + excerpt

---

## Recommended path

**Build Option 1 (Cloudflare Worker) as the primary artifact**, with Option 2 (Bun server) sharing the same core logic module as a self-host alternative. Publish both in this repo under `packages/og-worker/`.

The shared module:
- `decodeToken(token)` — port of `src/lib/indexToken.ts`
- `fetchOgMeta(indexUrl, slug?)` — fetches index.json, returns `{ title, description, url }`
- `buildOgHtml(meta)` — returns the minimal HTML stub
- `isBotUserAgent(ua)` — UA string matching

Worker adapter + Bun HTTP adapter each wrap this module.

Option 3 can be documented as an alternative but isn't worth building.
