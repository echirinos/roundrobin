"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  IconArrowRight,
  IconCheck,
  IconLink,
  IconPhone,
  IconQr,
  IconQuietChat,
  IconRoster,
  IconRotate,
  IconScan,
  IconSpark,
  IconTrophy,
} from "@/components/brand/icons";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://playsync.fun";

const softwareAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "PlaySync",
  applicationCategory: "SportsApplication",
  operatingSystem: "Web",
  url: siteUrl,
  description:
    "Run pickleball open play and round robins from one shared link. Players scan a QR to follow live scores and standings, the next game posts itself, and partner rotations update on their own. No app install.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Live open play sessions",
    "QR code live scoreboard",
    "Round robin and rotating partners",
    "Automatic next game and standings",
  ],
};

const composerChips = ["QR ready", "Live scores", "Next game posted"];

const sessionRows = [
  {
    label: "Court 1",
    primary: "Ana / Ben",
    secondary: "Cara / Diego",
    status: "Playing",
    score: "8-6",
  },
  {
    label: "Court 2",
    primary: "Eli / Fran",
    secondary: "Gia / Hugo",
    status: "Next",
    score: "0-0",
  },
  {
    label: "Sitting",
    primary: "Ivy",
    secondary: "Back in round 3",
    status: "Bye",
    score: "-",
  },
];

const proofPoints = [
  "No sign-up required to start",
  "QR scoreboard anyone can follow",
  "Scores update the next game",
  "Rotating or set-team sessions",
];

const laneEvents = [
  "QR shared",
  "Players watching",
  "Score posted",
  "Next game ready",
];

const productProof = [
  {
    kind: "setup" as const,
    label: "Setup",
    title: "Start in 30 seconds",
    text: "Add players, set your courts, and share one live link before warmups end.",
    metric: "0:30",
  },
  {
    kind: "join" as const,
    label: "Follow",
    title: "Everyone follows live",
    text: "Players scan the QR to watch live scores, standings, and who’s up next — no sign-up.",
    metric: "QR",
  },
  {
    kind: "score" as const,
    label: "Score",
    title: "The next game posts itself",
    text: "One score tap updates standings, frees the court, and calls who is up next.",
    metric: "9-6",
  },
];

const surfaceProof = [
  {
    icon: IconScan,
    label: "QR scoreboard",
    value: "Everyone sees live scores",
  },
  {
    icon: IconQuietChat,
    label: "Fewer texts",
    value: "One feed for the group",
  },
  {
    icon: IconPhone,
    label: "Phone browser",
    value: "Big taps, no install",
  },
];

// The hero scorebug is a working demo, not a picture: tap a team to score,
// the game closes out at 11, and the ticker calls the next matchup — the
// product's whole promise in one interaction. It also plays itself slowly so
// non-tappers still see it live (pausing while a visitor is playing with it).
const demoMatchups = [
  { court: "Court 2", teams: ["Ana / Ben", "Cara / Diego"], next: "Eli/Fran vs Gia/Hugo", nextCourt: "Court 3" },
  { court: "Court 3", teams: ["Eli / Fran", "Gia / Hugo"], next: "Ivy/Noah vs Ana/Ben", nextCourt: "Court 1" },
  { court: "Court 1", teams: ["Ivy / Noah", "Ana / Ben"], next: "Cara/Diego vs Eli/Fran", nextCourt: "Court 2" },
] as const;

// Deterministic rally pattern — Math.random would mismatch on hydration.
const demoPointPattern = [0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0] as const;

// When a featured session code is configured (e.g. the weekly house open
// play), the hero scorebug shows the real thing — genuinely live scores on
// the homepage — and tapping it opens the session. Demo mode is the fallback
// whenever nothing is live.
const FEATURED_SESSION_CODE = process.env.NEXT_PUBLIC_FEATURED_SESSION_CODE ?? "";

type FeaturedGame = {
  sessionName: string;
  court: string;
  teams: [string, string];
  score: [number, number];
  code: string;
};

function firstNames(team: Array<{ name: string }>): string {
  return team.map((player) => player.name.split(" ")[0]).join(" / ");
}

