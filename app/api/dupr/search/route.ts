import { NextRequest, NextResponse } from 'next/server';
import { searchPlayers } from '@/src/lib/dupr/service';
import type { DuprPlayer } from '@/src/lib/dupr/types';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: 'Search query must be at least 2 characters' },
      { status: 400 }
    );
  }

  try {
    const results = await searchPlayers(query, Math.min(limit, 25));

    // Convert to DuprPlayer format
    const players: DuprPlayer[] = results.map((result) => ({
      id: Math.random().toString(36).substring(2, 9),
      name: result.fullName,
      duprId: result.duprId,
      duprRating: result.ratings.doubles ?? undefined,
      duprSinglesRating: result.ratings.singles ?? undefined,
      duprProvisional: result.ratings.doublesProvisional,
      duprImageUrl: result.imageUrl,
      duprVerified: true,
      rating: result.ratings.doubles ?? undefined,
    }));

    return NextResponse.json(players);
  } catch (error) {
    console.error('Error searching DUPR players:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
