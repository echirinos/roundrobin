# PlaySync — native mobile app build prompt (App Store + Google Play)

Paste this into a coding agent. It is written in the Fable method: goal-first,
adjectives converted to checkable bars, a builder-never-grades-itself loop, and
reuse of what already works. This is a foundational build — start in plan mode,
confirm the short human-only list at the bottom, then build autonomously. Use
ultracode.

## Operating method — READ THIS FIRST, it governs the whole project
The canonical method for how you work on every part of this build is the Fable
prompting guide: https://simplemarkdowneditor.com/pub/IbaCrTjLJT?key=uQOQ2NPO3TTUSXyYDjyLf
Fetch and read it before you start, and run every decision, sub-agent, and review
through it for the entire project. If you cannot open the link, apply these five
principles it teaches (they still bind you):
1. Take the goal, own the how. I give outcomes, not steps — find the best path; don't
   ask permission for reversible work.
2. Convert every adjective into a checkable bar. "Beautiful / smooth / native" is not
   the bar; translate each into a concrete self-testable check, and invent the
   measuring stick when one doesn't exist. (See "The bar" and the head-to-head test.)
3. The builder never grades itself. Before claiming any surface done, spin up a
   fresh-context sub-agent (or a different model) pointed at the real running app and
   tell it to DISPROVE that it's finished. Fix what it finds. Loop until it can't.
4. Build on what's already done. Reuse the existing engine, backend, tokens, and prior
   decisions instead of re-deriving.
5. Get out of your own way. Make your own calls; only surface the irreversible,
   money-spending, or only-I-can-decide items. Plan up front for this foundational build.
Everything below is an application of this method — when in doubt, defer to the guide.

---

Build PlaySync as a brand-new native mobile app for iOS and Android — same product
as my existing web app (a round-robin pickleball organizer), rebuilt to feel and
look like a top-tier mobile app on the level of Flighty, and shipped to the Apple
App Store and Google Play. You own the "how"; if you find a better path than what's
below, take it, but tell me why in writing.

## Non-negotiable scope boundaries (read first)
- This is a SEPARATE, STANDALONE app in its own new repo. Do NOT touch, move,
  restructure, or import from my existing web app (~/pickleball-round-robin) — it
  stays exactly where it is and keeps deploying to Vercel untouched. No monorepo, no
  shared workspace with it.
- It is also completely independent from my other app, CourtLink
  (~/Documents/projects/courtlink-mobile) and its Expo project. Never import from,
  depend on, or reference CourtLink — not its code, Supabase, brand, or EAS project.
  Create a brand-new Expo/EAS project (fresh slug `playsync`, fresh bundle IDs,
  fresh projectId). My Expo account is connected and on a paid EAS plan; a live
  CourtLink project already exists there — do not interfere with it.

## The goal
A phone app that makes running and watching a pickleball round robin feel effortless
and premium, at full feature parity with the web app, that a stranger would assume
came from a well-funded startup — and that is architected to add a paid tier later
without a rewrite.

## How we win vs Swish and Pickleheads (v1 differentiators)
Both competitors are mature, broad platforms and already have player self-scoring,
push notifications with court assignments, real-time standings, DUPR upload, and
10–12 formats. Do NOT try to out-feature them — reach parity on those so we're not
behind, but win the way Flighty won flight tracking: radically more focused, polished,
and low-friction at the one moment that matters. The four things to be visibly best at:
1. Zero-friction, no-app player experience (the wedge + growth loop): a guest scans a
   QR or taps a link and instantly sees THEIR next court, live, with NO download and
   NO login. The native app is an optional delight-upgrade, never a gate. Being great
   for the non-installer is what makes every event spread us. (Rivals push players into
   their app + a group/account to get value — be the opposite.)
2. Ambient "you're up" on the lock screen: a persistent Live Activity / Dynamic Island
   / widget showing "Court 3 · you're up next · live score" so "am I up? where do I go?"
   answers itself without opening anything. This is the clearest place to out-polish them.
