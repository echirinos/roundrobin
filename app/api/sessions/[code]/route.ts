import { NextRequest, NextResponse } from "next/server";
import { getSessionStats, isLiveTournamentSnapshot } from "@/src/lib/live-session";
import {
  UnauthorizedSessionWriteError,
  getLiveSession,
  toPublicRecord,
  upsertLiveSession,
} from "@/src/lib/live-session-store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const record = await getLiveSession(code);

  if (!record) {
    return NextResponse.json(
      { error: "Live session not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(toPublicRecord(record));
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
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

    const providedToken = request.headers.get("x-organizer-token");

    if (!providedToken) {
      return NextResponse.json(
        { error: "Organizer token required" },
        { status: 401 }
      );
    }

    const record = await upsertLiveSession(snapshot, code, providedToken);
    const stats = getSessionStats(snapshot);

    console.log(
      JSON.stringify({
        level: "info",
        event: "live_session_updated",
        route: "/api/sessions/[code]",
        requestId: request.headers.get("x-vercel-id"),
        ms: Date.now() - start,
        playerCount: stats.totalPlayers,
        checkedInPlayers: stats.checkedInPlayers,
        gameCount: stats.totalGames,
        completedGames: stats.completedGames,
        currentRound: snapshot.currentRound,
        format: snapshot.settings.format,
        partnerMode: snapshot.settings.partnerMode,
        numberOfCourts: snapshot.settings.numberOfCourts,
        tournamentStarted: snapshot.tournamentStarted,
      })
    );

    return NextResponse.json(toPublicRecord(record));
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
        event: "live_session_update_failed",
        route: "/api/sessions/[code]",
        requestId: request.headers.get("x-vercel-id"),
        ms: Date.now() - start,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    );

    return NextResponse.json(
      { error: "Failed to update live session" },
      { status: 500 }
    );
  }
}
