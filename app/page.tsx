"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  QrCode,
  RadioTower,
  ScanLine,
  Share2,
  Shuffle,
  Smartphone,
  Sparkles,
  Trophy,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NumberTicker } from "@/components/ui/number-ticker";
import { ShineBorder } from "@/components/ui/shine-border";
import { TextureButton } from "@/components/ui/texture-button";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { cn } from "@/lib/utils";

const heroStats = [
  { label: "players", value: 9 },
  { label: "courts", value: 2 },
  { label: "sitting", value: 1 },
];

const productSignals = [
  {
    icon: QrCode,
    title: "QR join and share",
    detail: "Publish a session code, show the QR sheet, and let players open the live view.",
  },
  {
    icon: Smartphone,
    title: "Courtside score entry",
    detail: "Large tap targets, score pops, and round status that works from a phone browser.",
  },
  {
    icon: RadioTower,
    title: "Live standings",
    detail: "The board updates for spectators and players without passing one phone around.",
  },
];

const flowSteps = [
  {
    icon: UsersRound,
    eyebrow: "setup",
    title: "Tell it players and courts",
    detail: "Start with what the organizer actually knows: how many people showed up and how many courts are open.",
  },
  {
    icon: Shuffle,
    eyebrow: "mode",
    title: "Pick Popcorn or go competitive",
    detail: "Popcorn is the social default. Gauntlet, King of the Court, brackets, and set teams stay close.",
  },
  {
    icon: Share2,
    eyebrow: "live",
    title: "Share the session code",
    detail: "Players can join from their browser, check in, and follow the round without installing anything.",
  },
  {
    icon: Trophy,
    eyebrow: "score",
    title: "Advance when scores are in",
    detail: "PlaySync handles byes, court use, standings, and the next round queue.",
  },
];

const exampleMatches = [
  {
    court: "Court 1",
    left: "Ana / Ben",
    right: "Cara / Diego",
    score: "8-6",
    status: "In progress",
  },
  {
    court: "Court 2",
    left: "Eli / Fran",
    right: "Gia / Hugo",
    score: "0-0",
    status: "Next up",
  },
];

