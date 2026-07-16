# TODOS

## Live Sessions

### Revision check on snapshot sync (stale-writer protection)

**What:** Add a monotonic revision counter to the live-session snapshot; the PUT handler rejects writes whose revision isn't greater than the stored one (compare-and-set), and the client surfaces/reconciles the conflict instead of silently overwriting.

**Why:** Sync is last-writer-wins over full snapshots on a shared store. The remaining race: two debounced organizer pushes (e.g. from two open organizer tabs) can land out of order. It is **transient and self-healing** — the organizer's localStorage is authoritative and the next state change re-pushes the full snapshot (700ms debounce) — but a spectator can briefly see a reverted score, and a permanent loss is possible if the last-writing tab closes before another change triggers a re-push. (The original check-in-vs-score race is gone: player check-in was removed in v0.4.7, and organizers don't poll — only spectators do.)

**Context:** Confirmed by Codex adversarial review during the v0.4.1 ship; rescoped 2026-07-16 after the check-in removal. Until this lands, treat "one organizer tab at a time" as a soft constraint. Touch points: `src/lib/live-session-store.ts` (CAS write), `app/api/sessions/[code]/route.ts` (409 on stale revision), debounced push effect in `app/tournament/page.tsx`.

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

### Sit-out toggle for players who leave mid-session

**What:** A per-player "sitting out" toggle in the roster editor. Benched players are excluded from new round generation but keep their games and standings. For set-teams formats, benching one player benches the team.

**Why:** "Somebody went home early" is the most common mid-session event at open play, and today there is no path: players with saved scores can't be removed (standings need them), so the generator keeps drawing them into rounds they won't play. Found by the 2026-07-16 fresh-eyes QA pass.

**Context:** Touch points: `LocalPlayer` gains an optional `sittingOut` flag (snapshot validator doesn't check player fields, so sync is safe), filter before `generateGamesForRound` in `app/tournament/page.tsx` and before preview generation in `round-manager.tsx`, toggle UI in `enhanced-player-setup.tsx`'s roster editor. Careful with the adjacent-pair roster invariant for fixed-team formats.

**Effort:** M
**Priority:** P2
**Depends on:** None

### Re-expose Mixed Madness once the roster collects gender

**What:** `mixed_madness` was removed from the wizard's format list (2026-07-16) because it promises gender-balanced teams while manual player entry never asks for gender (only DUPR imports carry it, and DUPR is config-gated off). The generator and settings survive; re-add the format to `ROTATING_MORE_FORMATS` when gender capture exists.

**Effort:** S (re-adding) — the gender capture UI is the real work
**Priority:** P3
**Depends on:** Roster gender capture or DUPR enablement

### Unify the court-movement chip treatments

**What:** One shared MovementBadge component instead of two visual treatments (GameCard's uppercase pill vs YouAreUpCard's sentence-case Badge) for the same up/down concept on the same screen.

**Why:** Two adjacent renderings of the same state read as inconsistency; a shared component also keeps the movement semantics (`lower court = up`) in one place.

**Context:** Design + maintainability findings from the v0.4.0 ship review. NOTE (2026-07-16): `you-are-up-card.tsx` no longer exists (removed with check-in in v0.4.7), so only GameCard's `TeamMovementChip` remains — this may now be moot; verify before working it.

**Effort:** S
**Priority:** P3
**Depends on:** None

## Completed

### Extract a shared ConfirmDialog

**What:** One ConfirmDialog component (title, description, cancel/confirm labels, destructive styling, testids) used by both the reset and undo-round confirmations.

**Completed:** v0.6.0 (2026-07-16). `components/ui/confirm-dialog.tsx`, used by `app/tournament/page.tsx` (reset) and `round-manager.tsx` (undo round).

### Organizer write-token for the sessions API

**What:** Mint an organizer-only token on publish, require it on `PUT /api/sessions/[code]`, strip it from all public responses, cap payload size.

**Completed:** v0.4.1 (2026-07-04). The token is stored in the organizer's localStorage keyed by code and sent as `x-organizer-token`; PUT returns 401 without it and 403 on mismatch; check-in stays open. An empty-token fixation bug (found by Codex adversarial review) was fixed before ship.

### Move live sessions off per-instance memory

**What:** Back live sessions with a shared store so spectator links survive redeploys and multiple serverless instances.

**Completed:** v0.4.1 (2026-07-04). Upstash Redis (Vercel Marketplace) with a 24h TTL refreshed on write; in-memory fallback for local dev with no store configured.
