# Drop — Build Tasks

> Hackathon: Zero to Agent: Vercel × DeepMind NYC | March 21, 2026
> Deadline: 5:00 PM EST | Team: Manav + Bharath

## Status Legend
- [ ] TODO
- [x] DONE
- [~] IN PROGRESS

---

## MILESTONE 0 — App Boots Locally
**Goal:** `npm run dev` runs, homepage loads, no console errors.
**Test:** Open `http://localhost:3000` — see the Drop logo, tagline, and form.

- [x] `npm install` completes without errors
- [x] `next.config.ts` renamed to `next.config.mjs`
- [x] Clerk removed from layout + middleware (local dev)
- [x] `.env.local` created with placeholder values
- [x] `npm run dev` → server starts → homepage renders

**STOP HERE. Confirm the homepage looks correct before moving on.**

---

## MILESTONE 1 — Room Creation Works
**Goal:** Fill in the form, hit "Start a Drop", land on `/room/[id]`.
**Depends on:** Real Supabase URL + Anon Key in `.env.local`

### Setup
- [ ] Create Supabase project at supabase.com
- [ ] Run `backend/supabase/schema.sql` in Supabase SQL Editor
- [ ] Enable Realtime on `rooms` and `players` tables in Supabase dashboard
- [ ] Add real `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`
- [ ] Add real `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`
- [ ] Restart dev server

### Tasks
- [ ] POST `/api/create-room` — check Supabase `rooms` table gets a row
- [ ] Home form submits → redirects to `/room/[id]`
- [ ] Room page loads without error

### Test
1. Type "Where should we eat tonight?" in the form
2. Hit "Start a Drop"
3. Get redirected to `/room/TIGER-7` (or similar code)
4. Open Supabase table editor → confirm row exists in `rooms`

**STOP HERE. Confirm room is created in DB before moving on.**

---

## MILESTONE 2 — Host Screen Renders (Static)
**Goal:** `/room/[id]` shows QR code, room code, and 6 empty role slots.
**Depends on:** Milestone 1 complete.

- [ ] QR code renders correctly (points to `/join/[id]`)
- [ ] Room code displayed large (e.g. "TIGER-7")
- [ ] 6 role slots shown as empty placeholders
- [ ] "Waiting for players" status shown

### Test
1. Visit `/room/TIGER-7` (use a real room ID from M1)
2. Confirm QR code is visible and scannable
3. Confirm 6 grey role card slots appear
4. Scan QR with phone — should navigate to `/join/TIGER-7`

**STOP HERE. Confirm QR scan works on a real phone before moving on.**

---

## MILESTONE 3 — Player Joins + Gets a Role
**Goal:** Someone scans QR, enters name, gets assigned a role.
**Depends on:** Milestone 2 complete.

- [ ] `/join/[id]` — name entry screen renders on mobile
- [ ] POST `/api/join-room` — check `players` table gets a row with correct role
- [ ] Role reveal screen shows emoji, role label, and prompt
- [ ] "Got it" button transitions to waiting screen

### Test
1. Open `/join/TIGER-7` on your phone
2. Enter your name → tap "Join Drop"
3. See role reveal (e.g. "🚫 The Dealbreaker")
4. Open Supabase `players` table — confirm your row is there with the correct role
5. Join again with a different name on another device — confirm a different role is assigned

**STOP HERE. Confirm 2 players show different roles in the DB before moving on.**

---

## MILESTONE 4 — Realtime: Players Appear on Host Screen
**Goal:** As guests join on mobile, role cards flip and fill in on the big screen in real time.
**Depends on:** Milestone 3 complete.

- [ ] Supabase realtime subscription active in `/room/[id]`
- [ ] `PlayerGrid` re-fetches when a new player row is inserted
- [ ] Role card flips from empty → shows name + role when player joins
- [ ] "Start Drop" button appears once 2+ players have joined

### Test
1. Open `/room/[id]` in one window (big screen)
2. Open `/join/[id]` in another tab or phone
3. Enter name and join
4. Without refreshing the big screen, watch the role card flip and fill in
5. Join with a second person — confirm "Start Drop" button appears

