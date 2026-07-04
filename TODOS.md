# TODOS

## Live Sessions

### Organizer write-token for the sessions API

**What:** Issue an organizer-only secret when a session is published and require it on `PUT /api/sessions/[code]`; spectators keep GET-only access via the share code.

**Why:** Today the 6-character spectator code is the only credential, so anyone holding a share link can overwrite the entire live snapshot (wipe rounds, falsify scores) for every viewer. The client-side `isSpectator` guard is advisory only.

**Context:** Flagged by both the security specialist and the adversarial review during the v0.4.0 ship. The PUT handler (`app/api/sessions/[code]/route.ts`) validates only snapshot shape (`isLiveTournamentSnapshot`). A minimal fix: mint a token in the publish path, store it with the session record, check it in PUT, and keep it in the organizer's localStorage. Payload size should be bounded at the same time (storage DoS).

**Effort:** M
**Priority:** P1
**Depends on:** None

### Revision check on snapshot sync (stale-writer protection)

**What:** Add a monotonic revision counter to the live-session snapshot; the PUT handler rejects writes whose revision is not greater than the stored one, and the client surfaces the conflict instead of silently overwriting.

**Why:** Sync is last-writer-wins over full snapshots. A second organizer tab holding pre-undo state can silently resurrect a deleted round and destroy rescored games on its next push. Undo Round (v0.4.0) makes divergent tab histories more likely.

**Context:** Adversarial review finding during the v0.4.0 ship. Until this lands, treat "one organizer tab at a time" as a hard constraint. Touch points: `src/lib/live-session.ts` (snapshot shape), `app/api/sessions/[code]/route.ts` (PUT guard), push effect in `app/tournament/page.tsx` (~line 437), plus a 409 handling path.

**Effort:** M
**Priority:** P1
**Depends on:** None

### Reset should end or expire the published session

**What:** When the organizer resets a tournament, delete or expire the remote session record instead of leaving spectators polling stale data forever.

**Why:** After "Reset everything," spectators keep seeing the dead session with no signal it ended.

**Context:** Pre-existing behavior noted during the v0.4.0 ship review; the reset dialog swap didn't change it. Needs a DELETE endpoint or a tombstone flag in the record that the spectator view renders as "session ended."

**Effort:** S
**Priority:** P2
**Depends on:** None

## Formats Engine

### Wire `npm run sim` into CI

**What:** Add a CI workflow (GitHub Actions) that runs lint, build, and `npm run sim` on push/PR.

**Why:** The simulation suite is the only automated regression net for the round generators (seeding parity, bye fairness, rematch avoidance across 26 assertions) — and it only protects when someone remembers to run it.

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
