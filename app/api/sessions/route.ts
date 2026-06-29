import { NextRequest, NextResponse } from "next/server";
import { getSessionStats, isLiveTournamentSnapshot } from "@/src/lib/live-session";
import { upsertLiveSession } from "@/src/lib/live-session-store";

export async function POST(request: NextRequest) {
  const start = Date.now();

  try {
    const body = await request.json();
    const snapshot = body.snapshot ?? body.state;

    if (!isLiveTournamentSnapshot(snapshot)) {
      return NextResponse.json(
        { error: "Invalid live tournament snapshot" },
        { status: 400 }
      );
    }

    const record = upsertLiveSession(snapshot, body.code);
    const stats = getSessionStats(snapshot);

    console.log(
      JSON.stringify({
        level: "info",
        event: "live_session_published",
        route: "/api/sessions",
        requestId: request.headers.get("x-vercel-id"),
        ms: Date.now() - start,
        playerCount: stats.totalPlayers,
        checkedInPlayers: stats.checkedInPlayers,
        gameCount: stats.totalGames,
        completedGames: stats.completedGames,
        format: snapshot.settings.format,
        partnerMode: snapshot.settings.partnerMode,
        numberOfCourts: snapshot.settings.numberOfCourts,
        tournamentStarted: snapshot.tournamentStarted,
      })
    );

    return NextResponse.json(record);
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "live_session_publish_failed",
        route: "/api/sessions",
        requestId: request.headers.get("x-vercel-id"),
        ms: Date.now() - start,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    );

    return NextResponse.json(
      { error: "Failed to publish live session" },
      { status: 500 }
    );
  }
}
