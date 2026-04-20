# MindMoney — Learning App Plan

## Overview
A gamified educational app for a Grade 2 student in Toronto. Kids solve problems across multiple subjects, earn real cents on the dollar, and can cash out with Dad. Beautiful, engaging, not homework-flavored.

**App name: MindMoney**

**Future sibling support:** younger sibling (Grade K/1 level) will be added — multi-profile from the start.

---

## Core Philosophy
- **It should feel like a Mr Beast challenge, not school**
- Competition is the #1 motivator — always something to beat (yourself, a record, a target)
- Earnings are the hook — every correct answer has a real cent value, displayed big and loud
- Progress is always visible — big dramatic numbers, streaks, rankings
- Never punish — only reward and encourage
- Help is always available so frustration never wins
- **Seasons prevent burnout** — monthly resets mean there's always a fresh competition starting

---

## Subjects
Based on Ontario Grade 2 curriculum:

| Subject | Example Topics |
|---|---|
| Math | Addition, subtraction, skip counting, basic multiplication intro, telling time, money |
| Reading / Language | Sight words, fill-in-the-blank sentences, word matching, short reading comprehension |
| Logic / Puzzles | Pattern completion, odd one out, simple sequences, spatial reasoning |
| Science | Animals, weather, basic forces, life cycles |
| Engineering / Problem Solving | Simple machines, "what would you use to...?" questions |

**All subjects unlocked from Day 1.** Difficulty tiers unlock per subject based on performance.

---

## Earning System ("Learn to Earn")

### Direct Cents — What You See Is What You Earn
- No conversion, no coins, no exchange rate confusion
- Every correct answer earns **real cents** shown immediately on screen
- "You earned 10¢!" — that is literally 10 cents Dad will pay out

### Difficulty Tiers & Cent Values
| Tier | Name | Unlocked By | Earnings per Correct Answer |
|---|---|---|---|
| 1 | Starter | Always available | 5¢ |
| 2 | Getting There | 80% accuracy over 10 Starter questions | 10¢ |
| 3 | Sharp | 80% accuracy over 10 "Getting There" questions | 20¢ |
| 4 | Genius | 80% accuracy over 10 Sharp questions | 50¢ |

### Earnings Ledger
- **Lifetime Total Earned** — never resets, always visible on home screen
- **Cashout Balance** — unredeemed cents (what Dad still owes)
- Dad marks amounts as redeemed via the Dad Panel; cashout balance decreases
- History log: "April 5 — Cashed out $3.00 ✓"

---

## Question System

### Data Format — JSON Files
Questions stored in `/data/questions.json` (one file, filterable by subject/difficulty).
Easy for Dad to open in a text editor and add new questions anytime.

```json
{
  "id": "math_add_001",
  "subject": "math",
  "topic": "addition",
  "difficulty": 1,
  "type": "multiple_choice",
  "question": "What is 3 + 4?",
  "visual": null,
  "options": ["5", "6", "7", "8"],
  "answer": "7",
  "hint": "Count up from 3 — use your fingers!",
  "explanation": "3 + 4 = 7. If you have 3 apples and get 4 more, you have 7!",
  "grade_level": 2
}
```

The `grade_level` field supports future sibling profiles.

### Visuals in Questions — Recommended Approach

**The short answer: use emoji + parametric components for 95% of questions. Only use image files for the handful that truly need them.**

Three tiers of visuals, all JSON-friendly:

**Tier 1 — Emoji inline (zero extra work, works great for Grade 2)**
The question text itself carries the visual:
> "You have 🍎🍎🍎 and find 🍎🍎🍎🍎 more. How many apples total?"

This covers the majority of math and many logic questions. No image files needed. Author 500+ questions this way.

**Tier 2 — Parametric visual components (JSON describes it, React renders it)**
The JSON has a `visual` field that tells a React component what to draw.
No image files — the app generates the graphic from the data.

```json
"visual": { "type": "clock", "hour": 3, "minute": 0 }
"visual": { "type": "coins", "values": [25, 10, 5, 5] }
"visual": { "type": "dot_array", "rows": 3, "cols": 4 }
"visual": { "type": "number_line", "start": 0, "end": 20, "mark": 13 }
"visual": { "type": "pattern_row", "items": ["🔴","🔵","🔴","🔵","?"] }
"visual": { "type": "bar_chart", "values": [3,5,2,4], "labels": ["Mon","Tue","Wed","Thu"] }
```