3. Best-in-class messy reality: graceful late-add (already built on web) PLUS one-tap
   drop-out / sub-in / pause-a-player that never breaks existing rounds. "Handles real
   open play, not a rigid bracket."
4. A finish moment: end-of-session recap + winner celebration (a Skia moment) with a
   shareable results card — screenshot-worthy and another organic share.

## Reuse what already works (don't re-derive)
- The web app's round-robin engine is pure TypeScript with zero React/DOM deps — all
  matchmaking, scoring, standings, and formats. Source files:
  src/lib/formats/{scoring,fixed-generators,rotating-generators,court-optimizer,index}.ts,
  src/lib/dupr/*, src/lib/live-session.ts, src/types/{formats,database}.ts. VENDOR
  these into the mobile repo as an internal /engine module (they're
  framework-agnostic; the only mechanical change is remapping the web repo's `@/`
  import alias, and the DUPR module's env/fetch touchpoints need thin native
  adapters). Do not rewrite the round-robin math — porting a
  battle-tested engine beats reinventing it. The engine ships with a passing sim suite
  (`npm run sim` in the web repo); bring those sims across and keep them green. If the
  web engine changes later, re-vendor; if drift becomes painful, extract the engine to
  a shared git package then — not now.
- Live spectator sync already works server-side: the web app's Next.js /api/sessions
  backed by Upstash Redis (6-char join codes, organizer tokens, QR links, 24h TTL).
  The mobile app is just another client of that SAME deployed API — so a session
  started on web is watchable on mobile and vice versa. Do not build a new backend.
- Reuse the web design tokens (app/globals.css: --primary, --live, --success,
  --warning, the court theme, fonts) as the seed for a typed native theme — then
  elevate them to native-app quality.
- Feature parity target: every format the web wizard exposes (13 today), rotating + fixed partners, the setup wizard,
  DUPR add/search, the late-add flow, live spectator + QR, score entry, and standings.

## Recommended stack (strong default; override only with written justification)
- Expo SDK 57 (current latest; New Architecture / Fabric is the default), TypeScript.
- Expo Router for navigation. Add the `expo-mcp` dev package so the build loop can
  drive the simulator (screenshots, taps) for the disprove-it grader step.
- Reanimated 4 + React Native Gesture Handler for all animation and gestures.
- React Native Skia for custom GPU rendering (standings reorder, court ladder/bracket
  viz, win celebration, the live "shine" on the current round) — this is what lets RN
  match native-app polish.
- expo-haptics; FlashList / Legend List for lists; MMKV for local persistence.
- State: Zustand for local/UI + session state; TanStack Query for any remote data
  (caching, retries, offline). Keep the vendored engine pure/stateless.
- Analytics: posthog-react-native. Crash/error: Sentry (expo) — its own project.
- Live Activities + Dynamic Island (iOS) and an ongoing notification + Glance widget
  (Android) via config plugins / a small native module. Push: expo-notifications.
- EAS Build + Submit for CI, TestFlight, Play internal, then store release. EAS Update
  for OTA JS-only patches.

## Backend & data (staged — don't over-build v1)
- v1 (free core) adds NO new backend. Reuse the web app's existing Vercel Next.js
  /api/sessions + Upstash Redis (ephemeral live sessions, 24h TTL). The mobile app is
  just another client of that SAME deployed API, so web and mobile share live sessions.
  On-device state (current session, drafts, offline scores) lives in MMKV. Ship the
  whole free core on this — it's proven and needs nothing new.
- Persistent layer (added when accounts / Pro land, NOT before): use Supabase as ONE
  integrated backend — but a BRAND-NEW, SEPARATE Supabase project from CourtLink (own
  database, own keys, own org — same vendor ≠ coupled; zero shared data or code). It
  covers everything the roadmap needs in one place:
  - Postgres for durable relational data: users, saved crews / recurring groups,
    season leagues, standings history, player stats. (Postgres, not Redis/NoSQL,
    because this is queryable, aggregatable, time-series-ish data.)
  - Supabase Auth for the optional account: Sign in with Apple + Google (see Auth).
  - Row-Level Security for per-user data isolation.
  - Edge Functions for server-side work: DUPR result SUBMISSION (partner secrets stay
    server-side), Stripe webhooks (v2), and push/Live-Activity update triggers.
  - Storage for club/coach branding assets.
- Keep Upstash Redis for the live hot path even after Supabase lands (Redis is ideal
  for ephemeral session state). Optionally consolidate live sessions onto Supabase
  Realtime later if you want a single backend + push-based (not polled) live updates.
- Entitlements: RevenueCat abstracts App Store/Play IAP behind the `hasPro()` seam
  (or web/Stripe). Wire only the seam in v1; no billing SDK yet.
- Alternative to weigh (your call): Convex instead of Supabase+Upstash — real-time by
  default and TS end-to-end, the best technical fit for a live reactive scoreboard,
  paired with Clerk for auth. Trade-off: a new paradigm vs. Supabase familiarity from
  CourtLink. Default is Supabase for velocity + Postgres fit; flag if you'd prefer Convex.

## The bar — no adjectives; these are checkable, and you hold to them
Where I haven't given a number, invent the measuring stick and write it down.
Feel & performance (measure in RELEASE builds on device, not dev):
- Every scroll, tab change, standings reorder, and score-save animation holds 60fps
  (120 on ProMotion). No JS-thread jank on the standings reorder.
- Cold launch to interactive < 1.5s on an iPhone-12-class device and a mid-tier
  Android; measure and report TTI.
- Every primary action fires a haptic tuned to platform convention: selection on
  tab/segment, light impact on score tap, success notification on a round win and on
  a standings-leader change.
- Gestures feel native and interruptible: swipe between rounds/tabs, pull-to-refresh
  the spectator view, long-press a match for quick actions — all rubber-banded.
Visual (this is the Flighty bar):
- Light AND dark are both first-class, both deliberately designed (dark is not an
  auto-inverted afterthought). Scores use tabular/monospaced numerals.
- A cohesive custom type + color system, not stock defaults. At least 3
  "screenshot-worthy" Skia micro-moments (e.g. the reorder, a win burst, the
  live-round shine).
- Every empty, loading, and error state is designed — no raw spinners.
- Every screen passes a design-system check: consistent type / spacing / color / motion,
  no stock component left un-styled, nothing that reads as a restyled web page.
Native integration:
- iOS Live Activity + Dynamic Island and an Android widget both show: current round,
  your next match + court, and live score, updating in real time from the session.
- A spectator link or QR opens the app straight to the live session via universal /
  app links, falling back to web if the app isn't installed.
- Offline-first: score entry works with no signal (optimistic UI), and syncs to the
  existing Redis session when back online. A score is never lost.
- Reduced-motion honored; one-handed reachable on a 390px phone; tap targets ≥44pt.
Product:
- A guest opening a spectator link reaches "my next match + court" in < 10s on first
  launch, one-handed, on a 390px phone — with NO login and NO paywall.
- Engine parity: all formats, DUPR, late-add, live spectator, and standings produce
  identical results to the web app because it's the same engine. Prove it: run the
  ported sim suite green, and add a parity test that feeds fixed inputs and asserts
  the mobile results match the web app's.
- Blind test: show 5 real pickleball players the app next to Flighty, Swish, and
  Pickleheads. They rate its polish top-tier and can't pick out the "indie" one, and
  a stranger can't tell it was built by an AI or a solo dev.
- Mom test: 3 first-time users who DON'T play pickleball and aren't techy each complete
  the core task unaided — first try, no tutorial, no verbal help — set up and start a
  round robin (as organizer) and find their court from a link (as guest), with zero
  "wait, how do I…" stalls. If anyone needs help, the design isn't done.
- Both stores: a production build passes App Store review and Google Play review
  (correct icons/splash, privacy labels, screenshots, no rejections).

## Competitive acceptance test — the head-to-head (must beat, not just pass internally)
Run ONE fixed scenario identically on PlaySync AND on Swish AND on Pickleheads, on a
real device, and record the numbers. This is a gate in the grader loop: if PlaySync
loses or ties on any "must-win" row, it is NOT done.

Fixed scenario — "Tuesday open play" (identical across all three apps):
- 12 players, 3 courts, a rotating-partner format both competitors also support (e.g.
  Popcorn / basic round robin) so the comparison is apples-to-apples.
- Setup: open the app cold → add the 12 players → pick the format → start Round 1.
- Round 2: a 13th player arrives late (odd count).
- Round 3: one player leaves for good (drop-out) and a walk-on subs in.
- Spectator: a 14th person who did NOT set it up opens the shared link/QR and finds
  their own next court.
- Finish: end the session → see the winner/standings → share the result.

Measure per app (real device, release build); lower is better unless noted:
| # | Metric | How to measure | PlaySync target |
|---|--------|----------------|-----------------|
| 1 | Time-to-Round-1 | cold open → R1 matchups visible: seconds + taps + typed fields | ≤ both |
| 2 | Roster entry | paste/bulk-add 12 vs type one-by-one: seconds | ≤ both; paste works |
| 3 | Guest-to-court | non-organizer opens link → sees their court; note download? login? | WIN: 0 download, 0 login, <10s |
| 4 | Late-add (R2) | add 13th mid-session; did any PLAYED round change? + taps | WIN: 0 disruption |
| 5 | Drop-out + sub (R3) | remove + substitute mid-session; disruption? + taps | WIN: 0 disruption |
| 6 | Score entry | taps to record one game; can a player self-enter? | ≤ both |
| 7 | "Am I up?" ambient | surfaces next court WITHOUT opening the app (Live Activity/widget/push)? | WIN: yes, on lock screen |
| 8 | Finish moment | winner/recap + shareable results card? + taps to share | WIN: yes |
| 9 | Blind polish | 5 players rank the three apps' look/feel unlabeled | WIN or tie for top |

- Must-win rows: 3, 4, 5, 7, 8. If PlaySync doesn't clearly win these, keep iterating.
- Parity rows: 1, 2, 6, 9. PlaySync must be at least as good as the better competitor.
- Baselines: capture Swish + Pickleheads once on a real device (I'll run them, or a
  sub-agent records what it can from public docs/screens) and fill the table; then
  measure PlaySync every loop against those numbers. The disprove-it grader runs this
  scenario on the current build and reports the filled table — a loss on any must-win
  row is an open gap, not a ship.

## Monetization-ready architecture (ship everything FREE now; design the seam)
Business model is free-core-forever with a Pro tier added later, on evidence. Build
the seam now so turning Pro on is config, not a refactor. At launch there is NO
paywall UI and NO gated feature — but these must exist:
- One entitlement boundary: a `useEntitlement()` / `hasPro()` module behind a
  swappable provider interface; default provider returns "everything unlocked."
  Architect so the real provider can later be App Store/Play IAP (via RevenueCat) OR
  a web/Stripe entitlement — billing swappable behind this one interface. No billing
  SDK wired at launch; just the seam.
- Golden rule, enforced in code: NEVER gate on headcount or spectators. Unlimited
  players, unlimited spectators, spectator link/QR always free and unauthenticated.
  The entitlement boundary may only ever wrap "organizer power" features. Leave a
  comment at the boundary stating this so no future dev gates the viral loop.
- Tag the intended Pro surfaces now (free, but marked, one `hasPro()` check away):
  saved crews / recurring groups, season leagues + standings history + player stats,
  real DUPR result SUBMISSION (today it's display-only), club/coach branding on the
  spectator page.
- Analytics from day one (PostHog): (a) organizer recurrence — repeat events over
  time keyed to a stable anonymous organizer/device id; (b) "reached a locked door" —
  fire an event whenever a user opens a would-be-Pro surface. These pick the first
  paywall.
- Auth: anonymous-first. No login to organize or spectate — ever. The OPTIONAL account
  uses Supabase Auth (the same separate Supabase project as the backend; use Clerk
  instead only if you choose Convex). On iOS offer Sign in with Apple AND Google (App
  Store Guideline 4.8 requires Apple alongside Google); Google + Apple on Android. The
  account is required ONLY to persist crews/leagues across devices and hold a Pro
  entitlement — never on the core path. Fast-follow (not v1): phone / SMS OTP,
  specifically to power "text a join link to your crew" invites (our viral loop). Skip
  passkeys for v1.
- Money movement (entry fees / court-cost split via Stripe) is explicit v2 — don't
  build it now, but model events with a roster/attendance shape a payments layer can
  attach to later.

## House rules
- Never modify or depend on the web repo or the CourtLink repo (see scope boundaries).
- Reuse the ported engine and the existing /api/sessions backend; don't fork or
  rewrite either.
- Mobile-first, 390px baseline, scaling cleanly to large phones and tablets.
- Verify before you assert. "Works" means you ran it on a simulator/device in a
  release build and watched it, not that it compiled.

## Design language first (build the LOOK before the screens)
"Beautiful" is a bar reached deliberately and up front — not by decorating screens after
they work. Do this before building the bulk of the UI:
1. Reference teardown: study Flighty and 2–3 other genuinely top mobile apps (your pick —
   e.g. Things, Linear, Apple Sports, Copilot Money). Name exactly what makes each feel
   premium: type scale + weights, spacing rhythm, color + real dark mode, motion
   (durations/easings), how they make dense data glanceable, and their signature moments.
   Treat Swish/Pickleheads as the anti-reference — what to beat, not copy.
2. Derive a NATIVE design system (not a port of the web/shadcn tokens — those are a color
   seed only): type scale, spacing scale, light + dark palettes (both designed),
   elevation/materials, a motion spec (standard durations/easings + the Reanimated/Skia
   signature moments), and a component kit (buttons, cards, list rows, the score input,
   the standings row, the "live" treatment). Use iOS + Android idioms, not web patterns.
3. Establish the look on 3 HERO screens first — live matches + score entry, standings
   (with the reorder moment), and the spectator "you're up" view — as high-fidelity
   mockups. Use the gstack /design-consultation, /design-shotgun, and /design-html skills
   to explore and produce them. Get these signed off BEFORE building the rest.
4. Then build every screen strictly to the system. Nothing ships that a design reviewer
   would call generic, inconsistent, or "web-in-a-shell."

## How to work
- Engineering mode: split into surfaces (setup/roster wizard, live matches + score
  entry, standings, spectator/live session, DUPR, Live Activity/widgets, theming +
  motion system, entitlements + analytics scaffolding) and drive them from a task
  list, in parallel where independent.
- The builder never grades itself. After each surface, spin up a FRESH-CONTEXT
  sub-agent (or a different model via /codex) pointed at the app actually running on
  a simulator/device — real taps, screen recordings, release build — and tell it to
  DISPROVE that the bar above is met. Fix what it finds. Loop until it genuinely
  can't find a gap. Only then move on.
- Run TWO more disprove-it passes each loop, not just the functional one:
  · Design grader — a fresh-context reviewer (or a different model, or gstack
    /design-review) shown the running app's screens UNLABELED beside Flighty + your
    references; it must try to pick out the indie one and list every place the app looks
    generic, off-system, or web-like. Fix and loop until it can't.
  · Mom-test grader — a non-pickleball, non-technical first-timer (real, or adversarially
    simulated) who must complete the core tasks with ZERO help. Every stall or "how do I…"
    is a bug. Loop until they sail through first try.
- Ship each increment to TestFlight + Play internal via EAS so I can feel it on a
  real device.
- Make your own calls on everything reversible. Only stop for the human-only list.

## Decided (don't re-ask)
- App name: "PlaySync". Bundle IDs default to com.playsync.app (iOS) /
  com.playsync.android — I'll confirm exact IDs + Apple Team ID before first submit.
- Apple Developer + Google Play accounts already exist → wire EAS Submit to both.
- Sign-in: anonymous-first; wire Apple + Google now via a managed provider (see Auth
  above); phone/OTP is a fast-follow.
- v1 goes beyond web parity with the four differentiators in "How we win" above.

## Confirm with me only if truly blocked
- Exact bundle IDs / Apple Team ID (I'll ask right before the first store submit).
- Anything you think of that you want in v1 beyond the above.
