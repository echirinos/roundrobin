import { NextRequest, NextResponse } from "next/server";
import { isLiveTournamentSnapshot } from "@/src/lib/live-session";
import { getLiveSession, upsertLiveSession } from "@/src/lib/live-session-store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const record = getLiveSession(code);

  if (!record) {
    return NextResponse.json(
      { error: "Live session not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(record);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  try {
    const body = await request.json();
    const snapshot = body.snapshot ?? body.state;

    if (!isLiveTournamentSnapshot(snapshot)) {
      return NextResponse.json(
        { error: "Invalid live tournament snapshot" },
        { status: 400 }
      );
    }

    const record = upsertLiveSession(snapshot, code);

    return NextResponse.json(record);
  } catch (error) {
    console.error("Failed to update live session:", error);

    return NextResponse.json(
      { error: "Failed to update live session" },
      { status: 500 }
    );
  }
}
