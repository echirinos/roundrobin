"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { MascotArt, MascotBall } from "@/components/brand/mascot";
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
/* Illustrations. One shared grammar: chunky flat shapes with a 2.5D    */
/* side face for depth, soft ground shadows, and the same dot-eyes      */
/* face on every character. Fixed art colors on purpose — they read as  */
/* stickers in both themes.                                             */
/* ------------------------------------------------------------------ */

// A paddle with a 2.5D face inset, reusable at any angle.
function Paddle({ face, faceInner }: { face: string; faceInner: string }) {
  return (
    <>
      <rect x="-12" y="58" width="24" height="72" rx="11" fill="#ffc800" stroke="#243325" strokeWidth="5" />
      <ellipse cx="0" cy="0" rx="58" ry="70" fill={face} stroke="#243325" strokeWidth="5" />
      <ellipse cx="0" cy="0" rx="36" ry="46" fill={faceInner} />
    </>
  );
}

// The hero: a rally in progress. Two characters, a net, a ball mid-flight.
function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 560 480"
      fill="none"
      className="h-auto w-full max-w-[32rem]"
      role="img"
      aria-label="Two happy pickleballs mid-rally over a net"
    >
      {/* court slab with a 2.5D side face */}
      <rect x="38" y="446" width="484" height="18" rx="9" fill="#b8d891" />
      <rect x="30" y="330" width="500" height="124" rx="18" fill="#e9f8d8" stroke="#cdeba4" strokeWidth="4" />
      <rect x="216" y="332" width="128" height="120" fill="#b5e3f9" opacity="0.55" />
      <path d="M216 334v116M344 334v116" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
      <path d="M52 392h150M358 392h150" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
      {/* net */}
      <rect x="262" y="300" width="36" height="58" rx="6" fill="#ffffff" stroke="#cdeba4" strokeWidth="3" />
      <path d="M262 318h36M262 338h36M274 300v58M286 300v58" stroke="#cdeba4" strokeWidth="2" />
      <rect x="256" y="292" width="48" height="13" rx="6.5" fill="#243325" />
      {/* ground shadows */}
      <ellipse cx="150" cy="446" rx="78" ry="9" fill="#243325" opacity="0.08" />
      <ellipse cx="428" cy="450" rx="66" ry="8" fill="#243325" opacity="0.08" />
      <ellipse cx="292" cy="352" rx="16" ry="4" fill="#243325" opacity="0.1" />
      {/* left player: leaping for the shot */}
      <path d="M28 210h34M20 240h42M32 270h30" stroke="#8ab818" strokeWidth="7" strokeLinecap="round" opacity="0.6" />
      <g transform="translate(62 128) rotate(-10 100 100) scale(0.94)">
        <MascotArt band="#ff9600" />
      </g>
      <g transform="translate(224 318) rotate(-38) scale(0.82)">
        <Paddle face="#a568f5" faceInner="#bd8cf7" />
      </g>
      {/* right player: hyped for the return */}
      <g transform="translate(346 178) rotate(7 100 100) scale(0.76)">
        <MascotArt band="#1cb0f6" expression="open" />
      </g>
      <g transform="translate(514 336) rotate(30) scale(0.82)">
        <Paddle face="#ffc800" faceInner="#ffd84d" />
      </g>
      {/* the ball, mid-flight over the net */}
      <path
        d="M236 244c24-42 60-58 96-52"
        stroke="#8ab818"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray="1 20"
      />
      <circle cx="342" cy="190" r="15" fill="#c8ef44" stroke="#8ab818" strokeWidth="5" />
      <path d="M368 176l16-8M370 192l18 0M366 206l15 8" stroke="#ffc800" strokeWidth="6" strokeLinecap="round" />
      {/* confetti */}
      <circle cx="84" cy="84" r="9" fill="#1cb0f6" />
      <rect x="452" y="98" width="16" height="16" rx="5" fill="#ff9600" transform="rotate(18 460 106)" />
      <rect x="140" y="52" width="14" height="14" rx="5" fill="#a568f5" transform="rotate(-16 147 59)" />
      <circle cx="522" cy="180" r="8" fill="#ffc800" />
    </svg>
  );
}