This handles: telling time, counting money, number lines, patterns, simple graphs — all the Grade 2 math visuals without a single image file.

**Tier 3 — Image file reference (for science, reading, engineering)**
Only when a real image is needed (animal photos, diagrams):
```json
"visual": { "type": "image", "src": "frog_lifecycle.png" }
```
Images stored in `/public/images/`. Maybe 50–100 images max for science/reading topics — very manageable.

**Bottom line:** You can absolutely author 1000 questions in JSON. Most will be emoji text or parametric. Only a small fraction (science/reading) need image files.

### Question Bank Size & Variety Strategy

**Launch target:** 40 fixed questions + 10 templates per subject (Math + Logic only for Phase 1)
**Long-term target:** ~400 fixed + ~65 templates across all subjects = 1,600+ effective unique presentations
**Monthly refresh:** 20-30 new questions added by Dad aligned with current school topics — no code changes needed, just edit the JSON

**Strategy 1 — Parameterized Templates (biggest lever for Math/Logic)**
One JSON entry generates unlimited unique questions by randomizing parameters within a range.
```json
{
  "type": "template",
  "template": "What is {a} + {b}?",
  "params": { "a": {"min": 1, "max": 10}, "b": {"min": 1, "max": 10} },
  "answer": "a + b"
}
```
15-20 math templates = hundreds of unique questions. Works great for: all math operations, patterns, sequences, fill-in-the-blank word lists.

**Strategy 2 — Question Variants**
One concept, multiple surface presentations in a `variants` array. Same underlying fact, different wording/emoji/context. App picks a different one each time. Doubles effective count with minimal authoring.

**Strategy 3 — Freshness Tracking**
Per-player freshness score on each question. Recently-seen questions deprioritized, stale ones surfaced. With 300 questions a repeat only comes back after 30+ others have appeared — weeks apart in practice.

**Seasonal Packs — keeps the bank alive long-term**
New questions added silently — no "NEW" badge, no distinction from existing questions. Freshness tracking handles surfacing them naturally. Themed batches: hockey stats math, Canada Day trivia, whatever's being taught in school that month.

### Question Types
- Multiple choice (4 options) — primary type, mouse-friendly
- True / False
- Number input (type the answer)
- Matching (drag pairs together)
- Fill in the blank

---

## Adaptive Difficulty

Adaptation is mostly **invisible**. He feels the game responding to him intuitively — not like a scoring system judging him.

### Step 1 — Placement Quiz (first time per subject only)
Before he earns a single cent in a subject, a silent 5-question warm-up escalates from easy to hard.
The app finds his natural starting tier without ever telling him it's a test. He just starts playing.
No wrong answers during placement — it's always framed as "getting started."

### Step 2 — Within-Tier Micro-Adaptation (invisible, always running)
Every question is tagged easy/medium/hard *within* its tier.
- Start of a session → serve easier end of the current tier
- As correct answers stack up → gradually shift toward harder within the tier
- This creates a smooth ramp inside each tier so jumps between tiers feel smaller

### Step 3 — The Confidence Reset (invisible, automatic)
- After **2 wrong answers in a row** → silently inject 1 guaranteed easy question from a topic he's shown strength in
- He gets it right, earns his cents, momentum restored — he never knows it happened
- This is the most important anti-discouragement mechanic in the whole system

### Step 4 — Tier Unlocks (loud, celebrated)
- Rolling window: **8 correct out of last 10** at current tier → unlock next tier
- Big unlock celebration: badge, animation, "NEW TIER UNLOCKED — you now earn Xc per question!"
- The money angle does the motivating here naturally — harder tier = more cents = he wants to get there
- Player can always drop back to an unlocked tier manually if they want

### Step 5 — Tier Drops (silent, positively framed)
- Only triggers after **6 misses out of 10** — a prolonged struggle, not a bad streak
- Never announced as a failure. The screen just says: **"Let's build that streak back up!"** and easier questions appear
- If he notices and asks, the framing is: "warming up mode" to get the multiplier going
- He can manually bump back up to his unlocked tier anytime
- **Earnings do NOT drop during a tier drop** — he always earns at his highest unlocked tier rate regardless of which questions are being served. Difficulty adjusts, money never punishes.

