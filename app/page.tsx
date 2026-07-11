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
  { court: "Court 2", teams: ["Ana / Ben", "Cara / Diego"], next: "Eli / Fran vs Gia / Hugo", nextCourt: "Court 3" },
  { court: "Court 3", teams: ["Eli / Fran", "Gia / Hugo"], next: "Ivy / Noah vs Ana / Ben", nextCourt: "Court 1" },
  { court: "Court 1", teams: ["Ivy / Noah", "Ana / Ben"], next: "Cara / Diego vs Eli / Fran", nextCourt: "Court 2" },
] as const;

// Deterministic rally pattern — Math.random would mismatch on hydration.
const demoPointPattern = [0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0] as const;

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

function PlayableScorebug() {
  const [matchIndex, setMatchIndex] = useState(0);
  const [score, setScore] = useState<[number, number]>([6, 4]);
  const [finalFlash, setFinalFlash] = useState(false);
  const tickRef = useRef(0);
  const lastTouchRef = useRef(0);
  const match = demoMatchups[matchIndex % demoMatchups.length];

  const addPoint = useCallback((side: 0 | 1, fromUser: boolean) => {
    if (fromUser) lastTouchRef.current = Date.now();
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

  const leadingSide = score[0] === score[1] ? -1 : score[0] > score[1] ? 0 : 1;

  return (
    <div className="relative z-10 w-full">
      <div className="scorebug-shell overflow-hidden rounded-2xl border border-white/15 bg-primary shadow-lg">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
          <span className="font-data text-[11px] uppercase tracking-[0.18em] text-live-foreground/90">
            {match.court}
          </span>
          <span className="inline-flex items-center gap-1.5 font-data text-[11px] uppercase tracking-[0.18em] text-live">
            <span className="size-1.5 rounded-full bg-live" aria-hidden="true" />
            Live
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto_auto]">
          <div className="flex flex-col">
            {match.teams.map((team, side) => (
              <motion.button
                key={team}
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => addPoint(side as 0 | 1, true)}
                aria-label={`Add a point for ${team} (demo scoreboard)`}
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
                  <ScoreDigits value={score[side]} />
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
      </div>

      <div className="mt-2 overflow-hidden rounded-lg">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={matchIndex}
            initial={{ transform: "translateY(100%)" }}
            animate={{ transform: "translateY(0%)" }}
            exit={{ transform: "translateY(-100%)" }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-2 bg-live px-4 py-2 font-data text-[11px] font-semibold uppercase tracking-[0.14em] text-live-foreground"
          >
            <span aria-hidden="true">▸</span>
            <span className="truncate">Next up · {match.next}</span>
            <span className="ml-auto shrink-0">{match.nextCourt}</span>
          </motion.div>
        </AnimatePresence>
      </div>

      <p className="mt-2 text-center text-xs text-muted-foreground">
        Live demo — tap a team to score. At 11, the next game calls itself.
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

function CourtLanes() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, transform: "translateX(18px)" }}
      animate={reduceMotion ? undefined : { opacity: 1, transform: "translateX(0px)" }}
      transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1], delay: 0.14 }}
      className="court-lanes"
      aria-hidden="true"
    >
      <svg viewBox="40 76 488 368" fill="none" className="court-lanes-svg">
        <g className="pickleball-court">
          <rect
            x="52"
            y="88"
            width="456"
            height="344"
            rx="18"
            className="court-surface"
          />
          <rect
            x="76"
            y="116"
            width="408"
            height="288"
            rx="10"
            className="court-boundary"
          />
          <path d="M280 116V404" className="court-net" />
          <path d="M216 116V404M344 116V404" className="court-kitchen" />
          <path d="M76 260H216M344 260H484" className="court-service-line" />
          <path d="M76 116H484M76 404H484M76 116V404M484 116V404" className="court-edge-line" />
          <path d="M280 116V404" className="court-net-dashes" />
        </g>

        <motion.circle
          cx="134"
          cy="312"
          r="10"
          className="court-impact-ring"
          animate={reduceMotion ? undefined : { r: [8, 34, 8], opacity: [0, 0.42, 0] }}
          transition={
            reduceMotion
              ? undefined
              : { duration: 1.9, ease: "easeOut", repeat: Infinity, repeatDelay: 1.9 }
          }
        />
        <motion.circle
          cx="462"
          cy="206"
          r="10"
          className="court-impact-ring court-impact-ring-alt"
          animate={reduceMotion ? undefined : { r: [8, 34, 8], opacity: [0, 0.36, 0] }}
          transition={
            reduceMotion
              ? undefined
              : { duration: 1.9, ease: "easeOut", repeat: Infinity, repeatDelay: 1.9, delay: 0.95 }
          }
        />

        <motion.path
          d="M104 312C158 196 230 180 280 255C331 331 408 324 462 206"
          className="court-rally-arc"
          pathLength={1}
          initial={reduceMotion ? false : { pathLength: 0.35, opacity: 0.45 }}
          animate={
            reduceMotion
              ? undefined
              : { pathLength: [0.35, 1, 0.35], opacity: [0.36, 0.78, 0.36] }
          }
          transition={
            reduceMotion
              ? undefined
              : { duration: 3.8, ease: "easeInOut", repeat: Infinity }
          }
        />
        <motion.path
          d="M98 320C159 204 230 182 280 256C329 330 408 322 466 198"
          className="court-rally-trail"
          pathLength={1}
          initial={reduceMotion ? false : { pathLength: 0.2, opacity: 0 }}
          animate={
            reduceMotion
              ? undefined
              : { pathLength: [0.18, 0.72, 0.18], opacity: [0, 0.32, 0] }
          }
          transition={
            reduceMotion
              ? undefined
              : { duration: 3.8, ease: "easeInOut", repeat: Infinity }
          }
        />
        <motion.circle
          r="14"
          className="court-ball-glow"
          initial={{ cx: 104, cy: 312 }}
          animate={
            reduceMotion
              ? undefined
              : {
                  cx: [104, 166, 230, 280, 342, 408, 462, 408, 342, 280, 230, 166, 104],
                  cy: [312, 218, 198, 255, 326, 314, 206, 314, 326, 255, 198, 218, 312],
                  opacity: [0.12, 0.28, 0.12],
                }
          }
          transition={
            reduceMotion
              ? undefined
              : { duration: 3.8, ease: "easeInOut", repeat: Infinity }
          }
        />
        <motion.circle
          r="9"
          className="court-rally-ball"
          initial={{ cx: 104, cy: 312 }}
          animate={
            reduceMotion
              ? undefined
              : {
                  cx: [104, 166, 230, 280, 342, 408, 462, 408, 342, 280, 230, 166, 104],
                  cy: [312, 218, 198, 255, 326, 314, 206, 314, 326, 255, 198, 218, 312],
                }
          }
          transition={
            reduceMotion
              ? undefined
              : { duration: 3.8, ease: "easeInOut", repeat: Infinity }
          }
        />
      </svg>
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
        active: { transition: { staggerChildren: 0.42, delayChildren: 0.15 } },
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
              transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] },
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
          <span className="pp-link-copy">Copy</span>
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
            ["Mode", "Open play"],
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
                Casual drop-in pickleball, one shared link
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
              <div className="-mt-4 opacity-90">
                <CourtLanes />
              </div>
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
          <div className="container mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[0.42fr_0.58fr] lg:items-start">
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
                <div className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                  {[
                    ["People", "9"],
                    ["Courts", "2"],
                    ["Mode", "Rotate"],
                  ].map(([label, value]) => (
                    <div key={label} className="p-4 sm:p-5">
                      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                        {label}
                      </p>
                      <p className="mt-3 font-data text-3xl font-semibold">
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
