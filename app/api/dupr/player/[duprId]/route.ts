import { NextRequest, NextResponse } from 'next/server';
import { getUserByDuprId, isValidDuprId } from '@/src/lib/dupr/service';
import type { DuprPlayer } from '@/src/lib/dupr/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ duprId: string }> }
) {
  const { duprId } = await params;

  // Validate DUPR ID format
  if (!isValidDuprId(duprId)) {
    return NextResponse.json(
      { error: 'Invalid DUPR ID format' },
      { status: 400 }
    );
  }

  try {
    const profile = await getUserByDuprId(duprId);

    if (!profile) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    // Convert to DuprPlayer format
    const player: DuprPlayer = {
      id: Math.random().toString(36).substring(2, 9),
      name: profile.fullName || `${profile.firstName} ${profile.lastName}`.trim(),
      duprId: profile.duprId,
      duprRating: profile.ratings.doubles ?? undefined,
      duprSinglesRating: profile.ratings.singles ?? undefined,
      duprProvisional: profile.ratings.doublesProvisional,
      duprImageUrl: profile.imageUrl,
      duprVerified: true,
      rating: profile.ratings.doubles ?? undefined,
      gender: profile.gender === 'MALE' ? 'male' : profile.gender === 'FEMALE' ? 'female' : 'other',
    };

    return NextResponse.json(player);
  } catch (error) {
    console.error('Error fetching DUPR player:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player data' },
      { status: 500 }
    );
  }
}
