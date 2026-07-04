# TODOS

## Live Sessions

### Revision check on snapshot sync (stale-writer protection)

**What:** Add a monotonic revision counter to the live-session snapshot; the PUT handler rejects writes whose revision isn't greater than the stored one (compare-and-set), and the client surfaces/reconciles the conflict instead of silently overwriting. Store check-ins in a separate Redis key from the organizer snapshot so a check-in write and a score write never touch the same blob.

**Why:** Sync is last-writer-wins over full snapshots on a now-shared store. Two races exist: (1) a spectator check-in POST and an organizer score PUT that both read the same record can clobber each other; (2) two debounced organizer pushes can land out of order. Both are currently **transient and self-healing** — the organizer's localStorage is authoritative, and its 5-second poll + re-push restores the true state within ~5s — but a spectator can briefly see a reverted score, and a permanent loss is possible in the narrow window where the organizer closes the tab within ~5s of a race.

**Context:** Confirmed by Codex adversarial review during the v0.4.1 ship. Until this lands, treat "one organizer tab at a time" as a soft constraint. Touch points: `src/lib/live-session-store.ts` (split check-ins from snapshot; CAS write), `app/api/sessions/[code]/route.ts` (409 on stale revision), push effect + poll in `app/tournament/page.tsx`.

**Effort:** M
**Priority:** P1
**Depends on:** None

### Reset should end or expire the published session

**What:** When the organizer resets a tournament, delete or expire the remote session record instead of leaving spectators polling stale data. (The 24h TTL added in v0.4.1 bounds the staleness; an explicit DELETE would end it immediately.)

**Why:** After "Reset everything," spectators keep seeing the dead session until the TTL lapses, with no signal it ended.

**Context:** Pre-existing behavior. Needs a DELETE endpoint (delete the Redis key) or a tombstone flag the spectator view renders as "session ended."

**Effort:** S
**Priority:** P2
**Depends on:** None

## Formats Engine

### Wire `npm run sim` into CI

**What:** Add a CI workflow (GitHub Actions) that runs lint, build, and `npm run sim` on push/PR.

**Why:** The simulation suite is the only automated regression net for the round generators (seeding parity, bye fairness, rematch avoidance across 5 gauntlet scenarios and 24 ladder generator/config runs) — and it only protects when someone remembers to run it.

**Context:** The repo has no `.github/workflows/` at all. `npm run sim` exits non-zero on any assertion failure, so it's CI-ready as-is (tsx is a pinned devDependency).

**Effort:** S
**Priority:** P1
**Depends on:** None

### Share one tiebreak comparator between sortStandings and the generators

**What:** Extract the wins → win % → head-to-head → point differential → points-for chain into exported helpers in `scoring.ts`, consumed by `sortStandings`, `generateTeamGauntletRound`'s `bySeed`, and the rotating gauntlet's rank map.

**Why:** The "standings tab predicts next round's courts" invariant is currently enforced by mirrored code plus sim assertions; a shared comparator makes drift structurally impossible.

**Context:** Maintainability finding from the v0.4.0 ship review. The mirrors were verified identical (including full-tie stable ordering) as of v0.4.0.

**Effort:** M
**Priority:** P2
**Depends on:** None

## UI Polish

### Unify the court-movement chip treatments

**What:** One shared MovementBadge component instead of two visual treatments (GameCard's uppercase pill vs YouAreUpCard's sentence-case Badge) for the same up/down concept on the same screen.

**Why:** Two adjacent renderings of the same state read as inconsistency; a shared component also keeps the movement semantics (`lower court = up`) in one place.

**Context:** Design + maintainability findings from the v0.4.0 ship review. Also a candidate home for a `courtMovement(current, previous)` helper currently duplicated in `round-game-score-entry.tsx` and `you-are-up-card.tsx`.

**Effort:** S
**Priority:** P3
**Depends on:** None

### Extract a shared ConfirmDialog

**What:** One ConfirmDialog component (title, description, cancel/confirm labels, destructive styling, testid prefix) used by both the reset and undo-round confirmations.

**Why:** Two ~25-line near-identical dialog blocks shipped in v0.4.0; a third destructive action would make it three.

**Context:** Maintainability finding from the v0.4.0 ship review (`app/tournament/page.tsx` reset dialog, `round-manager.tsx` undo dialog).

**Effort:** S
**Priority:** P3
**Depends on:** None

## Completed

### Organizer write-token for the sessions API

**What:** Mint an organizer-only token on publish, require it on `PUT /api/sessions/[code]`, strip it from all public responses, cap payload size.

**Completed:** v0.4.1 (2026-07-04). The token is stored in the organizer's localStorage keyed by code and sent as `x-organizer-token`; PUT returns 401 without it and 403 on mismatch; check-in stays open. An empty-token fixation bug (found by Codex adversarial review) was fixed before ship.

### Move live sessions off per-instance memory

**What:** Back live sessions with a shared store so spectator links survive redeploys and multiple serverless instances.

**Completed:** v0.4.1 (2026-07-04). Upstash Redis (Vercel Marketplace) with a 24h TTL refreshed on write; in-memory fallback for local dev with no store configured.