// The scoreboard phone, drawn as a chunky sticker with a side face.
function PhoneIllustration() {
  return (
    <svg
      viewBox="0 0 300 340"
      fill="none"
      className="h-auto w-full max-w-[17rem]"
      role="img"
      aria-label="A phone showing a QR code and live scores"
    >
      <rect x="78" y="34" width="160" height="264" rx="30" fill="#9db08e" />
      <rect x="70" y="26" width="160" height="264" rx="30" fill="var(--card)" stroke="var(--foreground)" strokeWidth="6" />
      <rect x="100" y="58" width="100" height="100" rx="12" fill="var(--card)" stroke="var(--input)" strokeWidth="4" />
      <rect x="110" y="68" width="24" height="24" rx="5" fill="#54c400" />
      <rect x="166" y="68" width="24" height="24" rx="5" fill="#54c400" />
      <rect x="110" y="124" width="24" height="24" rx="5" fill="#54c400" />
      <rect x="144" y="74" width="11" height="11" fill="var(--foreground)" />
      <rect x="144" y="96" width="11" height="11" fill="var(--foreground)" />
      <rect x="166" y="102" width="11" height="11" fill="var(--foreground)" />
      <rect x="178" y="124" width="11" height="11" fill="var(--foreground)" />
      <rect x="144" y="130" width="11" height="11" fill="var(--foreground)" />
      <rect x="100" y="176" width="100" height="20" rx="10" fill="#e9f8d8" />
      <rect x="100" y="206" width="100" height="20" rx="10" fill="#dff1fd" />
      <rect x="100" y="236" width="66" height="20" rx="10" fill="var(--secondary)" />
      <ellipse cx="150" cy="316" rx="76" ry="9" fill="#243325" opacity="0.1" />
    </svg>
  );
}