function useFeaturedSession(): FeaturedGame | null {
  const [featured, setFeatured] = useState<FeaturedGame | null>(null);

  useEffect(() => {
    if (!FEATURED_SESSION_CODE) return;

    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/sessions/${FEATURED_SESSION_CODE}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("not live");
        const record = (await response.json()) as {
          code: string;
          snapshot: {
            name: string;
            currentRound: number;
            games: Array<{
              round: number;
              courtNumber: number;
              completed: boolean;
              team1: Array<{ name: string }>;
              team2: Array<{ name: string }>;
              team1Score?: number;
              team2Score?: number;
            }>;
          };
        };
        const liveGame = record.snapshot.games.find(
          (game) => game.round === record.snapshot.currentRound && !game.completed,
        );
        if (cancelled) return;
        if (!liveGame) {
          setFeatured(null);
          return;
        }
        setFeatured({
          sessionName: record.snapshot.name,
          court: `Court ${liveGame.courtNumber}`,
          teams: [firstNames(liveGame.team1), firstNames(liveGame.team2)],
          score: [liveGame.team1Score ?? 0, liveGame.team2Score ?? 0],
          code: record.code,
        });
      } catch {
        if (!cancelled) setFeatured(null);
      }
    }

    void load();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return featured;
}

function ScoreDigits({ value }: { value: number }) {
  const reduceMotion = useReducedMotion();

  return (
    <span className="relative inline-flex h-[1.1em] items-baseline overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={reduceMotion ? false : { transform: "translateY(0.9em)", opacity: 0 }}
          animate={{ transform: "translateY(0em)", opacity: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { transform: "translateY(-0.9em)", opacity: 0 }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}


// The court is part of the broadcast frame, not a separate illustration:
// a flat, honest top-down diagram (real pickleball proportions — kitchen,
// service boxes, center line) whose ball answers the scorebug. Score a
// point and the rally ends on the other side with an impact ring.
function CourtDiagram({ pulse }: { pulse: { side: 0 | 1; count: number } }) {
  const reduceMotion = useReducedMotion();
  // Landing spots inside each service box (left court / right court).
  const landing = pulse.side === 0 ? { x: 320, y: 74 } : { x: 120, y: 126 };

  return (
    <div className="bframe-court-wrap" aria-hidden="true">
      <svg viewBox="0 0 440 200" fill="none" className="h-auto w-full">
        {/* surface + boundary */}
        <rect x="8" y="8" width="424" height="184" rx="10" className="bframe-surface" />
        <rect x="28" y="24" width="384" height="152" rx="4" className="bframe-line-strong" />
        {/* kitchen (non-volley zone) spans net ± 7ft of a 44ft court */}
        <rect x="159" y="24" width="61" height="152" className="bframe-kitchen" />
        <rect x="220" y="24" width="61" height="152" className="bframe-kitchen" />
        <path d="M159 24V176M281 24V176" className="bframe-line" />
        {/* center lines split the service courts */}
        <path d="M28 100H159M281 100H420M412 24V176" className="bframe-line" />
        {/* net */}
        <path d="M220 16V184" className="bframe-net" />
        {/* rally ball + impact ring, keyed to the scorebug */}
        {!reduceMotion && (
          <AnimatePresence>
            <motion.circle
              key={`ring-${pulse.count}`}
              cx={landing.x}
              cy={landing.y}
              className="bframe-ring"
              initial={{ r: 5, opacity: 0.55 }}
              animate={{ r: 26, opacity: 0 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
          </AnimatePresence>
        )}
        <motion.circle
          r="7"
          className="bframe-ball"
          initial={false}
          animate={reduceMotion ? { cx: 220, cy: 100 } : { cx: landing.x, cy: landing.y }}
          transition={{ type: "spring", duration: 0.7, bounce: 0.18 }}
        />
      </svg>
    </div>
  );
}

function PlayableScorebug() {
  const [matchIndex, setMatchIndex] = useState(0);
  const [score, setScore] = useState<[number, number]>([6, 4]);
  const [finalFlash, setFinalFlash] = useState(false);
  const [pulse, setPulse] = useState<{ side: 0 | 1; count: number }>({ side: 0, count: 0 });
  const tickRef = useRef(0);
  const lastTouchRef = useRef(0);
  const featured = useFeaturedSession();
  const match = demoMatchups[matchIndex % demoMatchups.length];
  const isReal = featured !== null;
  const displayCourt = isReal ? featured.court : match.court;
  const displayTeams = isReal ? featured.teams : match.teams;
  const displayScore: [number, number] = isReal ? featured.score : score;

  const addPoint = useCallback((side: 0 | 1, fromUser: boolean) => {
    if (fromUser) lastTouchRef.current = Date.now();
    setPulse((current) => ({ side, count: current.count + 1 }));
    setFinalFlash((flashing) => {
      if (flashing) return flashing;
      setScore((current) => {
        const next: [number, number] =
          side === 0 ? [current[0] + 1, current[1]] : [current[0], current[1] + 1];
        if (Math.max(next[0], next[1]) >= 11) {
          setFinalFlash(true);
          window.setTimeout(() => {
            setMatchIndex((index) => index + 1);
            setScore([0, 0]);
            setFinalFlash(false);
          }, 1400);
        }
        return next;
      });
      return flashing;
    });
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      if (Date.now() - lastTouchRef.current < 9000) return;
      const side = demoPointPattern[tickRef.current++ % demoPointPattern.length] as 0 | 1;
      addPoint(side, false);
    }, 4200);
    return () => window.clearInterval(interval);
  }, [addPoint]);

  const leadingSide =
    displayScore[0] === displayScore[1] ? -1 : displayScore[0] > displayScore[1] ? 0 : 1;

  return (
    <div className="relative z-10 w-full">
      <div className="scorebug-shell overflow-hidden rounded-2xl border border-white/15 bg-primary shadow-lg">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
          <span className="truncate font-data text-[11px] uppercase tracking-[0.18em] text-live-foreground/90">
            {isReal ? `${displayCourt} · ${featured.sessionName}` : displayCourt}
          </span>
          <span className="inline-flex items-center gap-1.5 font-data text-[11px] uppercase tracking-[0.18em] text-live">
            <span className="size-1.5 rounded-full bg-live" aria-hidden="true" />
            Live
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto_auto]">
          <div className="flex flex-col">
            {displayTeams.map((team, side) => (
              <motion.button
                key={team}
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() =>
                  isReal
                    ? window.location.assign(`/tournament?code=${featured.code}`)
                    : addPoint(side as 0 | 1, true)
                }
                aria-label={
                  isReal
                    ? `Watch ${featured.sessionName} live`
                    : `Add a point for ${team} (demo scoreboard)`
                }
                className={cn(
                  "flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors",
                  side === 0 ? "border-b border-white/10" : "",
                  leadingSide === side ? "bg-white/[0.06]" : "hover:bg-white/[0.04]",
                )}
              >
                <span className="text-sm font-semibold uppercase tracking-wide text-primary-foreground">
                  {team}
                </span>
                <span
                  className={cn(
                    "font-data text-4xl font-bold leading-none sm:text-5xl",
                    leadingSide === side ? "text-live" : "text-primary-foreground/80",
                  )}
                >
                  <ScoreDigits value={displayScore[side]} />
                </span>
              </motion.button>
            ))}
          </div>
          <div aria-hidden="true" />
          <div className="flex w-20 flex-col items-center justify-center border-l border-white/10 px-3 text-center">
            {finalFlash ? (
              <span className="font-data text-sm font-bold uppercase tracking-[0.14em] text-live">
                Final
              </span>
            ) : (
              <span className="font-data text-[11px] font-semibold uppercase leading-4 tracking-[0.14em] text-primary-foreground/70">
                Game
                <br />
                to
                <br />
                <span className="text-lg text-primary-foreground">11</span>
              </span>
            )}
          </div>
        </div>

        <CourtDiagram pulse={pulse} />

        <div className="h-9 overflow-hidden border-t border-white/10">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={matchIndex}
            initial={{ transform: "translateY(100%)" }}
            animate={{ transform: "translateY(0%)" }}
            exit={{ transform: "translateY(-100%)" }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex h-full items-center gap-2 bg-live px-4 font-data text-[11px] font-semibold uppercase tracking-[0.14em] text-live-foreground"
          >
            <span aria-hidden="true">▸</span>
            {isReal ? (
              <>
                <span className="truncate">Live now — tap to watch</span>
                <span className="ml-auto shrink-0">{featured.code}</span>
              </>
            ) : (
              <>
                <span className="truncate">Next · {match.next}</span>
                <span className="ml-auto shrink-0">{match.nextCourt}</span>
              </>
            )}
          </motion.div>
        </AnimatePresence>
        </div>
      </div>

      <p className="mt-2 text-center text-xs text-muted-foreground">
        {isReal ? "A real session, live right now — tap to watch." : "Live demo — tap a team to score."}
      </p>
    </div>
  );
}

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    // Full `transform` strings stay hardware-accelerated (framer-motion's
    // x/y shorthands run on the main thread and drop frames during page
    // load), and entrances pair the rise with opacity — nothing should slide
    // while fully visible.
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, transform: "translateY(14px)" }}
      whileInView={reduceMotion ? undefined : { opacity: 1, transform: "translateY(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function MotionRail() {
  const reduceMotion = useReducedMotion();

  // One choreographed beat, not scattered reveals: the four events of a real
  // session light up in order as the rail scrolls in — the night, replayed.
  return (
    <motion.div
      className="motion-rail"
      aria-label="Live session progress"
      initial={reduceMotion ? undefined : "idle"}
      whileInView={reduceMotion ? undefined : "active"}
      viewport={{ once: true, margin: "-100px" }}
      variants={{
        idle: {},
        active: { transition: { staggerChildren: 0.55, delayChildren: 0.2 } },
      }}
    >
      {laneEvents.map((event, index) => (
        <motion.div
          key={event}
          className="motion-rail-step"
          variants={{
            idle: { opacity: 0.3, transform: "translateY(6px)" },
            active: {
              opacity: 1,
              transform: "translateY(0px)",
              transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
            },
          }}
        >
          <span className="motion-rail-index">0{index + 1}</span>
          <span>{event}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}

function ProductProofVisual({ kind }: { kind: "setup" | "join" | "score" }) {
  if (kind === "setup") {
    return (
      <div className="pp-visual" aria-hidden="true">
        <div className="pp-link">
          <IconLink className="size-3.5 text-live" />
          <span className="pp-link-url">playsync.fun/live</span>
          <span className="pp-link-copy">Ready</span>
        </div>
        <div className="pp-chips">
          <span>9 players</span>
          <span>2 courts</span>
        </div>
      </div>
    );
  }

  if (kind === "join") {
    return (
      <div className="pp-visual pp-visual-join" aria-hidden="true">
        <div className="pp-avatars">
          {["A", "B", "C"].map((initial) => (
            <span key={initial} className="pp-avatar">
              {initial}
              <IconCheck className="pp-avatar-check size-3" />
            </span>
          ))}
          <span className="pp-avatar pp-avatar-more">+6</span>
        </div>
        <div className="pp-qr">
          <IconQr className="size-6" />
        </div>
      </div>
    );
  }

  return (
    <div className="pp-visual pp-visual-score" aria-hidden="true">
      <div className="pp-scoreline">
        <span className="pp-court">Court 1</span>
        <span className="pp-score">9&ndash;6</span>
        <span className="pp-final">
          <IconTrophy className="size-3" />
          Final
        </span>
      </div>
      <div className="pp-next">
        <IconArrowRight className="size-3.5 text-live" />
        Next up: Ellie &amp; Sam on Court 1
      </div>
    </div>
  );
}

function ProductProofGrid() {
  return (
    <div className="product-proof-grid">
      {productProof.map((item, index) => (
        <Reveal key={item.title} delay={index * 0.05}>
          <div className="product-proof-card">
            <div className="product-proof-topline">
              <span>{item.label}</span>
              <span className="product-proof-metric">{item.metric}</span>
            </div>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
            <ProductProofVisual kind={item.kind} />
          </div>
        </Reveal>
      ))}
    </div>
  );
}

function SessionComposer() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { y: 16 }}
      animate={reduceMotion ? undefined : { y: 0 }}
      transition={{ duration: 0.46, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
      className="session-composer relative mx-auto w-full max-w-3xl overflow-hidden"
    >
      <div className="composer-sync-line" aria-hidden="true" />
      <div className="flex items-start gap-3 border-b border-border px-4 py-4 sm:px-5">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-foreground text-background">
          <IconRoster className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-lg leading-7 text-foreground sm:text-xl">
              Create tonight&apos;s live session in 30 seconds.
            </p>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
              <IconSpark className="size-3 text-live" />
              Courtside live
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {composerChips.map((chip) => (
              <span key={chip} className="composer-chip">
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-3 sm:grid-cols-[1fr_auto] sm:p-4">
        <div className="grid grid-cols-3 overflow-hidden rounded-md border border-border bg-background">
          {[
            ["Players", "9"],
            ["Courts", "2"],
            ["Mode", "Rotate"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="border-r border-border px-3 py-3 last:border-r-0"
            >
              <p className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="order-first flex flex-col gap-2 sm:order-none sm:min-w-44">
          <Button asChild size="lg" className="h-12 rounded-md text-base">
            <Link
              href="/tournament?new=1&mode=rotating"
              data-testid="hero-create-session"
              data-analytics-event="create_session_clicked"
              data-analytics-location="hero_composer"
              data-analytics-mode="rotating"
            >
              Create live session
              <IconArrowRight className="size-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-12 rounded-md bg-background text-base"
          >
            <Link
              href="/tournament?join=1"
              data-testid="hero-join-code"
              data-analytics-event="join_code_clicked"
              data-analytics-location="hero_composer"
            >
              Join with code
            </Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function HeroAssurance() {
  return (
    <p className="hero-action-note mt-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <IconPhone className="size-3.5 text-live" />
      Works from any phone browser, no install
    </p>
  );
}

function LiveBoardPreview({ className }: { className?: string }) {
  return (
    <div className={cn("product-showcase", className)}>
      <div className="phone-device" aria-label="Mobile live session preview">
        <div className="phone-screen">
          <div className="phone-status-row">
            <span>7:12</span>
            <span className="phone-status-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </div>

          <div className="phone-app-top">
            <div>
              <p>Riverside Open Play</p>
              <span>9 players · 2 courts</span>
            </div>
            <span className="phone-live-pill">Live</span>
          </div>

          <div className="phone-next-card">
            <div className="phone-next-head">
              <div>
                <p>Now scoring</p>
                <h3>Court 2</h3>
              </div>
              <div className="phone-score-stack" aria-label="Score 9 to 6">
                <span>9</span>
                <span>6</span>
              </div>
            </div>
            <div className="phone-matchup">
              <span>Ana / Ben</span>
              <span>Cara / Diego</span>
            </div>
            <div className="phone-score-button" aria-hidden="true">
              Post score and call next
              <IconArrowRight className="size-3.5" />
            </div>
          </div>

          <div className="phone-qr-card">
            <div className="phone-qr" aria-hidden="true">
              {Array.from({ length: 16 }).map((_, index) => (
                <span key={index} />
              ))}
            </div>
            <div>
              <p>Join code</p>
              <strong>P7K4Q9</strong>
              <span>Scan at the fence</span>
            </div>
          </div>

          <div className="phone-feed-list">
            {["Court 2 finished 11-7", "Court 1 needs a score", "Eli / Fran up next"].map(
              (item) => (
                <div key={item} className="phone-feed-row">
                  <span />
                  <p>{item}</p>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      <div className="product-feed-panel">
        <div className="product-feed-header">
          <p className="section-kicker">Live product proof</p>
          <h3>One link becomes the scoreboard, lineup, and group feed.</h3>
        </div>

        <div className="surface-proof-grid">
          {surfaceProof.map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.label} className="surface-proof-card">
                <Icon className="size-4" />
                <div>
                  <p>{item.label}</p>
                  <span>{item.value}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="live-board compact-live-board">
          <div className="divide-y divide-border">
            {sessionRows.map((row) => (
              <div
                key={row.label}
                className="live-board-row grid grid-cols-[0.72fr_1fr_auto] gap-3 px-4 py-3 sm:px-5"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{row.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{row.status}</p>
                </div>
                <div>
                  <p className="text-sm text-foreground">{row.primary}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{row.secondary}</p>
                </div>
                <p className="h-fit rounded-md border border-border px-2.5 py-1 text-sm font-semibold text-foreground">
                  {row.score}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }}
      />
      <Header />

      <main className="yc-landing">
        <section className="yc-hero overflow-hidden border-b border-border/80">
          <div className="container mx-auto flex max-w-[88rem] flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid lg:grid-cols-[minmax(0,0.52fr)_minmax(31rem,0.48fr)] lg:items-center lg:px-8 lg:py-16 xl:py-20">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, transform: "translateY(16px)" }}
              animate={reduceMotion ? undefined : { opacity: 1, transform: "translateY(0px)" }}
              transition={{ duration: 0.46, ease: [0.22, 1, 0.36, 1] }}
              className="hero-copy-stack order-1 max-w-3xl lg:col-start-1 lg:row-start-1"
            >
              <p className="hero-eyebrow">
                Casual drop-in pickleball, one shared link
              </p>
              <h1 className="hero-headline mt-5 max-w-4xl text-balance font-serif-editorial text-5xl font-medium leading-[0.94] tracking-[-0.012em] text-foreground sm:text-7xl lg:text-[5.6rem] xl:text-[6.1rem]">
                Play more. Organize less<span className="text-live">.</span>
              </h1>
              <p className="hero-subcopy mt-5 max-w-2xl text-balance text-lg leading-8 text-muted-foreground">
                Open play is casual pickleball where people show up and rotate
                through games. Run the whole night from one link: players scan a
                QR to join, you tap scores, and the next game posts itself.
              </p>
              <HeroAssurance />
            </motion.div>

            {/* Mobile is the primary device: the broadcast scorebug is the
                poster moment — playable, with the court running underneath. */}
            <div className="order-2 relative mx-auto w-full max-w-md sm:max-w-xl lg:order-none lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mx-0 lg:max-w-none lg:self-center">
              <PlayableScorebug />
            </div>

            <div className="order-3 lg:order-none lg:col-start-1 lg:row-start-2">
              <SessionComposer />

              <div className="proof-strip mt-5 flex max-w-3xl flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                {proofPoints.map((point) => (
                  <span key={point} className="inline-flex items-center gap-2">
                    <IconCheck className="size-3.5 text-live" />
                    {point}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="section-soft border-b border-border">
          <div className="container mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
            <Reveal>
              <MotionRail />
            </Reveal>
            <div className="mt-8 grid gap-8 lg:grid-cols-[0.34fr_0.66fr] lg:items-start">
              <Reveal>
                <p className="section-kicker">Courtside flow</p>
                <h2 className="mt-3 max-w-md font-serif-editorial text-4xl font-medium tracking-[-0.008em] text-foreground sm:text-5xl">
                  Built for the first five minutes at the fence.
                </h2>
                <p className="mt-4 max-w-md text-base leading-7 text-muted-foreground">
                  Create the session, let players check themselves in, tap a
                  score, and the next game posts on its own.
                </p>
              </Reveal>
              <ProductProofGrid />
            </div>
          </div>
        </section>

        <section className="section-clean border-b border-border">
          <div className="container mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[0.42fr_0.58fr] lg:items-center">
            <Reveal>
              <p className="section-kicker">The shared feed</p>
              <h2 className="mt-3 font-serif-editorial text-4xl font-medium tracking-[-0.008em] text-foreground sm:text-6xl">
                No app to download. Everyone opens the same link.
              </h2>
              <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
                Players see a live mobile feed, organizers keep court calls in
                one place, and every score moves the night forward.
              </p>
            </Reveal>

            <Reveal delay={0.06}>
              <LiveBoardPreview />
            </Reveal>
          </div>
        </section>

        <section id="features" className="section-tint border-b border-border">
          <div className="container mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[0.58fr_0.42fr] lg:items-center">
            <Reveal>
              <div className="editorial-panel">
                <div className="flex items-center justify-between gap-4 border-b border-border p-4 sm:p-5">
                  <div>
                    <p className="text-sm text-muted-foreground">Setup</p>
                    <p className="mt-1 text-xl font-semibold tracking-normal">
                      Tonight open play
                    </p>
                  </div>
                  <IconRotate className="size-5 text-muted-foreground" />
                </div>
                <div className="grid grid-cols-3 divide-x divide-border">
                  {[
                    ["People", "9"],
                    ["Courts", "2"],
                    ["Mode", "Rotate"],
                  ].map(([label, value]) => (
                    <div key={label} className="p-3 sm:p-5">
                      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                        {label}
                      </p>
                      <p className="mt-3 font-data text-2xl font-semibold sm:text-3xl">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.06}>
              <p className="section-kicker">Less running the show</p>
              <h2 className="mt-3 font-serif-editorial text-4xl font-medium tracking-[-0.008em] text-foreground sm:text-6xl">
                The organizer gets to play instead of becoming the scoreboard.
              </h2>
              <p className="mt-5 text-base leading-7 text-muted-foreground">
                Players check the feed themselves. The organizer only answers
                the next real question: score in, next game, or who sits.
              </p>
            </Reveal>
          </div>
        </section>

        <section className="section-cta border-b border-border">
          <div className="container mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
            <Reveal className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                {/* No kicker here — after four labeled sections, the closing
                    line lands harder standing alone. */}
                <h2 className="max-w-3xl font-serif-editorial text-4xl font-medium tracking-[-0.008em] text-foreground sm:text-6xl">
                  Start a session before warmups are over.
                </h2>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 rounded-md text-base">
                  <Link
                    href="/tournament?new=1&mode=rotating"
                    data-testid="final-create-session"
                    data-analytics-event="create_session_clicked"
                    data-analytics-location="final_cta"
                    data-analytics-mode="rotating"
                  >
                    Start session
                    <IconArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-md bg-background text-base"
                >
                  <Link
                    href="/tournament?join=1"
                    data-testid="final-join-code"
                    data-analytics-event="join_code_clicked"
                    data-analytics-location="final_cta"
                  >
                    Join with code
                  </Link>
                </Button>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
