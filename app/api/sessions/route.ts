import { NextRequest, NextResponse } from "next/server";
import { isLiveTournamentSnapshot } from "@/src/lib/live-session";
import { upsertLiveSession } from "@/src/lib/live-session-store";

export async function POST(request: NextRequest) {
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

    return NextResponse.json(record);
  } catch (error) {
    console.error("Failed to publish live session:", error);

    return NextResponse.json(
      { error: "Failed to publish live session" },
      { status: 500 }
    );
  }
}
