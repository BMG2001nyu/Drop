# Drop — CLAUDE.md

> Zero to Agent: Vercel × DeepMind NYC Hackathon | March 21, 2026
> Team: Manav + Bharath | Build time: 3-4 hours

## What Is Drop?

Drop is a real-time group decision app. When a group can't decide — where to eat, what to do — Drop assigns everyone a role, collects their 15-second voice input, then uses Gemini to stream live reasoning before delivering one final confident decision.

**Tagline:** "Stop Debating. Start Deciding."

---

## Build Progress (Milestones)

Work through `task.md` milestone by milestone. Each milestone has a clear test — don't move to the next one until the current test passes.

| # | Milestone | Key Test |
|---|-----------|---------|
| 0 | App boots locally | Homepage renders at `localhost:3000` |
| 1 | Room creation | Row appears in Supabase `rooms` table |
| 2 | Host screen renders | QR code visible, 6 empty role slots shown |
| 3 | Player joins + gets role | Row in `players` table with correct role |
| 4 | Realtime role cards | Cards flip on big screen without refresh |
| 5 | Speaking round starts | Room status → `speaking`, correct player highlighted |
| 6 | Voice capture + transcript | `transcript` + `has_spoken` saved in Supabase |
| 7 | Gemini streams live | Reasoning references real player words, `DECISION:` appears |
| 8 | Decision reveal + card | `/card/[id]` loads for anyone with the link |
| 9 | ElevenLabs audio | Challenge + decision read aloud; app works without it too |
| 10 | Deploy to Vercel | Full flow works on production URL, real phones |
| 11 | Demo rehearsal | 3 clean runs, no crashes |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 14 App Router | Vercel-native, fast |
| Hosting | Vercel | Hackathon requirement |
| AI Model | Gemini 2.0 Flash | Streaming reasoning |
| Database + Realtime | Supabase | Room sync across devices |
| Voice Input | Web Speech API | Zero-setup mobile voice |
| Voice Output | ElevenLabs | Reads challenge + decision |
| Auth (optional) | Clerk | Host dashboard — add after M10 |
| Styling | Tailwind CSS | Dark, high-contrast UI |

---

## Project Structure

```
Drop/
├── frontend/                         ← Deploy this to Vercel
│   ├── app/
│   │   ├── page.tsx                  ← Home: "Start a Drop"
│   │   ├── room/[id]/page.tsx        ← Host big screen
│   │   ├── join/[id]/page.tsx        ← Mobile join + speak
│   │   ├── card/[id]/page.tsx        ← Shareable Decision Card
│   │   └── api/
│   │       ├── create-room/          ← POST: create room
│   │       ├── join-room/            ← POST: player joins, gets role
│   │       ├── start-speaking/       ← POST: begin speaking round
│   │       ├── submit-transcript/    ← POST: save voice transcript
│   │       ├── start-reasoning/      ← POST: stream Gemini
│   │       └── speak-decision/       ← POST: ElevenLabs TTS
│   ├── components/
│   │   ├── HomeForm.tsx
│   │   ├── QRDisplay.tsx
│   │   ├── PlayerGrid.tsx
│   │   ├── RoleCard.tsx
│   │   ├── SpeakingView.tsx
│   │   ├── ReasoningStream.tsx
│   │   ├── DecisionReveal.tsx
│   │   └── DecisionCard.tsx
│   ├── lib/
│   │   ├── supabase.ts               ← Browser client
│   │   ├── supabase-server.ts        ← Server client (service role)
│   │   ├── roles.ts                  ← 6 role definitions
│   │   ├── room-codes.ts             ← Room code generator
│   │   └── gemini.ts                 ← Reasoning prompt builder
│   ├── .env.local                    ← Your keys (never commit)
│   └── .env.local.example            ← Template
│
└── backend/
    └── supabase/
        └── schema.sql                ← Run in Supabase SQL Editor
```

---

## Room Status Machine

```
waiting → speaking → reasoning → done
```

