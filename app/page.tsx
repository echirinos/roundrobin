"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://playsync.fun").replace(/\/+$/, "");

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
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Flat illustrations. One shared grammar: thick rounded strokes, flat  */
/* kit colors, the same dot-eyes-and-smile face on every character.     */
/* ------------------------------------------------------------------ */

// The mascot: a pickleball with a sweatband. Face stays clear of the holes.
function MascotBall({ size = 200 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden="true"
    >
      <MascotArt />
    </svg>
  );
}

function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 520 440"
      fill="none"
      className="h-auto w-full max-w-[30rem]"
      role="img"
      aria-label="A happy pickleball bouncing across a court next to a paddle"
    >
      {/* court */}
      <rect x="30" y="296" width="460" height="118" rx="18" fill="#e9f8d8" stroke="#cdeba4" strokeWidth="4" />
      <rect x="196" y="296" width="128" height="118" fill="#b5e3f9" opacity="0.55" />
      <path d="M260 300v110" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 14" />
      <path d="M196 300v110M324 300v110" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
      <path d="M54 355h142M324 355h142" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
      {/* bounce trail + impact */}
      <path
        d="M64 258c40-84 118-124 196-110"
        stroke="#8ab818"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray="1 22"
      />
      <path
        d="M92 322l-10 18M112 330l2 20M74 310l-18 10"
        stroke="#ffc800"
        strokeWidth="7"
        strokeLinecap="round"
      />
      {/* paddle leaning on the court */}
      <g transform="rotate(14 428 258)">
        <rect x="416" y="252" width="24" height="74" rx="11" fill="#ffc800" stroke="#243325" strokeWidth="5" />
        <ellipse cx="428" cy="192" rx="62" ry="74" fill="#a568f5" stroke="#243325" strokeWidth="5" />
        <ellipse cx="428" cy="192" rx="38" ry="48" fill="#bd8cf7" />
      </g>
      {/* mascot mid-bounce */}
      <g transform="translate(160 88)">
        <MascotArt />
      </g>
      {/* confetti */}
      <circle cx="96" cy="96" r="9" fill="#1cb0f6" />
      <rect x="380" y="62" width="16" height="16" rx="5" fill="#ff9600" transform="rotate(18 388 70)" />
      <rect x="52" y="180" width="14" height="14" rx="5" fill="#a568f5" transform="rotate(-16 59 187)" />
      <circle cx="474" cy="120" r="8" fill="#ffc800" />
    </svg>
  );
}

// Inner mascot artwork shared by HeroIllustration (as a <g>) and MascotBall.
function MascotArt() {
  return (
    <>
      <circle cx="100" cy="100" r="88" fill="#c8ef44" stroke="#8ab818" strokeWidth="7" />
      <circle cx="58" cy="52" r="9" fill="#a5cc2e" />
      <circle cx="100" cy="38" r="9" fill="#a5cc2e" />
      <circle cx="142" cy="52" r="9" fill="#a5cc2e" />
      <circle cx="164" cy="92" r="9" fill="#a5cc2e" />
      <circle cx="36" cy="92" r="9" fill="#a5cc2e" />
      <path
        d="M28 78c14-26 42-42 72-42s58 16 72 42"
        stroke="#ff9600"
        strokeWidth="16"
        strokeLinecap="round"
      />
      <ellipse cx="76" cy="110" rx="13" ry="16" fill="#ffffff" />
      <ellipse cx="124" cy="110" rx="13" ry="16" fill="#ffffff" />
      <circle cx="79" cy="113" r="6.5" fill="#243325" />
      <circle cx="121" cy="113" r="6.5" fill="#243325" />
      <path
        d="M82 146c6 7 12 10 18 10s12-3 18-10"
        stroke="#243325"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <circle cx="58" cy="138" r="8" fill="#ffb14d" opacity="0.55" />
      <circle cx="142" cy="138" r="8" fill="#ffb14d" opacity="0.55" />
    </>
  );
}

