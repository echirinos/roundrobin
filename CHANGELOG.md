# Changelog

All notable changes to PlaySync are documented here. This project follows
[Keep a Changelog](https://keepachangelog.com/) and Semantic Versioning.

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