| Status | Triggered by | Big Screen | Mobile |
|--------|-------------|-----------|--------|
| `waiting` | Room created | QR + empty role slots | Name entry → role reveal → waiting |
| `speaking` | Host clicks "Start Drop" | Current speaker highlighted + timer | "YOUR TURN" or "Waiting..." |
| `reasoning` | All transcripts submitted | Gemini streaming text | "Drop is listening..." |
| `done` | Gemini finishes | Decision reveal + card link | Decision + "Start New Drop" |

---

## The 6 Roles

| Role | Emoji | What They Say |
|------|-------|--------------|
| The Dealbreaker | 🚫 | One hard non-negotiable |
| The Realist | 💸 | Budget, distance, time constraints |
| The Wildcard | 🔥 | Unexpected suggestion nobody considered |
| The Advocate | ❤️ | What the group actually deserves |
| The Mediator | ⚖️ | Middle ground between conflicts |
| The Closer | 🎯 | Final energy and commitment check |

With fewer than 6 players, roles fill from the top — skip from the bottom.

---

## Design System

```
Background:    #0a0a0a  (near black)
Surface:       #111111  (cards)
Accent:        #FF5C00  (electric orange)
Accent-light:  #FF8C00  (hover)
Text:          #ffffff
Text-muted:    #666666
```

- Big screen: all text readable from 10 feet away
- Mobile: all tap targets minimum 48px

---

## Environment Variables

```bash
# ── Required for Milestones 1–8 ──────────────────────
NEXT_PUBLIC_SUPABASE_URL=          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY=         # Supabase service role key (server only)
GEMINI_API_KEY=                    # Google AI Studio

# ── Required for Milestone 9 ─────────────────────────
ELEVENLABS_API_KEY=                # ElevenLabs account key
ELEVENLABS_VOICE_ID=               # Voice ID from ElevenLabs library

# ── Optional — add after Milestone 10 ────────────────
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
# CLERK_SECRET_KEY=
```

---

## Quick Start

```bash
cd frontend
npm install
cp .env.local.example .env.local   # then fill in real keys
npm run dev
```

---

## Key Implementation Notes

### Supabase Realtime
Both `rooms` and `players` have realtime enabled. Big screen subscribes to both tables. Mobile subscribes to `rooms` only (detects when it's their turn via `current_speaker_role`).

### Gemini Streaming
`/api/start-reasoning` streams directly from Gemini → client. Text accumulates in `ReasoningStream`. At stream end, `DECISION:` and `BECAUSE:` are parsed with regex and saved to `rooms`.

### Voice Capture
`window.SpeechRecognition` / `webkitSpeechRecognition`. Hard-stops at 15 seconds. Falls back to `"I'm not sure, whatever the group wants."` if nothing captured. Works on mobile Chrome; limited on Safari.

### ElevenLabs TTS
Two calls: (1) when speaking round starts, reads the challenge question; (2) when final decision is revealed. Runs server-side. App is fully functional without it — audio is enhancement only.

### Clerk (Not Active in Local Dev)
Middleware is a no-op locally. Add real Clerk keys + re-enable `ClerkProvider` in `layout.tsx` after Milestone 10 to unlock the `/dashboard` route.

---

## Vercel Deployment (Milestone 10)

1. Push to GitHub
2. Connect repo in Vercel
3. Set **Root Directory** to `frontend/`
4. Add all env vars in Vercel project settings
5. Deploy

---

## Contingency Plans

| Risk | Fix |
|------|-----|
| Web Speech API fails | Have player type instead — same `/api/submit-transcript` |
| Gemini is slow | Pulse animation fills the time — silence is dramatic |
| ElevenLabs fails | App continues without audio silently |
| Supabase realtime lags | Add a manual "Refresh" button as backup |
| Judge's phone won't load | Pre-open join URL on a spare phone |

---

## Why This Wins

- **Live Demo (45%):** Judges ARE the demo. Their voices build it. Completely unrepeatable.
- **Creativity (35%):** Role-based voice input → live AI reasoning → one confident decision. Not a chatbot. Not RAG.
- **Impact (20%):** Every person with friends faces group decision paralysis daily.

Built on Vercel | Uses Gemini | Multimodal voice | Real consumer problem
