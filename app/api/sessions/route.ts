import { NextRequest, NextResponse } from "next/server";
import { getSessionStats, isLiveTournamentSnapshot } from "@/src/lib/live-session";
import {
  UnauthorizedSessionWriteError,
  toPublicRecord,
  upsertLiveSession,
} from "@/src/lib/live-session-store";

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

    const providedToken =
      request.headers.get("x-organizer-token") ||
      (typeof body.organizerToken === "string" ? body.organizerToken : null);
    const record = await upsertLiveSession(snapshot, body.code, providedToken);
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

    return NextResponse.json({
      ...toPublicRecord(record),
      organizerToken: record.organizerToken,
    });
  } catch (error) {
    if (error instanceof UnauthorizedSessionWriteError) {
      return NextResponse.json(
        { error: "This session code belongs to another organizer." },
        { status: 403 }
      );
    }

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
