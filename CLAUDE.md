# Drop — CLAUDE.md

> Zero to Agent: Vercel × DeepMind NYC Hackathon | March 21, 2026
> Team: Manav + Bharath | Build time: 3-4 hours

## What Is Drop?

Drop is a real-time group decision app. When a group can't decide on something — where to eat, what to do — Drop assigns everyone a role, collects their 15-second voice input, then uses Gemini to stream live reasoning before delivering one final confident decision.

**Tagline:** "Stop Debating. Start Deciding."

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 14 App Router | Vercel-native, fast |
| Hosting | Vercel | Hackathon requirement |
| AI Model | Gemini 2.0 Flash | Streaming reasoning |
| Database + Realtime | Supabase | Room sync across devices |
| Voice Input | Web Speech API | Zero-setup mobile voice |
| Voice Output | ElevenLabs | Reads challenge + decision |
| Auth (optional) | Clerk | Host dashboard only |
| Styling | Tailwind CSS | Dark, high-contrast UI |

## Design System

```
Background:    #0a0a0a  (near black)
Surface:       #111111  (cards)
Surface-2:     #1a1a1a  (elevated)
Accent:        #FF5C00  (electric orange)
Accent-light:  #FF8C00  (orange hover)
Text:          #ffffff
Text-muted:    #666666
```

**Big screen rule:** All text must be readable from 10 feet.
**Mobile rule:** All tap targets minimum 48px height.

## Project Structure

```
/app
  page.tsx                    <- Home: "Start a Drop"
  room/[id]/page.tsx          <- Host big screen view
  join/[id]/page.tsx          <- Mobile join + speak view
  card/[id]/page.tsx          <- Shareable Decision Card
  api/
    create-room/route.ts      <- POST: create new room
    join-room/route.ts        <- POST: player joins, gets role
    submit-transcript/route.ts <- POST: save voice transcript
    start-speaking/route.ts   <- POST: begin speaking round
    start-reasoning/route.ts  <- POST: stream Gemini reasoning
    speak-decision/route.ts   <- POST: ElevenLabs TTS

/components
  HomeForm.tsx                <- Decision input form
  QRDisplay.tsx               <- QR code + room code
  PlayerGrid.tsx              <- 6 role slots real-time
  RoleCard.tsx                <- Animated role card
  SpeakingView.tsx            <- Mobile voice interface
  ReasoningStream.tsx         <- Live Gemini text stream
  DecisionReveal.tsx          <- Final answer animation
  DecisionCard.tsx            <- Shareable output card

/lib
  supabase.ts                 <- Browser Supabase client
  supabase-server.ts          <- Server Supabase client (service role)
  roles.ts                    <- 6 role definitions + assignment
  room-codes.ts               <- Human-readable room code generator
  gemini.ts                   <- Reasoning prompt builder

/supabase
  schema.sql                  <- Run this in Supabase SQL editor
```

## Room Status Machine

```
waiting -> speaking -> reasoning -> done
```

| Status | Trigger | Big Screen Shows |
|--------|---------|-----------------|
| `waiting` | Room created | QR code + role cards filling |
| `speaking` | Host clicks "Start Drop" | Current speaker highlighted, timer |
| `reasoning` | All players submitted transcripts | Gemini stream live |
| `done` | Gemini finishes + saves decision | Final decision + card link |

## The 6 Roles

| Role | Emoji | What They Say |
|------|-------|--------------|
| The Dealbreaker | 🚫 | One hard non-negotiable |
| The Realist | 💸 | Budget, distance, time constraints |
| The Wildcard | 🔥 | Unexpected suggestion nobody considered |
| The Advocate | ❤️ | What the group actually deserves |
| The Mediator | ⚖️ | Middle ground between conflicts |
| The Closer | 🎯 | Final energy and commitment check |

With fewer than 6 players, roles are assigned from the top and extras are skipped.

## Environment Variables

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=

# Optional (Clerk for host dashboard)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.local.example .env.local
# Fill in all values

# 3. Set up Supabase
# Go to Supabase SQL editor and run: supabase/schema.sql

# 4. Run dev server
npm run dev
```

## Key Implementation Notes

### Supabase Realtime
Both `rooms` and `players` tables have realtime enabled. The big screen subscribes to both. Mobile subscribes to `rooms` only (to detect when it's their turn).

### Gemini Streaming
The `/api/start-reasoning` route streams directly from Gemini to the client. The big screen reads the stream. The final DECISION and BECAUSE lines are parsed and saved to Supabase at stream end.

### Voice Capture
Uses `window.SpeechRecognition` (browser native). Mobile Chrome works. Safari has `webkitSpeechRecognition`. Hard-stops at 15 seconds. Falls back to "I'm not sure, whatever the group wants." if nothing captured.

### ElevenLabs TTS
Called server-side at two moments:
1. When the speaking round starts (reads the challenge aloud)
2. When the final decision is revealed (reads decision + reason)

### Clerk Auth
Used ONLY for the optional `/dashboard` route where hosts can see their past drops. The main Drop flow (create/join/speak/decide) requires zero authentication.

## Demo Flow (3 minutes)

1. **0:00-0:15** — Show QR on big screen, judges scan
2. **0:15-0:30** — Watch role cards flip as judges join
3. **0:30-0:45** — ElevenLabs reads the challenge aloud
4. **0:45-1:45** — Each judge speaks (15s each), transcripts appear live
5. **1:45-2:30** — Gemini reasoning streams on big screen, reference roles live
6. **2:30-2:50** — Final decision drops, ElevenLabs reads it
7. **2:50-3:00** — Show Decision Card, shareable link

## Contingency Plans

| Risk | Fix |
|------|-----|
| Web Speech API fails | Have judge type instead |
| Gemini is slow | "Thinking" animation fills the time |
| ElevenLabs fails | Skip audio, visuals carry the demo |
| Supabase realtime lags | Manual refresh button as backup |
| Judge's phone won't load | Pre-open on a spare phone |

## Why This Wins

- **Live Demo (45%):** Judges ARE the demo. Their voices build it. Unrepeatable.
- **Creativity (35%):** Voice -> live AI reasoning -> confident group decision. Not a chatbot. Not RAG.
- **Impact (20%):** Every person with friends faces group decision paralysis daily.

Built on Vercel | Uses Gemini | Multimodal voice | Real consumer problem
