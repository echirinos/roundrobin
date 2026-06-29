import { NextRequest, NextResponse } from "next/server";
import { getSessionStats } from "@/src/lib/live-session";
import { checkInPlayer } from "@/src/lib/live-session-store";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const start = Date.now();

  try {
    const body = await request.json();
    const playerId = typeof body.playerId === "string" ? body.playerId : "";

    if (!playerId) {
      return NextResponse.json(
        { error: "Player is required for check-in" },
        { status: 400 }
      );
    }

    const record = checkInPlayer(code, playerId);

    if (!record) {
      console.warn(
        JSON.stringify({
          level: "warn",
          event: "player_check_in_not_found",
          route: "/api/sessions/[code]/check-in",
          requestId: request.headers.get("x-vercel-id"),
          ms: Date.now() - start,
        })
      );

      return NextResponse.json(
        { error: "Session or player not found" },
        { status: 404 }
      );
    }

    const stats = getSessionStats(record.snapshot);

    console.log(
      JSON.stringify({
        level: "info",
        event: "player_checked_in",
        route: "/api/sessions/[code]/check-in",
        requestId: request.headers.get("x-vercel-id"),
        ms: Date.now() - start,
        checkedInPlayers: stats.checkedInPlayers,
        totalPlayers: stats.totalPlayers,
        tournamentStarted: record.snapshot.tournamentStarted,
      })
    );

    return NextResponse.json(record);
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "player_check_in_failed",
        route: "/api/sessions/[code]/check-in",
        requestId: request.headers.get("x-vercel-id"),
        ms: Date.now() - start,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    );

    return NextResponse.json(
      { error: "Failed to check in" },
      { status: 500 }
    );
  }
}