const standings = [
  { name: "Ana", value: 3, meta: "3-0" },
  { name: "Diego", value: 2, meta: "2-1" },
  { name: "Fran", value: 2, meta: "2-1" },
];

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-96px" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SessionBoard({ className }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
      className={cn("relative mx-auto w-full max-w-[35rem]", className)}
    >
      <div className="absolute -inset-8 rounded-full bg-primary/20 blur-3xl" />
      <div className="landing-board-shell relative overflow-hidden rounded-[2rem] border border-border/70 bg-card/86 p-3 shadow-[0_32px_110px_-56px_rgb(14_38_19_/_0.72)] backdrop-blur-2xl">
        <ShineBorder
          borderWidth={1}
          duration={16}
          shineColor={["var(--primary)", "var(--live)", "var(--accent)"]}
        />
        <div className="relative overflow-hidden rounded-[1.45rem] border border-border/70 bg-background/90">
          <div className="landing-court-surface absolute inset-0 opacity-80" />
          <div className="relative flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-live shadow-[0_0_18px_var(--live)]" />
                <p className="font-data text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Live session
                </p>
              </div>
              <p className="mt-1 truncate font-display text-xl font-semibold tracking-tight">
                Monday Popcorn
              </p>
            </div>
            <div className="rounded-xl border border-primary/45 bg-primary/12 px-3 py-2 text-right">
              <p className="font-data text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
                Code
              </p>
              <p className="font-display text-lg font-semibold">P7K4Q9</p>
            </div>
          </div>

          <div className="relative grid gap-3 p-4 sm:grid-cols-[1.15fr_0.85fr] sm:p-5">
            <div className="flex flex-col gap-3">
              <div className="rounded-2xl border border-primary/50 bg-primary/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-semibold">
                      Popcorn round 1
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      8 players play. 1 sits.
                    </p>
                  </div>
                  <Badge variant="outline">2 courts</Badge>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-background/80">
                  <motion.div
                    initial={{ width: "18%" }}
                    animate={{ width: "72%" }}
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                      repeatType: "reverse",
                      ease: "easeInOut",
                    }}
                    className="h-full rounded-full bg-primary"
                  />
                </div>
              </div>

              {exampleMatches.map((match, index) => (
                <motion.div
                  key={match.court}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.45,
                    ease: [0.22, 1, 0.36, 1],
                    delay: 0.25 + index * 0.09,
                  }}
                  className="rounded-2xl border border-border/70 bg-card/82 p-3"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <Badge variant={index === 0 ? "default" : "outline"}>
                      {match.court}
                    </Badge>
                    <span className="font-data text-xs text-muted-foreground">
                      {match.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <p className="truncate text-sm font-semibold">{match.left}</p>
                    <p className="font-data rounded-lg bg-secondary px-2 py-1 text-sm font-semibold">
                      {match.score}
                    </p>
                    <p className="truncate text-right text-sm font-semibold">
                      {match.right}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="grid gap-3">
              <div className="rounded-2xl border border-border/70 bg-card/82 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-display text-base font-semibold">
                    Standings
                  </p>
                  <Badge variant="secondary">Live</Badge>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  {standings.map((player, index) => (
                    <div
                      key={player.name}
                      className="flex items-center justify-between gap-3 rounded-xl bg-background/68 px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="font-data text-xs text-muted-foreground">
                          {index + 1}
                        </span>
                        <span className="truncate text-sm font-semibold">
                          {player.name}
                        </span>
                      </div>
                      <span className="font-data text-xs text-muted-foreground">
                        {player.meta}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-foreground p-4 text-background">
                <div className="flex items-center gap-2">
                  <ScanLine className="size-4" />
                  <p className="font-data text-xs uppercase tracking-[0.16em] text-background/70">
                    QR ready
                  </p>
                </div>
                <p className="mt-3 font-display text-2xl font-semibold">
                  Share once. Everyone follows.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        <section className="landing-hero relative isolate overflow-hidden border-b border-border/60">
          <div className="landing-court-surface absolute inset-0" />
          <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-background to-transparent" />
          <div className="container relative mx-auto grid min-h-[calc(100svh-4rem)] max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:py-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-2xl"
            >
              <Badge variant="outline" className="mb-5">
                Browser-native pickleball control room
              </Badge>
              <h1 className="font-display text-5xl font-bold leading-[0.92] tracking-tight sm:text-7xl lg:text-[5.8rem]">
                PlaySync keeps every court moving.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                Create a live session, share the QR, enter scores courtside,
                and generate the next round before the group cools down.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <TextureButton
                  asChild
                  size="lg"
                  className="h-12 sm:w-auto"
                  data-testid="hero-create-session"
                >
                  <Link href="/tournament?new=1&mode=rotating">
                    Create a Session
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                </TextureButton>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 text-base"
                >
                  <Link href="/tournament?join=1" data-testid="hero-join-code">
                    Join with Code
                  </Link>
                </Button>
              </div>

              <div className="mt-8 grid max-w-xl grid-cols-3 gap-2">
                {heroStats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.45,
                      ease: [0.22, 1, 0.36, 1],
                      delay: 0.2 + index * 0.06,
                    }}
                    className="rounded-2xl border border-border/70 bg-card/70 p-3 backdrop-blur"
                  >
                    <p className="font-display text-3xl font-semibold">
                      <NumberTicker value={stat.value} startValue={0} />
                    </p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      {stat.label}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <SessionBoard />
          </div>
        </section>

        <section
          id="features"
          className="relative overflow-hidden border-b border-border/60 py-16 sm:py-24"
        >
          <div className="container mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-10 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
              <Reveal className="lg:sticky lg:top-24">
                <Badge variant="outline" className="mb-4">
                  Why it feels faster
                </Badge>
                <h2 className="font-display text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
                  Built for the moment between games.
                </h2>
                <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
                  PlaySync replaces the whiteboard huddle with a live, shared
                  session that still feels simple on a phone.
                </p>
              </Reveal>

              <div className="grid gap-4">
                {productSignals.map((item, index) => {
                  const Icon = item.icon;

                  return (
                    <Reveal key={item.title} delay={index * 0.06}>
                      <motion.div
                        whileHover={{ y: -3 }}
                        transition={{ duration: 0.2 }}
                        className="group relative overflow-hidden rounded-[1.6rem] border border-border/70 bg-card/74 p-5 shadow-sm backdrop-blur"
                      >
                        <div className="absolute inset-y-0 left-0 w-1 bg-primary opacity-0 transition-opacity group-hover:opacity-100" />
                        <div className="flex gap-4">
                          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-background/72 text-live">
                            <Icon className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-display text-xl font-semibold">
                              {item.title}
                            </h3>
                            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                              {item.detail}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-16 sm:py-24">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="mx-auto max-w-3xl text-center">
              <Badge variant="outline" className="mb-4">
                Courtside flow
              </Badge>
              <h2 className="font-display text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
                Four decisions. Then everyone plays.
              </h2>
            </Reveal>

            <div className="relative mt-12 grid gap-4 lg:grid-cols-4">
              <div className="absolute left-0 right-0 top-8 hidden h-px bg-border lg:block" />
              {flowSteps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <Reveal key={step.title} delay={index * 0.06}>
                    <div className="relative flex h-full flex-col gap-4 rounded-[1.6rem] border border-border/70 bg-background p-5 shadow-sm">
                      <div className="flex size-16 items-center justify-center rounded-2xl border border-primary/35 bg-primary text-primary-foreground shadow-[0_18px_38px_-28px_var(--primary)]">
                        <Icon className="size-6" />
                      </div>
                      <div>
                        <p className="font-data text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {step.eyebrow}
                        </p>
                        <h3 className="mt-2 font-display text-xl font-semibold">
                          {step.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {step.detail}
                        </p>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        <section className="overflow-hidden border-y border-border/60 bg-foreground py-16 text-background sm:py-24">
          <div className="container mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1fr] lg:items-center">
            <Reveal>
              <p className="font-data text-sm uppercase tracking-[0.18em] text-background/60">
                Example session
              </p>
              <h2 className="mt-3 font-display text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
                9 players, 2 courts, zero guessing.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-background/72">
                The app says who plays, who sits, what court is live, and when
                the standings changed. It is product proof, not marketing filler.
              </p>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="rounded-[2rem] border border-background/15 bg-background/8 p-3 backdrop-blur">
                <div className="rounded-[1.45rem] bg-background p-4 text-foreground">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-display text-xl font-semibold">
                        Session snapshot
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Popcorn / rotating partners
                      </p>
                    </div>
                    <Badge>Live</Badge>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { label: "checked in", value: 9 },
                      { label: "games done", value: 6 },
                      { label: "round", value: 2 },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-2xl border border-border/70 bg-card/80 p-4"
                      >
                        <p className="font-display text-3xl font-semibold">
                          <NumberTicker value={item.value} startValue={0} />
                        </p>
                        <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          {item.label}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-2xl border border-border/70 bg-primary/10 p-4">
                    <div className="flex items-center gap-3">
                      <Clock3 className="size-5 text-primary" />
                      <p className="text-sm font-medium">
                        Round 3 is ready after Court 1 submits score.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="relative overflow-hidden py-16 sm:py-24">
          <div className="landing-court-surface absolute inset-0" />
          <div className="container relative mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal>
              <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/84 shadow-sm backdrop-blur">
                <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
                  <div className="flex flex-col justify-between gap-10 p-6 sm:p-10">
                    <div>
                      <Badge variant="outline" className="mb-4">
                        Ready when the group is
                      </Badge>
                      <h2 className="font-display text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
                        Create the session before the next paddle tap.
                      </h2>
                      <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
                        No account wall, no app download, no spreadsheet. Just
                        enough structure to keep pickup play moving.
                      </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <TextureButton
                        asChild
                        size="lg"
                        className="h-12 sm:w-auto"
                        data-testid="final-create-session"
                      >
                        <Link href="/tournament?new=1&mode=rotating">
                          Create a Session
                          <ArrowRight data-icon="inline-end" />
                        </Link>
                      </TextureButton>
                      <Button
                        asChild
                        size="lg"
                        variant="outline"
                        className="h-12 text-base"
                      >
                        <Link href="/tournament?join=1" data-testid="final-join-code">
                          Join with Code
                        </Link>
                      </Button>
                    </div>
                  </div>
                  <div className="flex min-h-80 items-center justify-center border-t border-border/70 bg-foreground p-6 text-background lg:border-l lg:border-t-0">
                    <div className="w-full max-w-sm">
                      <div className="mb-6 flex items-center justify-between">
                        <div>
                          <p className="font-data text-xs uppercase tracking-[0.18em] text-background/60">
                            Launch check
                          </p>
                          <p className="mt-1 font-display text-2xl font-semibold">
                            Court-ready on mobile
                          </p>
                        </div>
                        <Sparkles className="size-6 text-primary" />
                      </div>
                      <div className="grid gap-3">
                        {[
                          "Create session",
                          "Share QR or code",
                          "Track scores live",
                          "Advance the round",
                        ].map((item) => (
                          <div
                            key={item}
                            className="flex items-center gap-3 rounded-2xl border border-background/14 bg-background/8 p-3"
                          >
                            <CheckCircle2 className="size-5 text-primary" />
                            <span className="font-medium">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