### Subject Independence
Each subject tracks its own tier independently — Tier 3 Math and Tier 1 Reading at the same time is normal and expected.

---

## Help System

### Three Tiers of Help (zero penalty)
1. **Hint** — text clue appears ("Try counting on your fingers")
2. **Show Me** — app walks through a very similar example step by step
3. **Pass** — skip this question, no earnings, no penalty, next question loads

> Using Hint or Show Me does NOT reduce the cent value of the correct answer.

---

## The Money Display — Always Front and Center
This is the #1 hook. The UI should feel like a Mr Beast prize counter.
- **Session earnings** displayed huge in the center of the screen during play — this is the dominant visual
- Animated cash counter ticks up on every correct answer (dramatic, satisfying)
- "All-time earned" and "Cashout balance" always visible on the home screen, large
- Display in cents below $1.00 (50¢ feels bigger than $0.50), switch to dollars above ($2.40 feels bigger than 240¢)
- Every correct answer triggers a full earn animation — money flying, sound effect, the number jumping
- Wrong answers change nothing financially — the counter never goes down

---

## Competition System

### Ghost / Past Self
- After every session, your earnings score is saved
- Next session, your ghost from last time appears as a live competitor
- "Last session you had $1.20 at this point — you're ahead!" or "Your ghost is pulling ahead!"
- Ghosts are per-subject and per-season so there's always something recent to race

### AI Opponents — Named Characters
Fictional competitors the kid races against for season earnings. Like Mario Kart ghosts but with personality.
- 5–6 named characters, each with a different earnings pace/personality
- They're always on the season leaderboard with him, every season
- Their "scores" are calibrated to be competitive but beatable — they adapt slightly to stay near him
- Examples of character archetypes (names TBD): a cocky robot, a nerdy bookworm kid, a silly animal, a mysterious genius
- When you beat a character's season total, they trash-talk you into the next season ("I'll get you next season!")
- Mr Beast energy: they have personalities, they react, they feel like rivals

### Leaderboard Structure
- **Season Leaderboard**: AI opponents + Ghost + Player, ranked by cents earned this season
- **All-time Leaderboard**: same cast, cumulative — shows the long game
- Season resets monthly — new competition, fresh start, previous season trophies locked in forever

### Challenge Modes (no timers in normal play — optional Speed Mode only)
| Challenge | Earnings | Notes |
|---|---|---|
| Streak Run | 2x multiplier at 10-in-a-row | Main competitive mode |
| The Gauntlet | Big flat bonus for completion | 20 mixed questions |
| Weekly Event | Bonus earnings | Changes every Monday |
| Speed Mode | 3x multiplier | Opt-in only, clearly labeled, for when they want pressure |

### Achievements / Badges
- "Season 1 Champion" — beat all AI opponents in a season (kept forever as trophy)
- "Ghost Buster" — beat your own previous session score
- "Big Earner" — earn over $5.00 in a single session
- "Unstoppable" — 20 correct in a row
- "Unlocked!" — reach a new difficulty tier
- Season-specific badges: new design each month

### Streak Bonuses
- 5-in-a-row → 1.5x earnings multiplier
- 10-in-a-row → 2x earnings multiplier
- Breaking streak resets to 1x (no penalty, just resets)

---

## Infrastructure

### Stack
| Layer | Choice | Reason |
|---|---|---|
| Framework | React + Vite | Fast, component-based |
| Animations | Framer Motion | Smooth coin/celebration effects |
| Styling | Tailwind CSS | Rapid design, great defaults |
| Data | Local JSON file | Offline, easy to edit, no cost |
| Backend / DB | Supabase | Auth, profiles, earnings ledger, Dad panel |
| Hosting | Vercel | One-click deploy from GitHub |
| Source Control | GitHub | CI/CD via Vercel integration |
| State | Zustand | Lightweight |
| Audio | Howler.js | Sound effects |

### Why Supabase?
- Earnings data lives in the cloud — safe if browser clears
- Multi-profile support (Child 1, Child 2, Dad) from day one
- Dad Panel is a real authenticated dashboard, not a local page
- Future: could track question performance per profile to tune content

