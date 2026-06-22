import { NextRequest, NextResponse } from "next/server";
import { checkInPlayer } from "@/src/lib/live-session-store";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

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
      return NextResponse.json(
        { error: "Session or player not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error("Failed to check in player:", error);

    return NextResponse.json(
      { error: "Failed to check in" },
      { status: 500 }
    );
  }
}
