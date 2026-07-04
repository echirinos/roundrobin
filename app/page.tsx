"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Link2,
  MessageCircleOff,
  QrCode,
  RotateCcw,
  ScanLine,
  Smartphone,
  Trophy,
  Zap,
} from "lucide-react";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://playsync.app";

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
    "QR code check-in",
    "Round robin and rotating partners",
    "Automatic next game and standings",
  ],
};

const composerChips = ["QR ready", "9 checked in", "Next game posted"];

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
  "QR check-in for late arrivals",
  "Scores update the next game",
  "Rotating or set-team sessions",
];

const laneEvents = [
  "QR shared",
  "9 checked in",
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
    label: "Join",
    title: "Players check themselves in",
    text: "Latecomers scan the QR and join mid-session. You never stop to take names.",
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
    icon: ScanLine,
    label: "QR check-in",
    value: "Players join themselves",
  },
  {
    icon: MessageCircleOff,
    label: "Fewer texts",
    value: "One feed for the group",
  },
  {
    icon: Smartphone,
    label: "Phone browser",
    value: "Big taps, no install",
  },
];

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
    <motion.div
      initial={reduceMotion ? false : { y: 18 }}
      whileInView={reduceMotion ? undefined : { y: 0 }}
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
      initial={reduceMotion ? false : { x: 18 }}
      animate={reduceMotion ? undefined : { x: 0 }}
      transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1], delay: 0.14 }}
      className="court-lanes"
      aria-hidden="true"
    >
      <svg viewBox="0 0 560 520" fill="none" className="court-lanes-svg">
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

        <g className="court-score-bug">
          <rect
            x="50"
            y="34"
            width="384"
            height="150"
            rx="18"
            className="score-bug-shell"
          />
          <rect
            x="62"
            y="48"
            width="70"
            height="122"
            rx="12"
            className="score-bug-live-panel"
          />
          <text x="78" y="68" className="score-bug-kicker">
            Live
          </text>
          <text x="78" y="98" className="score-bug-clock">
            C2
          </text>
          <motion.text
            x="78"
            y="123"
            className="score-bug-subclock"
            animate={reduceMotion ? undefined : { opacity: [1, 1, 0, 0, 1] }}
            transition={
              reduceMotion
                ? undefined
                : { duration: 4.8, ease: "easeInOut", repeat: Infinity }
            }
          >
            Rally
          </motion.text>
          <motion.text
            x="78"
            y="123"
            className="score-bug-subclock score-bug-subclock-final"
            initial={reduceMotion ? { opacity: 0 } : undefined}
            animate={reduceMotion ? undefined : { opacity: [0, 0, 1, 1, 0] }}
            transition={
              reduceMotion
                ? undefined
                : { duration: 4.8, ease: "easeInOut", repeat: Infinity }
            }
          >
            Score
          </motion.text>

          <rect
            x="144"
            y="49"
            width="204"
            height="40"
            rx="9"
            className="score-row score-row-leading"
          />
          <rect
            x="144"
            y="95"
            width="204"
            height="40"
            rx="9"
            className="score-row"
          />
          <rect
            x="356"
            y="49"
            width="60"
            height="40"
            rx="9"
            className="score-cell score-cell-leading"
          />
          <rect
            x="356"
            y="95"
            width="60"
            height="40"
            rx="9"
            className="score-cell"
          />

          <text x="158" y="75" className="score-team-label">
            Ana / Ben
          </text>
          <text x="158" y="121" className="score-team-label score-team-muted">
            Cara / Diego
          </text>
          <motion.text
            x="386"
            y="81"
            className="score-number score-number-leading"
            animate={
              reduceMotion
                ? undefined
                : { scale: [1, 1, 0.92, 0.92, 1], opacity: [1, 1, 0, 0, 1] }
            }
            transition={
              reduceMotion
                ? undefined
                : { duration: 4.8, ease: "easeInOut", repeat: Infinity }
            }
          >
            8
          </motion.text>
          <motion.text
            x="386"
            y="81"
            className="score-number score-number-leading score-number-final"
            initial={reduceMotion ? { opacity: 0 } : undefined}
            animate={
              reduceMotion
                ? undefined
                : { scale: [0.92, 0.92, 1.14, 1, 0.92], opacity: [0, 0, 1, 1, 0] }
            }
            transition={
              reduceMotion
                ? undefined
                : { duration: 4.8, ease: "easeInOut", repeat: Infinity }
            }
          >
            9
          </motion.text>
          <text x="386" y="127" className="score-number">
            6
          </text>
          <motion.rect
            x="144"
            y="152"
            width="104"
            height="3"
            rx="1.5"
            className="score-sync-bar"
            animate={reduceMotion ? undefined : { opacity: [0.25, 0.9, 0.25], width: [104, 150, 104] }}
            transition={
              reduceMotion
                ? undefined
                : { duration: 4.8, ease: "easeInOut", repeat: Infinity }
            }
          />
          <motion.g
            className="score-next-up"
            initial={reduceMotion ? { opacity: 0 } : undefined}
            animate={reduceMotion ? undefined : { opacity: [0, 0, 1, 1, 0] }}
            transition={
              reduceMotion
                ? undefined
                : { duration: 4.8, ease: "easeInOut", repeat: Infinity }
            }
          >
            <rect x="272" y="145" width="144" height="20" rx="10" />
            <text x="284" y="159">Next: Court 1</text>
          </motion.g>
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
  return (
    <div className="motion-rail" aria-label="Live session progress">
      {laneEvents.map((event, index) => (
        <div key={event} className="motion-rail-step">
          <span className="motion-rail-index">0{index + 1}</span>
          <span>{event}</span>
        </div>
      ))}
    </div>
  );
}

