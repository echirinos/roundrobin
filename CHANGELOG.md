# Changelog

All notable changes to PlaySync are documented here. This project follows
[Keep a Changelog](https://keepachangelog.com/) and Semantic Versioning.

## [0.5.0] - 2026-07-05

Late arrivals join set-partner sessions without breaking anything, and team
names always read in full on phones.

### Added
- Late arrivals in set-partner formats (Set Partners, Team Gauntlet, League):
  add players mid-session and rounds keep running. A lone late arrival waits on
  the bench ("needs a partner") instead of blocking the next round — the round
  control, preview, and roster editor all say so. Two unpaired late arrivals
  are teamed up automatically in the order they were added (or tap-pair them
  yourself). A freshly paired team joins the very next round with court
  priority, and every already-played round, score, and record stays exactly as
  it was.
- New `sim-late-add` simulation (wired into `npm run sim`) asserting the
  late-arrival guarantees: no blocking on odd rosters, played rounds untouched,
  existing records unchanged, newcomers scheduled next round.

### Fixed
- Full team names on mobile: standings rows, match cards, the round preview,
  and the score dialog wrap long names ("Bartholomew & Evangeline") instead of
  cutting them off — for organizers and spectators alike. The standings metric
  label reads "margin" so the name column has room to breathe on 390px screens.

## [0.4.8] - 2026-07-04

Previous rounds collapse so the Matches list stays short.

### Changed
- On the Matches tab the current round stays expanded, and each earlier round
  collapses into a tappable header ("Round 2 · Finished · 5 games") you open on
  demand. No more scrolling past every past round to reach the live one.

## [0.4.7] - 2026-07-04

Simpler for guests: no check-in. Spectators just open the link and watch.

### Removed
- Player check-in is gone. Spectators no longer tap their name to "check in" —
  opening the share link (or scanning the QR) shows the live schedule, scores,
  and standings straight away, read-only. This drops the check-in prompt, the
  personalized "you're up" card, the "checked in" badges and count, and the
  check-in API endpoint. Running a session is one less thing for everyone to
  do.

## [0.4.6] - 2026-07-04

Standings lead with point margin, the round preview reads cleaner, and you can
rename players or hand the bye to a specific team.

### Changed
- Standings now show point margin as the big number, colored green or red, so
  you can tell teams apart when everyone is on the same win rate. Win rate
  moves to the record line. Court-weighted formats still lead with court points.
- The top three now get trophy, medal, and award icons instead of plain
  numbers.
- The round preview matchup cards stack the two team names on the left with a
  compact "vs" tag, instead of floating "vs" in the middle of a wide card.

### Added
- Rename a player any time by tapping their name — even after they've played
  (a rename keeps their scores, since it's the same person).
- Hand the bye to a specific team: in the round preview, "Change who sits" lets
  you pick which team sits out (e.g. when a team asks to rest), and the team
  that was sitting steps into the court they vacated.

## [0.4.5] - 2026-07-04

Three setup fixes: pasted team lists always pair, the court count you pick is
respected, and you can edit the roster after a session starts.

### Fixed
- Pasting a roster now detects teams the same way no matter which format is
  selected: a line like "Emily & Gino" (or "Emily and Gino") becomes a team,
  a lone name stays an individual, and commas separate people instead of
  being read as a team joiner. Previously, pasting before choosing "Set
  teams" read every line as one individual.
- The number of courts you choose is no longer silently reduced. Touching the
  court stepper while only a few players were added used to freeze the count
  low, so adding more players later still ran on too few courts; now sitting
  at the maximum stays automatic and grows with the roster, while a
  deliberately lower court count is still respected. Court counts are always
  capped to what the roster can fill, so you never get more courts than
  players to fill them.

### Added
- Edit the roster after starting: organizers get an "Edit players" button on
  the Players tab to fix a name, add a late arrival, or drop a no-show without
  resetting the session. Changes apply to upcoming rounds; games already
  played keep their scores. A player who has already played is marked "In
  play" and can't be removed (their scores are part of everyone's standings).
  The format stays locked once play begins.

## [0.4.4] - 2026-07-04

Cleaner hero. The landing scoreboard no longer clips its "next up" line, and
the busy diagonal color wedges behind it are replaced by a single soft glow,
so the hero reads calmer and more intentional on desktop and mobile.

### Fixed
- The live-scoreboard illustration in the hero had its "Next up" label
  colliding with the sync bar and clipping past the card's bottom edge; the
  scoreboard now has room to breathe and reads "Court 2 · 9–6 · Next: Court 1"
  cleanly.

### Changed
- Replaced the hard-edged teal/peach diagonal gradient bands across the hero
  with one soft glow behind the illustration, keeping the subtle court grid.

## [0.4.3] - 2026-07-04

Plainer words everywhere, and a landing page that shows what it does.

The three "Setup / Join / Score" cards on the landing page were abstract
colored blocks; each now shows a real preview — a share link with player and
court chips, a check-in row with a QR tile, and a posted scoreline with who's
up next. Across the app, insider shorthand is gone: standings say "margin"
and "win rate" instead of "PD" and "Win %", scoring is explained in a sentence
instead of a raw setting name, and a session that can't start now tells you
exactly why and what to do.

### Changed
- Landing "Setup / Join / Score" cards show literal previews of what each step
  produces instead of decorative gradient blocks. Hero copy defines "open
  play" for people new to it.
- Standings drop the "PD" abbreviation for "margin", label metrics as "win
  rate" / "court points", and spell out the tiebreakers in plain English with
  a one-line legend.
- The round summary explains scoring in a sentence ("higher courts are worth
  more — a win on Court 1 earns bonus points") instead of printing the setting.
- Weighted-court badges say "Top court — winner earns 2x points" so the
  multiplier makes sense.
- The live-share note is written for humans ("keeps updating as long as you
  keep this app open and connected") instead of "while this server is running."
- The "MiLP" format is now "Team League" with a plain description; several
  format blurbs reworded to say what happens in everyday words.
- Clearer empty states, status labels, and the odd-player warning now says
  what to fix.

## [0.4.2] - 2026-07-04

Building Set Teams is now tap-to-pair, and it reads your pasted team lists.

Instead of typing partners two at a time, add everyone as individuals (or
paste a list), then tap two players to pair them into a team — tap a team to
break it up. Paste a numbered roster like "1. Emily & Gino" straight from your
notes and it recognizes each line as a team, stripping the numbering and any
stray formatting. The pairing controls appear on both the players step and the
review step, so you can build teams no matter when you pick Set Teams.

### Added
- Tap-to-pair team builder for Set Teams: add a pool of players, tap two to
  form a team, tap a team to split it back apart.
- Paste-a-team-list import: a numbered or bulleted list of "Name & Name" lines
  becomes teams in one step, tolerant of list markers and pasted formatting.

### Changed
- The court stepper is framed in teams for Set Teams play ("Up to 3 courts for
  6 teams, 2 teams per court").

## [0.4.1] - 2026-07-04

Live sessions now survive on a shared store, so spectator links keep working.

Sessions previously lived in the memory of whichever server instance happened
to serve the request, which meant a redeploy or a second serverless instance
could make a shared QR link show "no session found" for guests. Sessions now
live in a shared store with a 24-hour expiry, so every guest device sees the
same session regardless of which instance answers, and abandoned sessions
clean themselves up overnight.

### Changed
- Live sessions are backed by a shared key-value store (Upstash Redis on
  Vercel) instead of per-instance memory. Spectator links stay valid across
  redeploys and scale to any number of viewers. Local development works with
  no setup — it falls back to in-memory storage when no store is configured.

### Fixed
- Only the organizer who created a session can change it. Each session mints a
  private owner token on publish (kept on the host's device, never sent to
  spectators); score and round updates require it, so a guest with the share
  code can no longer overwrite the session.
- Oversized session payloads are rejected instead of being stored.

## [0.4.0] - 2026-07-04

Players now see exactly where to go each round, organizers can undo a
mis-confirmed round, and the round engine got a correctness overhaul verified
by a new simulation suite (`npm run sim`).

Checked-in players get a pinned "You're up" card — court number, partner,
opponents, and a "Moved up / Moved down" badge — instead of scanning the round
list for their name. Court-movement chips (↑ UP / ↓ DOWN) appear on game cards
for seeded formats, and every round now shows who's sitting out as clear
badges, both in the round preview and on the round card.

### Added
- "You're up" card for checked-in players: your court, your partner, your
  opponents, and whether you moved up or down — pinned above the schedule,
  visible in spectator mode. Shows a "you sit out this round" state on byes.
- Court-movement chips on game cards (↑ UP / ↓ DOWN per team) for formats
  that move teams between courts by results, like Team Gauntlet and King of
  the Court.
- Undo round: an accidental "Confirm Round" is no longer final. Undo the
  latest round (with a confirmation dialog that warns when scores would be
  deleted), then redraw fresh matchups.
- Sitting-out badges in the round preview and on every round card, for all
  formats — plus "Everyone plays this round" in the round preview when
  nobody sits.
- Regression simulations (`npm run sim`): deterministic checks that Team
  Gauntlet seeding always matches the standings tab, winners never rank below
  a team they just beat, back-to-back rematches don't happen, and ladder-format
  byes rotate fairly across eight court/player configurations for each of the
  three ladder formats.

### Changed
- The app's typefaces actually load now: Inter for the interface, Newsreader
  for the landing headline. (They were declared but silently falling back to
  system fonts.)
- Reset and undo confirmations are proper in-app dialogs instead of browser
  popups, correctly sized on phones.
- Duplicate-player warnings when adding by DUPR appear inline instead of as a
  browser alert, and clear when you fix the roster.
- Warning text is readable in light mode (was low-contrast yellow).

### Fixed
- Team Gauntlet seeding now matches the standings tab exactly (wins → win % →
  head-to-head → point differential → points scored), so the leaderboard
  predicts next round's courts, apart from bye rotation and rematch-avoidance
  nudges. Beating a team can no longer leave you seeded below them.
- King of the Court, Claim the Throne, and Up & Down the River no longer
  permanently bench players: anyone waiting re-enters at the bottom court in
  fair first-in-first-out order, including sessions with more sitters than one
  court can seat.
- Claim the Throne no longer crashes on single-court sessions.
- The bottom court can't be forced into an immediate rematch of the previous
  round in Team Gauntlet.
- Court counts that exceed what the roster can fill are clamped by the round
  engine itself, so a stale or hand-edited session can't strand players on
  empty courts.
- Rank-change arrows reset after undoing a round instead of comparing against
  deleted scores.

## [0.3.0] - 2026-07-02

Setup is now a guided 3-step wizard, Team Gauntlet joins the format list, and
standings show team rows for set-partner play. The whole app got a mobile pass.

The redesign answers the top piece of user feedback: "too many options, I don't
know where to start." The old setup screen showed 23 controls and a 13-format
chooser before a disabled start button. The new flow asks one question at a
time — who's playing, pick a format, review and start — with the popular
default preselected and everything else behind Advanced.

### Added
- Setup wizard: three full-screen steps (players → format → review) with a
  progress header, one sticky action per screen, and +/− steppers for players
  and courts on the review step.
- Team Gauntlet, a new set-partner format: teams keep their partner, get seeded
  by record each round, and winners draw harder opponents. Requires 8+ players.
- Team standings for all set-partner formats: one row per team ("Ana & Ben,
  2-0, +7 PD") instead of two duplicate player rows, with correct
  wins → point-differential ranking.
- Joining by code is its own screen: arriving via a join link shows just the
  code entry, with a quiet "or start your own session" escape.
- A mistyped spectator code now offers "Try a different code" instead of a
  dead-end error.

### Changed
- The landing page leads with Create/Join in the first phone viewport; the
  decorative court graphic moved below and the header gained a Join button on
  mobile.
- "Go live" appears in the header only when there is a session to share.
- Session reset is reachable on phones (icon button, 44px target).
- Format copy unified: "Rotating partners" / "Set teams" everywhere, and the
  default format badge reads "Most popular."

### Fixed
- Tap targets across the app now meet the 44px minimum on touch devices:
  dialog/sheet close buttons, player-remove buttons, share controls, DUPR
  search toggles, and small button sizes.
- The DUPR login dialog no longer renders edge-to-edge or taller than short
  phones; its close button stays pinned while content scrolls.
- Score entry: the "Tap to enter" hint now shows on the touch devices it
  describes, and multi-game score rows no longer cramp at 375px.
- Format settings grids stack on narrow screens; checkboxes are finger-sized.
- Restoring a saved session with a format this app version doesn't recognize
  falls back safely instead of white-screening (covers both live-session
  snapshots and localStorage).
- Resetting a tournament fully clears setup state, so a smaller new roster is
  no longer blocked by the old session's player count.
- Court assignment when courts are scarce now favors the standings so a
  winning team is never benched by roster order.
- Tied or incomplete scores no longer silently credit one team a win in Team
  Gauntlet seeding.

## [0.2.0] - 2026-07-01

Landing page redesign pass, SEO foundations, and a felt score-save moment in the app.

### Added
- Search foundations: `sitemap.xml`, `robots.txt`, and `SoftwareApplication` JSON-LD on the homepage for rich-result eligibility.
- A score-save result beat: entering a score now confirms with a live-green check, the winner highlighted, the final score rolling into place, and copy that points to the next game, before the dialog dismisses itself.

### Changed
- Hero collapsed to a single action surface (was two competing Create/Join pairs).
- On mobile, the live product demo now appears above the fold.
- Section headlines rewritten so each makes a distinct promise; the two duplicate proof sections merged into one.
- Keyword-forward page title and description targeting open-play / round-robin intent.
- Heading scale normalized and off-scale font weights collapsed; brand shadow tint tokenized.

### Fixed
- Landing content is now server-rendered and visible without JavaScript (was gated behind scroll animations).
- 44px touch targets across the header and theme toggle.
- Scoreboard live-panel text now meets WCAG AA contrast.
- Product-showcase breakpoint aligned to the standard 1024px.

### Removed
- Four unused root components (stale duplicates of the shipping `src/` versions).
