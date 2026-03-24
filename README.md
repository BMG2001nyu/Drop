<div align="center">

# DROP

### Stop Debating. Start Deciding.

**Real-time AI-powered group decision engine** — roles, voice, live reasoning, one final answer.

Built at the **Zero to Agent: Vercel × DeepMind NYC Hackathon** · March 21, 2026

*Manav · Bharath — shipped in ~4 hours*

---

![Next.js](https://img.shields.io/badge/Next.js_14-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=black)
![Gemini](https://img.shields.io/badge/Gemini_2.5_Pro-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-black?style=for-the-badge&logo=vercel&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)

</div>

---

## The Problem

Every group has hit this wall: 6 people, one question, zero consensus. Forty minutes of "I'm fine with anything" while everyone actually has opinions they won't voice. Decision paralysis is a real social friction — and it's worse in groups.

Existing solutions are either polls (ignores nuance), AI chatbots (talks to one person, not a group), or just arguing until someone gives up.

**Drop is none of those.**

Drop transforms group indecision into a structured, voice-driven, AI-synthesized experience that produces one confident answer in under 90 seconds — with every person's real input baked in.

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   Host creates Drop        Players scan QR         Speaking round   │
│   ──────────────────       ──────────────────      ─────────────    │
│   Enter question  ──────►  Auto-assigned roles ──► 15s each, live   │
│   Room code: TIGER-3       on their phones         voice capture    │
│                                                         │           │
│                                                         ▼           │
│   One final decision   ◄──  Cinematic reveal  ◄──  Gemini streams   │
│   Shareable card link       blast + crash in       live reasoning   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

1. **Host** enters a decision question. A room spawns instantly with a unique code (`TIGER-3`, `NEON-7`, etc.) and a QR code displayed on screen.
2. **Players** scan the QR on their phone. Each gets auto-assigned one of six structured debate roles.
3. **Speaking round** kicks off. Players go one at a time — 15-second countdown, Web Speech API captures voice, transcript saved to Supabase. No app install. No friction.
4. **Gemini 2.5 Pro** receives every transcript, every player's name and role, and the original question. It streams live reasoning to the host screen — the group watches AI think through their actual words in real time.
5. **Cinematic reveal** — white flash, shockwave rings, decision text crashes in over an AI-generated background image (Imagen 3.0). ElevenLabs reads it aloud.
6. **Decision Card** — a permanent, shareable link. SEO-optimized. Anyone can open it later.

---

## The 6 Roles

Drop assigns everyone a unique lens to argue from. This isn't random flavor — it forces the group to surface information that would otherwise stay silent.

| Role | Emoji | Directive | Why It Matters |
|------|-------|-----------|----------------|
| The Dealbreaker | 🚫 | State one hard non-negotiable | Surfaces hidden vetoes before AI decides |
| The Realist | 💸 | Give concrete budget / distance / time limits | Grounds the decision in actual constraints |
| The Wildcard | 🔥 | Suggest what nobody considered | Breaks groupthink, expands the option space |
| The Advocate | ❤️ | Argue what the group actually deserves | Injects aspiration into practical decisions |
| The Mediator | ⚖️ | Find middle ground between conflicts | Identifies the synthesis the group missed |
| The Closer | 🎯 | Check final energy and real commitment | Prevents post-decision regret |

With fewer than 6 players, roles fill top-down. The Closer and Mediator drop first — the most critical voices always stay.

---

## Technical Architecture

### State Machine

The entire app is orchestrated by one field: `rooms.status`. Every client — host screen and all player phones — subscribes to this via Supabase Realtime and re-renders reactively.

```
                    ┌──────────────────────────────────────────────┐
                    │                                              │
  Room created ──►  waiting  ──►  speaking  ──►  reasoning  ──►  done
                    │                │                │            │
                    │                │                │            │
                 QR + grid      Current speaker   Gemini SSE   Reveal +
                 visible        highlighted       streaming     card link
```

Transitions are triggered server-side by API routes — never by client-side optimistic updates. This prevents race conditions when multiple players submit transcripts concurrently.

### Dual-Screen Architecture

Drop runs two completely independent UIs from the same codebase:

```
/room/[id]  ──  Host's laptop or TV
                Big text, 10-foot readability
                Manages player grid, triggers speaking round
                Receives and renders the Gemini stream
                Runs cinematic reveal sequence

/join/[id]  ──  Each player's phone
                Compact mobile UI, 48px+ tap targets
                Name entry → role pick → role reveal → waiting → speak → done
                Polls room status to detect turn + decision
                Renders its own reasoning + reveal screens
```

Both surfaces share the same Supabase subscription layer but render completely different component trees for their context.

### Realtime Sync

```typescript
// Supabase Realtime — subscribes to postgres_changes on both tables
supabase
  .channel(`room-${roomId}`)
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms' }, handler)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, handler)
  .subscribe()
```

A 2–5 second polling fallback runs in parallel. WebSocket is primary; polling is the safety net. Neither blocks the other.

### Gemini Streaming (SSE Pipeline)

`/api/start-reasoning` is the most technically interesting route. It:

1. Fetches all player transcripts + room metadata from Supabase (service role)
2. Builds a structured prompt via `buildReasoningPrompt()` — roles, names, exact words, location context
3. Opens a streaming fetch to Gemini 2.5 Pro (`?alt=sse`)
4. Reads the response body as a `ReadableStream`, parses SSE chunks
5. Re-streams each chunk to the client via a `TransformStream`
6. Concurrently writes to `rooms.reasoning_stream` in Supabase every ~100 chars — so mobile players see the live stream too
7. On stream end, parses `DECISION:` and `BECAUSE:` with regex, updates the room row, and transitions status → `done`

```
Client (host screen)
    │
    │  GET /api/start-reasoning  (streaming)
    ▼
Next.js API Route  ──────────────────────────────►  Gemini 2.5 Pro
    │                                                      │
    │  ReadableStream (SSE chunks)  ◄────────────────────────
    │
    ├──►  Re-stream to client (ReasoningStream component)
    │
    └──►  Supabase UPDATE rooms.reasoning_stream  ──►  Mobile clients via Realtime
```

The Gemini prompt uses a strict output contract:

```
[6–10 lines of reasoning, referencing each player by name and role]

DECISION: [one clear, specific decision]
BECAUSE: [one sentence synthesizing the key reason]
```

### Voice Capture Pipeline

No third-party STT APIs. No billing. Works on any HTTPS page.

```typescript
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)()
recognition.continuous = true
recognition.interimResults = true  // live transcript shown as user speaks

// Hard 15-second stop
const timeout = setTimeout(() => {
  recognition.stop()
  submitTranscript(finalTranscript || DEFAULT_FALLBACK)
}, 15000)
```

Fallback chain: Web Speech API → text input (same timer) → default message. The game never stalls waiting for a player.

### Cinematic Decision Reveal

CSS-only animation sequence — no Framer Motion, no GSAP, no external dependency:

```
t=0ms    ──  Black overlay (room goes dark)
t=200ms  ──  blast-flash keyframe  (white flash fills screen)
t=500ms  ──  shockwave rings expand from center (3 concentric rings, staggered)
t=700ms  ──  text-crash keyframe  (decision text slams in from above)
t=1400ms ──  reason-fade, slide-up  (full reveal: image, reason, player list, CTA)
```

The background image is requested from Imagen 3.0 the moment reasoning starts. By the time the reveal plays, the image is usually ready. If not, a dark gradient covers until it loads.

### Location-Aware Decisions

```
Browser Geolocation API
        │
        ▼
Nominatim reverse geocode (OpenStreetMap — no API key needed)
        │
        ▼  "East Village, Manhattan, New York"
        │
        ▼
Saved to rooms.location
        │
        ▼
Injected into Gemini prompt → AI suggests places nearby
```

---

## API Surface

| Method | Route | What It Does |
|--------|-------|-------------|
| `POST` | `/api/create-room` | Spawn room, generate code, return `roomId` |
| `POST` | `/api/join-room` | Validate + join, auto-assign role, return player |
| `GET` | `/api/available-roles` | Return unclaimed roles for a room |
| `POST` | `/api/change-role` | Swap role before game starts (validates no conflict) |
| `POST` | `/api/start-speaking` | Transition `waiting → speaking`, set first speaker |
| `POST` | `/api/submit-transcript` | Save transcript, advance speaker queue, trigger reasoning |
| `POST` | `/api/start-reasoning` | **SSE stream** — Gemini reasoning → client + Supabase |
| `POST` | `/api/speak-decision` | ElevenLabs TTS — returns MP3 audio blob |
| `POST` | `/api/update-location` | Save reverse-geocoded location to room |
| `POST` | `/api/generate-decision-image` | Imagen 3.0 — returns base64 background image |

---

## Component Map

```
app/page.tsx
  └── HomeForm           — decision input, calls /api/create-room, redirects

app/room/[id]/page.tsx   — HOST BIG SCREEN (client component)
  ├── QRDisplay          — QR code + room code (readable from across the room)
  ├── PlayerGrid         — 2-col grid of all 6 role slots
  │     └── RoleCard     — flip animation: "?" front → role + player name back
  ├── SpeakingView       — 15s ring countdown + mic state machine
  ├── ReasoningStream    — SSE consumer, streams Gemini output line by line
  └── DecisionReveal     — blast-flash → shockwave → crash-in → full reveal

app/join/[id]/page.tsx   — MOBILE PLAYER (client component)
  ├── [name entry]       — inline form → /api/join-room
  ├── [role picker]      — fetches /api/available-roles, shows available slots
  ├── [role reveal]      — full-screen role reveal with emoji + prompt
  ├── SpeakingView       — same component, same voice pipeline
  ├── ReasoningStream    — reads from rooms.reasoning_stream (Supabase)
  └── DecisionReveal     — same cinematic reveal as host

app/card/[id]/page.tsx   — SERVER COMPONENT (SSR + OG metadata)
  └── DecisionCard       — decision, reason, all players + transcripts, share CTA
```

---

## Data Model

```sql
-- rooms
id                TEXT PRIMARY KEY   -- "TIGER-3"
decision          TEXT NOT NULL      -- "Where should we eat tonight?"
location          TEXT               -- "East Village, Manhattan"
status            TEXT DEFAULT 'waiting'  -- waiting | speaking | reasoning | done
current_speaker_role  TEXT           -- role ID of whose turn it is
reasoning_stream  TEXT               -- live Gemini output (updated incrementally)
final_decision    TEXT               -- parsed DECISION: line
final_reason      TEXT               -- parsed BECAUSE: line
host_id           TEXT               -- Clerk user ID (optional)
created_at        TIMESTAMPTZ

-- players
id                UUID PRIMARY KEY
room_id           TEXT REFERENCES rooms(id)
name              TEXT NOT NULL
role              TEXT NOT NULL      -- dealbreaker | realist | wildcard | advocate | mediator | closer
role_emoji        TEXT
role_label        TEXT
transcript        TEXT               -- voice capture output
has_spoken        BOOLEAN DEFAULT false
joined_at         TIMESTAMPTZ
```

Both tables have Supabase Realtime enabled. Row-level security is enforced via service role key on all server-side mutations.

---

## Tech Stack

| Layer | Technology | Why This Choice |
|-------|-----------|-----------------|
| Framework | Next.js 14 App Router | Vercel-native, API routes + server components in one repo |
| Language | TypeScript | Full type safety across API routes and components |
| Hosting | Vercel | Zero-config deploy, edge functions, Hackathon requirement |
| Database | Supabase (Postgres) | Realtime subscriptions, row-level security, service role |
| AI Reasoning | Gemini 2.5 Pro | Best-in-class streaming, handles multi-speaker structured prompts |
| AI Image Gen | Imagen 3.0 | Cinematic image quality from a single API key (shared with Gemini) |
| Voice Input | Web Speech API | Zero cost, zero setup, works on mobile Chrome without an SDK |
| Voice Output | ElevenLabs Turbo v2 | Low-latency TTS, separate style per use (challenge vs. decision) |
| Auth | Clerk | Drop-in, optional — host dashboard ready without blocking core flow |
| Styling | Tailwind CSS | Utility-first, consistent dark UI, no runtime overhead |
| QR Codes | qrcode.react | Client-side generation, no external service |
| Geolocation | Nominatim / OpenStreetMap | Free reverse geocoding, no API key |

---

## Getting Started

### Prerequisites

- Node.js 18+
- [Supabase](https://supabase.com) project (free tier is fine)
- [Google AI Studio](https://aistudio.google.com) API key — covers both Gemini and Imagen
- *(Optional)* [ElevenLabs](https://elevenlabs.io) API key
- *(Optional)* [Clerk](https://clerk.com) publishable + secret keys

### Setup

```bash
# 1. Clone
git clone https://github.com/BMG2001nyu/drop.git
cd drop/frontend

# 2. Install
npm install

# 3. Environment
cp .env.local.example .env.local
# Fill in the values below

# 4. Database — run backend/supabase/schema.sql in your Supabase SQL Editor
#    Then enable Realtime on the `rooms` and `players` tables

# 5. Run
npm run dev
# → http://localhost:3000
```

### Environment Variables

```bash
# ── Core (required) ───────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=          # https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # eyJ...
SUPABASE_SERVICE_ROLE_KEY=         # eyJ... (server only — never expose client-side)
GEMINI_API_KEY=                    # AIza... (covers Gemini + Imagen)

# ── Voice narration (optional) ────────────────────────────────────────
ELEVENLABS_API_KEY=                # sk_...
ELEVENLABS_VOICE_ID=               # pNIn... (defaults to a built-in ID if omitted)

# ── Auth (optional) ───────────────────────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY= # pk_live_...
CLERK_SECRET_KEY=                  # sk_live_...
```

---

## Deploy to Vercel

```bash
# One-time setup
vercel link
vercel env pull  # or add vars manually in vercel.com/dashboard

# Deploy
git push origin main  # auto-deploys if connected
# or
vercel --prod
```

In Vercel project settings:
- **Root Directory:** `frontend`
- **Framework Preset:** Next.js (auto-detected)
- Add all environment variables from above

---

## Fallbacks & Resilience

Every optional feature fails silently. The core game never breaks.

| Feature | Primary Path | Fallback |
|---------|-------------|----------|
| Voice capture | Web Speech API | Text input (same 15s timer) |
| Mic fallback | Text input | Default message auto-submitted |
| Voice narration | ElevenLabs TTS | Silent — no UI change |
| Decision image | Imagen 3.0 | Dark gradient background |
| Location | GPS + Nominatim | Omitted from Gemini prompt |
| Realtime sync | Supabase WebSocket | 2–5s polling backup |
| Authentication | Clerk | App is fully functional without it |

---

## Design System

The UI is built for two contexts simultaneously: a large screen 10 feet away and a phone held in one hand.

```
─── Color ──────────────────────────────────────────────────
  Background    #0a0a0a    Near black — high contrast base
  Surface       #111111    Card backgrounds
  Accent        #FF5C00    Electric orange — primary CTA, highlights
  Accent hover  #FF8C00
  Text          #ffffff
  Text muted    #666666    Secondary info

─── Typography ──────────────────────────────────────────────
  Font          Inter (Google Fonts)
  Weights       400 · 600 · 700 · 900 (black)
  Headings      font-black + tracking-widest (readable at distance)

─── Interactions ─────────────────────────────────────────────
  Role cards    3D flip animation (CSS transform-style: preserve-3d)
  Decision      blast-flash → shockwave → text-crash → slide-up
  Reasoning     Fade-up per line (opacity 10 → 20 → 40 → 100)
  Tap targets   48px minimum on all mobile interactive elements
```

---

## Project Structure

```
Drop/
├── frontend/                              ← Vercel root
│   ├── app/
│   │   ├── page.tsx                       ← Home — enter decision
│   │   ├── room/[id]/page.tsx             ← Host big screen
│   │   ├── join/[id]/page.tsx             ← Mobile player
│   │   ├── card/[id]/page.tsx             ← Shareable decision card (SSR)
│   │   ├── layout.tsx                     ← Root layout, Clerk provider, Inter font
│   │   ├── globals.css                    ← Custom keyframes + Tailwind base
│   │   └── api/
│   │       ├── create-room/route.ts
│   │       ├── join-room/route.ts
│   │       ├── available-roles/route.ts
│   │       ├── change-role/route.ts
│   │       ├── start-speaking/route.ts
│   │       ├── submit-transcript/route.ts
│   │       ├── start-reasoning/route.ts   ← SSE streaming route
│   │       ├── speak-decision/route.ts
│   │       ├── update-location/route.ts
│   │       └── generate-decision-image/route.ts
│   ├── components/
│   │   ├── HomeForm.tsx
│   │   ├── QRDisplay.tsx
│   │   ├── PlayerGrid.tsx
│   │   ├── RoleCard.tsx                   ← 3D flip card
│   │   ├── SpeakingView.tsx               ← Voice capture + countdown
│   │   ├── ReasoningStream.tsx            ← Live SSE renderer
│   │   ├── DecisionReveal.tsx             ← Cinematic animation
│   │   └── DecisionCard.tsx              ← Shareable summary
│   ├── lib/
│   │   ├── supabase.ts                    ← Browser client + Room/Player types
│   │   ├── supabase-server.ts             ← Service role client (server only)
│   │   ├── roles.ts                       ← 6 role definitions + helpers
│   │   ├── room-codes.ts                  ← "TIGER-3" style code generator
│   │   └── gemini.ts                      ← Structured prompt builder
│   ├── .env.local.example
│   └── package.json
│
└── backend/
    └── supabase/
        └── schema.sql                     ← Run once in Supabase SQL Editor
```

---

## Team

| | |
|-|-|
| **Bharath** | [@BMG2001nyu](https://github.com/BMG2001nyu) |
| **Manav** | [@manav](https://github.com/manav) |

Built in ~4 hours at **Zero to Agent: Vercel × DeepMind NYC Hackathon** · March 21, 2026.

---

<div align="center">

*Built on Vercel · Powered by Gemini · Voice-native · Real consumer problem*

</div>