function ProductProofVisual({ kind }: { kind: "setup" | "join" | "score" }) {
  if (kind === "setup") {
    return (
      <div className="pp-visual" aria-hidden="true">
        <div className="pp-link">
          <Link2 className="size-3.5 text-live" />
          <span className="pp-link-url">playsync.app/live</span>
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
              <CheckCircle2 className="pp-avatar-check size-3" />
            </span>
          ))}
          <span className="pp-avatar pp-avatar-more">+6</span>
        </div>
        <div className="pp-qr">
          <QrCode className="size-6" />
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
          <Trophy className="size-3" />
          Final
        </span>
      </div>
      <div className="pp-next">
        <ArrowRight className="size-3.5 text-live" />
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
          <ClipboardList className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-lg leading-7 text-foreground sm:text-xl">
              Create tonight&apos;s live session in 30 seconds.
            </p>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
              <Zap className="size-3 text-live" />
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
              <ArrowRight className="size-4" />
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
      <Smartphone className="size-3.5 text-live" />
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
              <span>9 checked in · 2 courts</span>
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
              <ArrowRight className="size-3.5" />
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
            {["Gia checked in", "Court 1 needs a score", "Eli / Fran up next"].map(
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
              initial={reduceMotion ? false : { y: 16 }}
              animate={reduceMotion ? undefined : { y: 0 }}
              transition={{ duration: 0.46, ease: [0.22, 1, 0.36, 1] }}
              className="hero-copy-stack order-1 max-w-3xl lg:col-start-1 lg:row-start-1"
            >
              <p className="hero-eyebrow">
                Casual drop-in pickleball, one shared link
              </p>
              <h1 className="hero-headline mt-5 max-w-4xl text-balance font-serif-editorial text-5xl font-medium leading-[0.94] tracking-normal text-foreground sm:text-7xl lg:text-[5.6rem] xl:text-[6.1rem]">
                Play more. Organize less.
              </h1>
              <p className="hero-subcopy mt-5 max-w-2xl text-balance text-lg leading-8 text-muted-foreground">
                Open play is casual pickleball where people show up and rotate
                through games. Run the whole night from one link: players scan a
                QR to join, you tap scores, and the next game posts itself.
              </p>
              <HeroAssurance />
            </motion.div>

            <div className="order-3 relative mx-auto w-full max-w-xl lg:order-none lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mx-0 lg:max-w-none lg:self-center">
              <CourtLanes />
            </div>

            <div className="order-2 lg:order-none lg:col-start-1 lg:row-start-2">
              <SessionComposer />

              <div className="proof-strip mt-5 flex max-w-3xl flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                {proofPoints.map((point) => (
                  <span key={point} className="inline-flex items-center gap-2">
                    <CheckCircle2 className="size-3.5 text-live" />
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
                <h2 className="mt-3 max-w-md font-serif-editorial text-4xl font-medium tracking-normal text-foreground sm:text-5xl">
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
              <h2 className="mt-3 font-serif-editorial text-4xl font-medium tracking-normal text-foreground sm:text-6xl">
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
                  <RotateCcw className="size-5 text-muted-foreground" />
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
                      <p className="mt-3 text-3xl font-semibold tracking-normal">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.06}>
              <p className="section-kicker">Less running the show</p>
              <h2 className="mt-3 font-serif-editorial text-4xl font-medium tracking-normal text-foreground sm:text-6xl">
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
                <p className="section-kicker">Ready courtside</p>
                <h2 className="mt-3 max-w-3xl font-serif-editorial text-4xl font-medium tracking-normal text-foreground sm:text-6xl">
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
                    <ArrowRight className="size-4" />
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