### Database Schema (rough)
- `profiles` — id, name, grade_level, avatar, created_at
- `sessions` — id, profile_id, date, cents_earned, questions_answered
- `question_attempts` — id, profile_id, question_id, correct, hint_used, time_taken
- `cashouts` — id, profile_id, amount_cents, date, note
- `difficulty_progress` — profile_id, subject, current_tier, questions_at_tier, accuracy

---

## Visual Design Direction

### Style
- **Bright, warm, playful** — Duolingo energy meets a cozy illustrated storybook
- PC-first layout (not mobile) — more screen real estate, can show more at once
- Large readable fonts, satisfying click interactions
- Smooth animations on every meaningful interaction

### Color Palette
- Primary: warm yellow + sky blue
- Accent: coral/orange for CTAs
- Success: green with sparkles
- Neutral: soft cream/white backgrounds

### Sound
- Cent "clink" sound on earnings
- Cheerful correct-answer chime
- Gentle "try again" (never a harsh buzzer)
- Optional background music toggle

---

## Cashout Flow

### Kid Side
1. Kid hits the big **"CASH OUT"** button on home screen (always visible)
2. App shows a dramatic full-screen: "YOU'VE EARNED **$3.80**!" with celebration animation
3. Screen shows: **"Get Dad to approve!"** + a PIN pad

### Dad Side (on the kid's computer — takes 10 seconds)
1. Dad walks over, types his 4-digit PIN directly on the kid's screen
2. Dad enters the amount he's actually paying → hits **Confirm**
3. Big celebration plays: "Dad paid you **$4.00**!" — confetti, sound, the works
4. Balance updates, transaction logged to history, done

**No second device. No separate login required in the moment. Just a PIN.**

The Dad Panel (Supabase, separate login) is a *review later* dashboard — never a required step in the cashout flow.

### The Exact Change Problem — Solved
Dad never needs exact change. Dad Panel lets him enter **any amount**:
- Paid more than owed ($4 for a $3.80 balance) → $0.20 surplus logged as credit, balance goes to -$0.20 (Dad is slightly ahead)
- Paid less ($3 for a $3.80 balance) → $0.80 still owed, stays in cashout balance
- Running balance is always accurate — honest accounting, no rounding needed
- This is also quietly a real-world money lesson (change, partial payment, credit)

### Dad Panel
- Supabase auth — separate Dad login
- Pending cashout requests shown front and center
- Each child's: total earned, cashout balance, payment history
- "Enter payment amount" field — not locked to exact balance
- Subject performance breakdown (where is each kid strong/weak?)
- All-time ledger: every cashout ever made, with dates

---

## Phases / Build Order

### Phase 1 — MVP (PC, one profile, math only)
- [ ] Supabase project setup + basic schema
- [ ] Home screen with earnings display (lifetime + cashout balance)
- [ ] Math subject, Tiers 1 & 2
- [ ] Multiple choice + number input question types
- [ ] Parametric visual components (clock, dot array, number line)
- [ ] Hint + Pass functionality
- [ ] Cent earning animation + daily cap bar
- [ ] Streak multiplier
- [ ] Persist progress to Supabase

### Phase 2 — Polish & Profiles
- [ ] Logic / Puzzle subject
- [ ] Adaptive difficulty unlock flow + badges
- [ ] Avatar + character reactions
- [ ] Sound effects
- [ ] Second profile support (sibling)
- [ ] Dad Panel v1

### Phase 3 — Full Curriculum
- [ ] Reading, Science, Engineering subjects
- [ ] Image-based questions + `/public/images/` library
- [ ] Full badge / achievement system
- [ ] Avatar cosmetics shop
- [ ] Dad Panel polish

---

## Open Questions / Still To Decide
- [ ] Should there be a story/world map wrapper or flat subject menu?
- [ ] Companion character (evolves as you learn) vs. static avatar?
- [ ] Mini-games mixed in, or pure Q&A format throughout?
- [ ] Session length target — how long should a typical play session be?
- [ ] Cosmetic avatar shop — is this worth building or scope creep?
- [ ] Any curriculum alignment tags needed? (Ontario Math expectations labeling)