**STOP HERE. Realtime must work before speaking round makes any sense.**

---

## MILESTONE 5 — Speaking Round Starts
**Goal:** Host hits "Start Drop", speaking round begins, first player is highlighted.
**Depends on:** Milestone 4 complete.

- [ ] "Start Drop" button calls `/api/start-speaking`
- [ ] Room `status` updates to `speaking` in Supabase
- [ ] `current_speaker_role` set to first player's role
- [ ] Big screen highlights the current speaker's role card
- [ ] Mobile: player whose turn it is transitions from waiting → speaking view

### Test
1. Have 2 players joined (from M4)
2. Click "Start Drop" on host screen
3. Confirm room `status = speaking` in Supabase
4. Confirm the correct role card is highlighted on big screen
5. On the mobile of the player whose turn it is — confirm speaking view appears

**STOP HERE. Speaking state must be visible on both screens before testing voice.**

---

## MILESTONE 6 — Voice Capture + Transcript Saved
**Goal:** Player speaks, transcript appears live on their screen, gets saved to Supabase.
**Depends on:** Milestone 5 complete.

- [ ] `SpeakingView` renders with 15s countdown timer
- [ ] Web Speech API starts listening automatically
- [ ] Live transcript text appears as player speaks
- [ ] Timer counts down to 0 (or "Done Speaking" tapped)
- [ ] POST `/api/submit-transcript` saves transcript to `players` table
- [ ] `has_spoken = true` set for that player in Supabase

### Test
1. When it's your turn on mobile, speak clearly for ~10 seconds
2. Watch transcript appear live on your phone screen
3. After 15s (or tap "Done"), check Supabase `players` table
4. Confirm your row has `transcript` filled in and `has_spoken = true`
5. On big screen, confirm the player's card shows a checkmark or "spoken" state

**STOP HERE. Every player must be able to submit a transcript before reasoning starts.**

---

## MILESTONE 7 — Gemini Reasoning Streams Live
**Goal:** After all players speak, Gemini streams its reasoning on the big screen word-by-word.
**Depends on:** Milestone 6 complete + real Gemini API key.

### Setup
- [ ] Add real `GEMINI_API_KEY` to `.env.local`
- [ ] Restart dev server

### Tasks
- [ ] When all players have `has_spoken = true`, room status → `reasoning`
- [ ] Big screen shows "Drop is deciding..." header
- [ ] Gemini streaming begins — text appears word by word
- [ ] Role names referenced in reasoning text (e.g. "The Dealbreaker ruled out...")
- [ ] `DECISION:` line renders large + orange
- [ ] `BECAUSE:` line renders below in italic
- [ ] Final decision + reason saved to `rooms` table in Supabase
- [ ] Room `status` → `done`

### Test
1. Complete a full speaking round with 2+ players (real speech or type fallback)
2. Trigger reasoning (manually call `/api/start-reasoning` or wait for auto-trigger)
3. Watch text stream on big screen — should reference your actual words
4. Confirm final `DECISION:` and `BECAUSE:` appear
5. Check Supabase `rooms` table — confirm `final_decision` and `final_reason` are saved

**STOP HERE. Verify the reasoning actually references what players said before polishing.**

---

## MILESTONE 8 — Decision Reveal + Card
**Goal:** Final answer displays dramatically, Decision Card at `/card/[id]` is shareable.
**Depends on:** Milestone 7 complete.

- [ ] Big screen transitions to `DecisionReveal` when `status = done`
- [ ] Decision animates in (drop effect)
- [ ] "See Decision Card" link appears
- [ ] `/card/[id]` loads — shows decision, reason, all player names + roles
- [ ] "Copy Link" button copies the card URL to clipboard
- [ ] Mobile "done" state shows the decision + link to card
- [ ] "Start a New Drop" button on mobile navigates to `/`

### Test
1. Complete full flow end-to-end
2. Final decision appears on big screen
3. Visit `/card/[id]` — confirm all players listed, decision shown
4. Copy link and open in incognito — confirm it loads for anyone