// Sticker tiles floating around the sky band, Duolingo app-icon style.
function StickerTile({
  color,
  side,
  children,
}: {
  color: string;
  side: string;
  children: ReactNode;
}) {
  return (
    <svg viewBox="0 0 88 92" fill="none" className="h-auto w-full" aria-hidden="true">
      <rect x="10" y="14" width="72" height="72" rx="20" fill={side} />
      <rect x="6" y="6" width="72" height="72" rx="20" fill={color} />
      {children}
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
      {/* court with a side face */}
      <rect x="126" y="230" width="188" height="14" rx="7" fill="#b8d891" />
      <rect x="120" y="100" width="200" height="136" rx="16" fill="#e9f8d8" stroke="#cdeba4" strokeWidth="4" />
      <path d="M220 104v128" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 12" />
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
  { name: "Popcorn", color: "#54c400", glyph: "popcorn" },
  { name: "Gauntlet", color: "#1cb0f6", glyph: "paddles" },
  { name: "King of the Court", color: "#e0a500", glyph: "crown" },
  { name: "Claim the Throne", color: "#a568f5", glyph: "flag" },
  { name: "Up & Down the River", color: "#ff9600", glyph: "wave" },
  { name: "Set Teams", color: "#0b6e63", glyph: "rings" },
] as const;

function FormatGlyph({ glyph, color }: { glyph: string; color: string }) {
  const stroke = { stroke: color, strokeWidth: 2.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
      {glyph === "popcorn" && (
        <>
          <circle cx="6.5" cy="7" r="3" fill={color} />
          <circle cx="13.5" cy="6" r="2.6" fill={color} />
          <circle cx="10" cy="12.5" r="3.4" fill={color} />
        </>
      )}
      {glyph === "paddles" && (
        <>
          <path d="M5 3.5c2.4 0 4 1.8 4 4.2S7.6 12 5.6 12L4 16.5" {...stroke} />
          <path d="M15 3.5c-2.4 0-4 1.8-4 4.2s1.4 4.3 3.4 4.3L16 16.5" {...stroke} />
        </>
      )}
      {glyph === "crown" && (
        <path d="M3.5 14.5l-1-8 4.2 3L10 4l3.3 5.5 4.2-3-1 8z" fill={color} />
      )}
      {glyph === "flag" && (
        <>
          <path d="M5 17V3" {...stroke} />
          <path d="M5 4h10l-2.6 3.5L15 11H5z" fill={color} />
        </>
      )}
      {glyph === "wave" && (
        <>
          <path d="M3 8c2-3 4-3 6 0s4 3 6 0" {...stroke} />
          <path d="M3 13c2-3 4-3 6 0s4 3 6 0" {...stroke} />
        </>
      )}
      {glyph === "rings" && (
        <>
          <circle cx="7.5" cy="10" r="4.5" {...stroke} />
          <circle cx="12.5" cy="10" r="4.5" {...stroke} />
        </>
      )}
    </svg>
  );
}

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
          <div className="mx-auto flex max-w-5xl items-center gap-x-8 gap-y-3 overflow-x-auto px-6 py-4 [scrollbar-width:none] md:flex-wrap md:justify-center md:overflow-visible [&::-webkit-scrollbar]:hidden">
            {FORMATS.map((format) => (
              <span
                key={format.name}
                className="flex shrink-0 items-center gap-2 text-[13px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground"
              >
                <FormatGlyph glyph={format.glyph} color={format.color} />
                {format.name}
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

        {/* Full-bleed sky band — every phone at the court is the scoreboard. */}
        <section id="features" className="w-full bg-[#dff3fd] dark:bg-[#10222e]">
          <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center gap-8 px-6 py-16 text-center sm:py-24">
            <Reveal className="flex flex-col items-center gap-5">
              <h2 className="max-w-xl font-display text-4xl font-bold lowercase leading-tight text-[#0b4f79] dark:text-[#9ed9f9] sm:text-5xl">
                every phone is the scoreboard.
              </h2>
              <p className="max-w-md text-lg font-semibold leading-relaxed text-[#3c6a87] dark:text-[#8fb6cc]">
                Players scan one QR code to watch live scores and see
                who&apos;s up next, right from the fence. No app to install,
                no group texts.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <PhoneIllustration />
            </Reveal>
            {/* floating stickers, desktop garnish only */}
            <div className="absolute left-8 top-24 hidden w-16 -rotate-12 lg:block" aria-hidden="true">
              <StickerTile color="#54c400" side="#3f8a06">
                <path d="M28 46l10 10 22-24" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </StickerTile>
            </div>
            <div className="absolute right-10 top-32 hidden w-[4.5rem] rotate-6 lg:block" aria-hidden="true">
              <StickerTile color="#ffc800" side="#e0a500">
                <path d="M26 26h32v10a16 16 0 01-32 0zM36 56h12M32 64h20" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </StickerTile>
            </div>
            <div className="absolute bottom-28 left-14 hidden w-14 rotate-6 lg:block" aria-hidden="true">
              <StickerTile color="#a568f5" side="#7440c9">
                <ellipse cx="42" cy="36" rx="17" ry="20" stroke="#ffffff" strokeWidth="6" fill="none" />
                <path d="M42 56v10" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
              </StickerTile>
            </div>
            <div className="absolute bottom-24 right-12 hidden -rotate-6 lg:block" aria-hidden="true">
              <span className="inline-block rounded-full border-2 border-[#b6dff5] bg-white px-4 py-2 font-display text-lg font-bold tracking-[0.14em] text-[#0b4f79] shadow-[0_4px_0_#b6dff5] dark:border-[#1d3c50] dark:bg-[#0c1b26] dark:text-[#9ed9f9] dark:shadow-[0_4px_0_#1d3c50]">
                PLAY42
              </span>
            </div>
          </div>
        </section>

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
