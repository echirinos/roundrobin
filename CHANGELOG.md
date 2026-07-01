# Changelog

All notable changes to PlaySync are documented here. This project follows
[Keep a Changelog](https://keepachangelog.com/) and Semantic Versioning.

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
