# Drop — Build Tasks

> Hackathon: Zero to Agent: Vercel × DeepMind NYC | March 21, 2026
> Deadline: 5:00 PM EST | Team: Manav (Person 1) + Bharath (Person 2)

## Status Legend
- [ ] TODO
- [x] DONE
- [~] IN PROGRESS

---

## SETUP (Both, 15 min)

- [ ] Create Supabase project + run `supabase/schema.sql`
- [ ] Get all API keys (Supabase, Gemini, ElevenLabs)
- [ ] Set up `.env.local` from `.env.local.example`
- [ ] `npm install` + `npm run dev` — verify app boots
- [ ] Deploy to Vercel + set env vars there

---

## PERSON 1 — Manav: Host Screen + Real-time Infrastructure

### HOUR 1 (Now -> 60 min)
- [ ] Verify Supabase schema is running + realtime enabled
- [ ] Test `/api/create-room` creates room in DB
- [ ] Test home page form -> redirects to `/room/[id]`
- [ ] QRDisplay component renders correct URL
- [ ] PlayerGrid renders 6 empty role slots

### HOUR 2 (60 -> 120 min)
- [ ] Supabase realtime subscription in `/room/[id]`
- [ ] PlayerGrid updates when players join (role cards flip)
- [ ] "Start Drop" button appears when 2+ players joined
- [ ] `/api/start-speaking` updates room status
- [ ] Big screen shows current speaker highlighted with timer

### HOUR 3 (120 -> 180 min)
- [ ] ReasoningStream component renders streaming text
- [ ] Auto-triggers Gemini when status changes to `reasoning`
- [ ] Reasoning text streams word-by-word on big screen
- [ ] DECISION and BECAUSE lines render with special styling
- [ ] Auto-scrolls as text streams in

### HOUR 4 (180 -> 240 min)
- [ ] DecisionReveal animation works
- [ ] Decision Card page (`/card/[id]`) renders correctly
- [ ] Decision Card shows all players + transcripts
- [ ] Copy link button works
- [ ] Overall UI polish on big screen
- [ ] Test full flow end-to-end 3 times

---

## PERSON 2 — Bharath: Mobile Experience + AI Engine

### HOUR 1 (Now -> 60 min)
- [ ] `/join/[id]` name entry page works
- [ ] `/api/join-room` assigns correct roles
- [ ] Role reveal screen shows emoji + prompt
- [ ] Mobile layout is thumb-friendly (large tap targets)
- [ ] "Got it" button transitions to waiting state

### HOUR 2 (60 -> 120 min)
- [ ] SpeakingView renders with 15s timer
- [ ] Web Speech API captures voice on mobile Chrome
- [ ] Live transcript appears as user speaks
- [ ] Timer ring animates countdown
- [ ] `/api/submit-transcript` saves to Supabase
- [ ] Mobile detects when it's their turn (realtime)

### HOUR 3 (120 -> 180 min)
- [ ] Gemini streaming prompt produces good output
- [ ] Test prompt with mock transcripts — verify DECISION format
- [ ] `/api/start-reasoning` streams correctly to client
- [ ] Verify DECISION + BECAUSE parsing and saving
- [ ] Mobile transitions through all states correctly

### HOUR 4 (180 -> 240 min)
- [ ] ElevenLabs reads challenge aloud at start
- [ ] ElevenLabs reads final decision aloud dramatically
- [ ] Mobile "done" state shows decision + card link
- [ ] Full mobile flow polish
- [ ] Test on actual phones (iPhone + Android if possible)

---

## INTEGRATION (Both, Last 30 min)

- [ ] Run complete demo flow 3 times — no crashes
- [ ] Fix any realtime sync issues
- [ ] Verify ElevenLabs audio plays on big screen
- [ ] Decision Card shareable link works
- [ ] Verify Vercel deployment is live
- [ ] Prepare demo script — practice 3-minute pitch
- [ ] Backup plan ready (typing instead of voice)

---

## DEMO SCRIPT (Reference)

```
0:00-0:15  "Every group has this argument. Drop ends it."
           [Show QR — judges scan]

0:15-0:30  [Watch role cards flip as 6 judges join]
           "Everyone got a role. 15 seconds. Speak honestly."

0:30-0:45  [ElevenLabs reads the challenge aloud]
           [Speaking round begins]

0:45-1:45  [Each judge speaks their role — 15s each]
           [Transcripts appear live on screen]

1:45-2:30  "Drop is deciding."
           [Gemini streams live — point out role references]
           [Final DECISION appears]

2:30-2:50  [ElevenLabs reads decision aloud]
           [Decision Card appears — show shareable link]

2:50-3:00  "Built on Vercel, Gemini, Supabase, ElevenLabs.
            Because the best decision is the one your group
            actually makes together — in 90 seconds."
```

---

## STRETCH GOALS (If Time Allows)

- [ ] Clerk dashboard at `/dashboard` — hosts see past drops
- [ ] Animate each role card flipping in with a stagger effect
- [ ] Add location-aware restaurant suggestions via Google Maps API
- [ ] Support 2-5 player mode (skip roles gracefully)
- [ ] Add a "replay" button on the Decision Card
- [ ] Sound effects on role reveal

---

## API Keys Checklist

- [ ] Supabase Project URL + Anon Key
- [ ] Supabase Service Role Key
- [ ] Google Gemini API Key (from AI Studio)
- [ ] ElevenLabs API Key + Voice ID
- [ ] Clerk Keys (optional)
- [ ] All added to Vercel environment variables
