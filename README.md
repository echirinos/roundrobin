# PlaySync

Phone-first pickleball open-play sessions with live court assignments, QR
check-in, scores, and shareable session links.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Analytics

The app includes two analytics layers:

- Vercel Web Analytics for visits, pages, referrers, countries, devices, and
  custom CTA events.
- Vercel Speed Insights for real-user Core Web Vitals.
- Optional PostHog for anonymous product funnels, such as create-session clicks,
  join-code intent, live-session publish clicks, share actions, and first-round
  generation.

Set these in Vercel Project Settings -> Environment Variables:

```bash
NEXT_PUBLIC_SITE_URL=https://playsync.app
NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS=1
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=phc_your_project_token
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

Vercel Analytics and Speed Insights are enabled automatically on Vercel through
the `VERCEL=1` environment. `NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS=1` is only
needed if you want to force those scripts in another hosted environment.

`NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` is optional. If it is missing, PostHog does
not initialize and the app still runs normally with Vercel Analytics. The app
also accepts `NEXT_PUBLIC_POSTHOG_KEY` as an alias.

No player names, session codes, or scores are sent through the explicit client
analytics events. Server logs include aggregate live-session counts and format
metadata for operational visibility.

## Production Check

```bash
npm run lint
npm run build
npm run sim
```

`npm run sim` runs the deterministic round-engine regression simulations
(`scripts/sim-gauntlet.ts` and `scripts/sim-ladder-byes.ts` via the pinned
`tsx` dev dependency): Team Gauntlet seeding stays in lockstep with the
standings tab, winners never rank below a team they just beat, back-to-back
rematches don't happen, and ladder-format byes rotate fairly. It exits
non-zero on any failed assertion, so it is CI-ready as-is.

## Project Docs

Release notes live in [CHANGELOG.md](CHANGELOG.md). Planned work and known
gaps are tracked in [TODOS.md](TODOS.md).