function FollowIllustration() {
  return (
    <svg
      viewBox="0 0 440 340"
      fill="none"
      className="h-auto w-full max-w-[26rem]"
      role="img"
      aria-label="Three players looking at a phone showing a QR code"
    >
      {/* phone */}
      <rect x="140" y="24" width="160" height="250" rx="28" fill="var(--card)" stroke="var(--foreground)" strokeWidth="6" />
      <rect x="172" y="60" width="96" height="96" rx="10" fill="var(--card)" stroke="var(--input)" strokeWidth="4" />
      {/* QR: three green finders + ink modules */}
      <rect x="182" y="70" width="22" height="22" rx="4" fill="#54c400" />
      <rect x="236" y="70" width="22" height="22" rx="4" fill="#54c400" />
      <rect x="182" y="124" width="22" height="22" rx="4" fill="#54c400" />
      <rect x="214" y="76" width="10" height="10" fill="var(--foreground)" />
      <rect x="214" y="96" width="10" height="10" fill="var(--foreground)" />
      <rect x="236" y="102" width="10" height="10" fill="var(--foreground)" />
      <rect x="248" y="124" width="10" height="10" fill="var(--foreground)" />
      <rect x="214" y="130" width="10" height="10" fill="var(--foreground)" />
      <rect x="248" y="140" width="10" height="10" fill="var(--foreground)" />
      {/* score rows on the phone */}
      <rect x="172" y="176" width="96" height="18" rx="9" fill="#e9f8d8" />
      <rect x="172" y="204" width="96" height="18" rx="9" fill="#dff1fd" />
      <rect x="172" y="232" width="64" height="18" rx="9" fill="var(--secondary)" />
      {/* three heads peeking up at it */}
      <g>
        <circle cx="72" cy="292" r="44" fill="#f1b98a" />
        <path d="M32 278c4-26 20-40 40-40s36 14 40 40" fill="#243325" />
        <circle cx="60" cy="296" r="5" fill="#243325" />
        <circle cx="86" cy="296" r="5" fill="#243325" />
        <path d="M62 312c4 4 8 6 11 6s7-2 11-6" stroke="#243325" strokeWidth="5" strokeLinecap="round" />
      </g>
      <g>
        <circle cx="220" cy="306" r="40" fill="#8d5a3b" />
        <path d="M184 292c4-22 18-34 36-34s32 12 36 34" fill="#0e7ab5" />
        <circle cx="209" cy="310" r="5" fill="#243325" />
        <circle cx="233" cy="310" r="5" fill="#243325" />
        <path d="M211 324c3 4 6 5 9 5s6-1 9-5" stroke="#243325" strokeWidth="5" strokeLinecap="round" />
      </g>
      <g>
        <circle cx="366" cy="292" r="44" fill="#edc4b1" />
        <path d="M326 280c2-28 18-42 40-42s38 14 40 42c-10-10-24-14-40-14s-30 4-40 14z" fill="#a568f5" />
        <circle cx="354" cy="296" r="5" fill="#243325" />
        <circle cx="380" cy="296" r="5" fill="#243325" />
        <path d="M356 312c4 4 8 6 11 6s7-2 11-6" stroke="#243325" strokeWidth="5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function RotationIllustration() {
  return (
    <svg
      viewBox="0 0 440 340"
      fill="none"
      className="h-auto w-full max-w-[26rem]"
      role="img"
      aria-label="Four players rotating around a court while one rests on the bench"
    >
      {/* court */}
      <rect x="120" y="100" width="200" height="140" rx="16" fill="#e9f8d8" stroke="#cdeba4" strokeWidth="4" />
      <path d="M220 104v132" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 12" />
      {/* rotation arrows */}
      <path d="M150 76c40-24 100-24 140 0" stroke="var(--foreground)" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M282 62l14 16-21 5" stroke="var(--foreground)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M290 264c-40 24-100 24-140 0" stroke="var(--foreground)" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M158 278l-14-16 21-5" stroke="var(--foreground)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* players on court corners */}
      <PlayerDot cx={96} cy={132} fill="#54c400" />
      <PlayerDot cx={344} cy={132} fill="#1cb0f6" />
      <PlayerDot cx={96} cy={222} fill="#ffc800" />
      <PlayerDot cx={344} cy={222} fill="#a568f5" />
      {/* bench, with the sit-out coming back next */}
      <rect x="352" y="292" width="72" height="14" rx="7" fill="#d9d5c0" />
      <rect x="360" y="306" width="10" height="18" rx="4" fill="#d9d5c0" />
      <rect x="406" y="306" width="10" height="18" rx="4" fill="#d9d5c0" />
      <PlayerDot cx={388} cy={272} fill="#ff9600" />
      <path d="M356 258c-12-8-20-18-24-30" stroke="#8ab818" strokeWidth="5" strokeLinecap="round" strokeDasharray="1 12" />
    </svg>
  );
}

function PlayerDot({ cx, cy, fill }: { cx: number; cy: number; fill: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r="26" fill={fill} stroke="var(--background)" strokeWidth="5" />
      <circle cx={cx - 8} cy={cy - 2} r="3.5" fill="#243325" />
      <circle cx={cx + 8} cy={cy - 2} r="3.5" fill="#243325" />
      <path
        d={`M${cx - 7} ${cy + 8}c2.5 3 5 4.5 7 4.5s4.5-1.5 7-4.5`}
        stroke="#243325"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </g>
  );
}

/* ------------------------------------------------------------------ */

function PlayableScorebug() {
  const [matchIndex, setMatchIndex] = useState(0);
  const [score, setScore] = useState<[number, number]>([6, 4]);
  const tickRef = useRef(0);
  const lastTouchRef = useRef(0);
  const featured = useFeaturedSession();
  const match = demoMatchups[matchIndex % demoMatchups.length];
  const isReal = featured !== null;
  const displayCourt = isReal ? featured.court : match.court;
  const displayTeams = isReal ? featured.teams : match.teams;
  const displayScore: [number, number] = isReal ? featured.score : score;

  // finalFlash is derived, and the updater stays pure (StrictMode
  // double-invokes updaters, so side effects in them double-score); the
  // game-over rollover is a timeout keyed on the derived flag.
  const finalFlash = Math.max(score[0], score[1]) >= 11;

  const addPoint = useCallback((side: 0 | 1, fromUser: boolean) => {
    if (fromUser) lastTouchRef.current = Date.now();
    setScore((current) => {
      if (Math.max(current[0], current[1]) >= 11) return current;
      return side === 0 ? [current[0] + 1, current[1]] : [current[0], current[1] + 1];
    });
  }, []);

  useEffect(() => {
    if (!finalFlash) return;
    const timeout = window.setTimeout(() => {
      setMatchIndex((index) => index + 1);
      setScore([0, 0]);
    }, 1400);
    return () => window.clearTimeout(timeout);
  }, [finalFlash]);

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
    <div className="w-full max-w-[26rem]">
      <div className="overflow-hidden rounded-3xl border-2 border-border bg-card shadow-[0_4px_0_var(--border)]">
        <div className="flex items-center justify-between gap-3 border-b-2 border-border px-5 py-3">
          <span className="truncate text-xs font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
            {isReal ? `${displayCourt} · ${featured.sessionName}` : displayCourt}
          </span>
          {finalFlash ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.1em] text-success">
              Final
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-live/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.1em] text-live">
              <span className="size-1.5 rounded-full bg-live" aria-hidden="true" />
              Live · to 11
            </span>
          )}
        </div>

        {displayTeams.map((team, side) => (
          <motion.button
            key={team}
            type="button"
            whileTap={{ scale: 0.98 }}
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
              "flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors",
              side === 0 ? "border-b-2 border-border" : "",
              leadingSide === side ? "bg-primary/8" : "hover:bg-secondary/50",
            )}
          >
            <span className="text-base font-extrabold text-foreground">{team}</span>
            <span
              className={cn(
                "font-display text-5xl font-bold leading-none",
                leadingSide === side ? "text-success" : "text-muted-foreground",
              )}
            >
              <ScoreDigits value={displayScore[side]} />
            </span>
          </motion.button>
        ))}

        <div className="h-10 overflow-hidden border-t-2 border-border bg-secondary/50">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={matchIndex}
              initial={{ transform: "translateY(100%)" }}
              animate={{ transform: "translateY(0%)" }}
              exit={{ transform: "translateY(-100%)" }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="flex h-full items-center gap-2 px-5 text-[13px] font-bold text-muted-foreground"
            >
              {isReal ? (
                <>
                  <span className="truncate">Live now — tap to watch</span>
                  <span className="ml-auto shrink-0 font-extrabold">{featured.code}</span>
                </>
              ) : (
                <>
                  <span className="truncate">Next · {match.next}</span>
                  <span className="ml-auto shrink-0 font-extrabold">{match.nextCourt}</span>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <p className="mt-3 text-center text-sm font-bold text-muted-foreground">
        {isReal ? "A real session, live right now — tap to watch." : "Live demo — tap a team to score."}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const FORMATS = [
  "Popcorn",
  "Gauntlet",
  "King of the Court",
  "Claim the Throne",
  "Up & Down the River",
  "Set Teams",
] as const;

const FORMAT_COLORS = ["#54c400", "#1cb0f6", "#ffc800", "#a568f5", "#ff9600", "#0b6e63"] as const;

function FeatureSection({
  id,
  heading,
  copy,
  art,
  flip = false,
}: {
  id?: string;
  heading: string;
  copy: ReactNode;
  art: ReactNode;
  flip?: boolean;
}) {
  return (
    <section id={id} className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
      <Reveal>
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
          <div className={cn("flex justify-center", flip ? "md:order-2" : "")}>{art}</div>
          <div className={cn("max-w-md justify-self-center md:justify-self-start", flip ? "md:order-1" : "")}>
            <h2 className="font-display text-4xl font-bold lowercase leading-tight text-success sm:text-5xl">
              {heading}
            </h2>
            <p className="mt-5 text-lg font-semibold leading-relaxed text-muted-foreground">
              {copy}
            </p>
          </div>
        </div>
      </Reveal>
    </section>
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

      <main>
        {/* Hero: illustration + one sentence + two buttons. Nothing else. */}
        <section className="mx-auto grid w-full max-w-5xl items-center gap-10 px-6 pb-16 pt-12 sm:pt-16 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] md:gap-14 md:pb-24 md:pt-20">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, transform: "scale(0.94)" }}
            animate={{ opacity: 1, transform: "scale(1)" }}
            transition={{ duration: 0.6, ease: [0.22, 1.2, 0.36, 1] }}
            className="flex justify-center"
          >
            <HeroIllustration />
          </motion.div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, transform: "translateY(14px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
            className="flex flex-col items-center gap-8 md:items-start"
          >
            <h1 className="max-w-md text-balance text-center font-display text-4xl font-bold leading-tight text-foreground sm:text-5xl md:text-left">
              The fun way to run pickleball night!
            </h1>
            <div className="flex w-full max-w-[21rem] flex-col gap-3">
              <Button asChild size="lg" className="w-full">
                <Link
                  href="/tournament?new=1&mode=rotating"
                  data-testid="hero-create-session"
                  data-analytics-event="create_session_clicked"
                  data-analytics-location="hero_composer"
                  data-analytics-mode="rotating"
                >
                  Create a session
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full">
                <Link
                  href="/tournament?join=1"
                  data-testid="hero-join-code"
                  data-analytics-event="join_code_clicked"
                  data-analytics-location="hero_composer"
                >
                  Join with a code
                </Link>
              </Button>
            </div>
          </motion.div>
        </section>

        {/* Format strip — the "language carousel". Real formats only. */}
        <div className="border-y-2 border-border">
          <div className="mx-auto flex max-w-5xl items-center gap-8 overflow-x-auto px-6 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FORMATS.map((format, index) => (
              <span
                key={format}
                className="flex shrink-0 items-center gap-2 text-[13px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground"
              >
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: FORMAT_COLORS[index] }}
                  aria-hidden="true"
                />
                {format}
              </span>
            ))}
          </div>
        </div>

        <FeatureSection
          id="how-it-works"
          heading="scores run the night."
          copy={
            <>
              Tap in a score and PlaySync does the rest: standings update, the
              court frees up, and the next matchup gets called. Go ahead — tap
              a team.
            </>
          }
          art={<PlayableScorebug />}
          flip
        />

        <FeatureSection
          id="features"
          heading="everyone follows along."
          copy={
            <>
              Players scan one QR code to watch live scores and see who&apos;s
              up next, right from the fence. No app to install, no group
              texts.
            </>
          }
          art={<FollowIllustration />}
        />

        <FeatureSection
          heading="fair for everyone."
          copy={
            <>
              Partners rotate every round and sit-outs are tracked, so nobody
              rides the bench twice while someone else plays all night.
            </>
          }
          art={<RotationIllustration />}
          flip
        />

        {/* Final call. One button, mascot cheering it on. */}
        <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-7 px-6 pb-24 pt-8 text-center sm:pb-32">
          <Reveal className="flex flex-col items-center gap-7">
            <MascotBall size={120} />
            <h2 className="font-display text-4xl font-bold lowercase text-foreground sm:text-5xl">
              ready to play?
            </h2>
            <Button asChild size="lg" className="w-full max-w-[21rem]">
              <Link
                href="/tournament?new=1&mode=rotating"
                data-testid="final-create-session"
                data-analytics-event="create_session_clicked"
                data-analytics-location="final_cta"
                data-analytics-mode="rotating"
              >
                Create a session
              </Link>
            </Button>
            <Link
              href="/tournament?join=1"
              data-testid="final-join-code"
              data-analytics-event="join_code_clicked"
              data-analytics-location="final_cta"
              className="touch-target inline-flex items-center text-sm font-bold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              or join with a code
            </Link>
          </Reveal>
        </section>
      </main>

      <Footer />
    </div>
  );
}
