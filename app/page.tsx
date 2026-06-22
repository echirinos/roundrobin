"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

const features = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    title: "Rotating Partners",
    description: "Everyone plays with everyone. Our algorithm ensures fair matchups and maximizes variety.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: "Live Standings",
    description: "Real-time leaderboard with animated rank changes. Track wins, point differential, and more.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Instant Setup",
    description: "Add players, pick a format, and start playing in under 60 seconds. No sign-up required.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    title: "Any Group Size",
    description: "Works with 4 to 32+ players. Smart bye management when you have odd numbers.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: "Multi-Court Support",
    description: "Running multiple courts? We handle parallel games and keep everything synchronized.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    title: "Mobile First",
    description: "Designed for phones. Enter scores courtside without switching between apps.",
  },
];

const formats = [
  {
    name: "Popcorn",
    description: "Classic rotating partners format",
    players: "4-16",
  },
  {
    name: "King of the Court",
    description: "Winners move up, losers move down",
    players: "8-32",
  },
  {
    name: "Mixer",
    description: "Social play with fair matchups",
    players: "4-24",
  },
];

const steps = [
  {
    number: "1",
    title: "Add Players",
    description: "Enter names or import from DUPR. Drag to reorder seeding.",
  },
  {
    number: "2",
    title: "Pick Format",
    description: "Choose from Popcorn, King of the Court, Mixer, and more.",
  },
  {
    number: "3",
    title: "Generate Rounds",
    description: "Tap to create matchups. Our algorithm handles the rest.",
  },
  {
    number: "4",
    title: "Enter Scores",
    description: "Tap any match to enter the score. Standings update live.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="hero-gradient absolute inset-0" />
        <div className="bg-grid absolute inset-0" />
        <div className="container relative mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32 lg:py-40">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Start pickleball play{" "}
              <span className="text-gradient">from your phone</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              Open it courtside, add names, and generate the first round.
              No sign-up, no spreadsheet, no app download.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/tournament?new=1&mode=rotating" className="w-full sm:w-auto">
                <Button size="lg" className="h-12 px-8 text-base font-semibold">
                  Start round robin
                  <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Button>
              </Link>
              <Link href="/tournament?new=1&mode=fixed" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="h-12 px-8 text-base font-semibold">
                  Start set teams
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Built for iPhone and Android browsers at the courts.
            </p>
          </div>
        </div>
      </section>

      {/* Formats Preview */}
      <section className="border-y border-border/40 bg-muted/30">
        <div className="container mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            {formats.map((format) => (
              <div key={format.name} className="text-center">
                <p className="text-lg font-semibold">{format.name}</p>
                <p className="text-sm text-muted-foreground">{format.players} players</p>
              </div>
            ))}
            <Link href="/tournament?new=1&mode=rotating" className="text-sm font-medium text-primary hover:underline">
              View all formats &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 sm:py-32">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-4">Features</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to run the perfect tournament
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Built by pickleball players, for pickleball players. We obsess over the details so you can focus on playing.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Card key={index} className="border-border/50 bg-card/50 transition-colors hover:bg-card">
                <CardContent className="pt-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-t border-border/40 bg-muted/30 py-24 sm:py-32">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-4">How It Works</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              From zero to playing in 4 steps
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              No accounts. No downloads. Just open the app and start playing.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                {index < steps.length - 1 && (
                  <div className="absolute left-8 top-8 hidden h-0.5 w-full bg-border lg:block" />
                )}
                <div className="relative flex flex-col items-center text-center lg:items-start lg:text-left">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                    {step.number}
                  </div>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-16 text-center">
            <Link href="/tournament?new=1&mode=rotating">
              <Button size="lg" className="h-12 px-8 text-base font-semibold">
                Try It Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-24 sm:py-32">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Loved by players everywhere
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Join thousands of players who have upgraded their pickleball experience.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                quote: "Finally, an app that just works. We use it every week for our club round robin.",
                author: "Mike T.",
                role: "Club Organizer, Phoenix AZ",
              },
              {
                quote: "The rotating partners feature is genius. Everyone gets to play with everyone.",
                author: "Sarah L.",
                role: "Recreation Director",
              },
              {
                quote: "Setup is instant. No more spreadsheets or writing on whiteboards.",
                author: "James K.",
                role: "Tournament Director",
              },
            ].map((testimonial, index) => (
              <Card key={index} className="border-border/50">
                <CardContent className="pt-6">
                  <div className="flex gap-1 text-primary">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="h-5 w-5 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="mt-4 text-foreground">&ldquo;{testimonial.quote}&rdquo;</p>
                  <div className="mt-4">
                    <p className="font-semibold">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border/40 bg-primary py-24 sm:py-32">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
              Ready to level up your pickleball?
            </h2>
            <p className="mt-4 text-lg text-primary-foreground/80">
              Start your first tournament in under a minute. Free forever.
            </p>
            <div className="mt-10">
              <Link href="/tournament?new=1&mode=rotating">
                <Button size="lg" variant="secondary" className="h-12 px-8 text-base font-semibold">
                  Start round robin
                  <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