**STOP HERE. End-to-end flow is complete. Now add audio.**

---

## MILESTONE 9 — ElevenLabs Audio
**Goal:** App reads the challenge aloud at the start and reads the final decision dramatically.
**Depends on:** Milestone 8 complete + real ElevenLabs key.

### Setup
- [ ] Add real `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` to `.env.local`
- [ ] Restart dev server

### Tasks
- [ ] When host clicks "Start Drop", ElevenLabs reads the decision question aloud
- [ ] When final decision revealed, ElevenLabs reads decision + reason aloud
- [ ] Audio plays on the host/big screen browser
- [ ] If ElevenLabs fails, app continues silently (no crash)

### Test
1. Create a room, have players join, click "Start Drop"
2. Hear the challenge read aloud on the host screen
3. Complete full flow → hear final decision read aloud
4. Temporarily set `ELEVENLABS_API_KEY=invalid` — confirm app still works without audio

**STOP HERE. Full demo-ready flow confirmed before deployment.**

---

## MILESTONE 10 — Deploy to Vercel
**Goal:** App is live on a public URL, works on real phones.
**Depends on:** All milestones 1–9 complete.

- [ ] Push repo to GitHub (make sure `.env.local` is in `.gitignore`)
- [ ] Connect repo to Vercel
- [ ] Add all env vars in Vercel project settings
- [ ] Set Vercel root directory to `frontend/`
- [ ] Deploy → confirm build succeeds
- [ ] Visit production URL — confirm homepage loads
- [ ] Create a room on production — confirm end-to-end flow works
- [ ] Test QR scan on a real phone on the production URL
- [ ] Add production URL to Supabase "Allowed Origins" if needed

### Test
1. Full demo run on production URL — no localhost
2. Two real phones join via QR, speak, get a decision
3. Share Decision Card link — opens on a third device

**STOP HERE. You're demo-ready.**

---

## MILESTONE 11 — Demo Rehearsal
**Goal:** Run the full 3-minute demo 3 times without a hitch.

- [ ] Practice demo script (see below) — all 3 team members know the beats
- [ ] Confirm judges can scan QR from across a table
- [ ] Backup plan ready: one phone pre-loaded with `/join/[id]` in case QR fails
- [ ] Know which ElevenLabs voice is playing — test volume level in the room
- [ ] Know exactly what to say when Gemini is streaming ("watch it reference what you said...")
- [ ] Run 3 full demos — fix any crash bugs found

### Demo Script
```
0:00–0:15  "Every group has this argument. Drop ends it."
           [Show QR — judges scan]

0:15–0:30  [Role cards flip as judges join]
           "Everyone got a role. 15 seconds. Speak honestly."

0:30–0:45  [ElevenLabs reads the challenge aloud]

0:45–1:45  [Each judge speaks — transcripts appear live on screen]

1:45–2:30  "Drop is deciding."
           [Point out: "Watch it reference what Sarah said..."]
           [Point out: "It just resolved the Wildcard vs Realist conflict"]
           [DECISION drops]

2:30–2:50  [ElevenLabs reads decision aloud]
           [Show Decision Card + shareable link]

2:50–3:00  "Built on Vercel, Gemini, Supabase, ElevenLabs.
            Because the best decision is the one your group
            actually makes — in 90 seconds."
```

---

## STRETCH GOALS (Only After M10 is Green)

- [ ] Clerk auth at `/dashboard` — host sees all past drops
- [ ] Role card stagger-flip animation on join
- [ ] Google Maps / Yelp integration for real restaurant suggestions
- [ ] Graceful 2–5 player support (skip roles from the bottom)
- [ ] "Replay reasoning" button on Decision Card
- [ ] Sound effects on role reveal

---

## API Keys Checklist

- [ ] Supabase Project URL + Anon Key → `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Supabase Service Role Key → `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Google Gemini API Key → `GEMINI_API_KEY`
- [ ] ElevenLabs API Key → `ELEVENLABS_API_KEY`
- [ ] ElevenLabs Voice ID → `ELEVENLABS_VOICE_ID`
- [ ] All keys added to Vercel environment variables before M10
