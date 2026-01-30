import { Player, Match, PlayerStanding } from "./types";

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Generate round robin schedule where partners rotate each round
// Uses a modified circle method to ensure variety in partnerships
export function generateRoundRobinSchedule(
  players: Player[],
  existingMatches: Match[] = [],
  startRound: number = 1
): Match[] {
  const n = players.length;
  if (n < 4) return [];

  const matches: Match[] = [];

  // Track which partnerships have been used
  const usedPartnerships = new Set<string>();
  existingMatches.forEach(m => {
    usedPartnerships.add(getPartnershipKey(m.team1[0].id, m.team1[1].id));
    usedPartnerships.add(getPartnershipKey(m.team2[0].id, m.team2[1].id));
  });

  // Calculate how many matches per round (floor of n/4 games, each game needs 4 players)
  const playersPerRound = Math.floor(n / 4) * 4;
  const matchesPerRound = playersPerRound / 4;

  // Generate one round of matches
  const availablePlayers = [...players];
  const roundMatches: Match[] = [];
  const usedThisRound = new Set<string>();

  // Try to create matches with new partnerships
  for (let m = 0; m < matchesPerRound; m++) {
    const available = availablePlayers.filter(p => !usedThisRound.has(p.id));
    if (available.length < 4) break;

    // Find best pairing (prefer new partnerships)
    const match = findBestMatch(available, usedPartnerships, usedThisRound);
    if (match) {
      roundMatches.push({
        id: generateId(),
        round: startRound,
        team1: match.team1,
        team2: match.team2,
        completed: false,
      });
      match.team1.forEach(p => usedThisRound.add(p.id));
      match.team2.forEach(p => usedThisRound.add(p.id));
      usedPartnerships.add(getPartnershipKey(match.team1[0].id, match.team1[1].id));
      usedPartnerships.add(getPartnershipKey(match.team2[0].id, match.team2[1].id));
    }
  }

  return roundMatches;
}

function getPartnershipKey(id1: string, id2: string): string {
  return [id1, id2].sort().join("-");
}

function findBestMatch(
  available: Player[],
  usedPartnerships: Set<string>,
  usedThisRound: Set<string>
): { team1: [Player, Player]; team2: [Player, Player] } | null {
  const validPlayers = available.filter(p => !usedThisRound.has(p.id));
  if (validPlayers.length < 4) return null;

  // Score all possible team combinations
  let bestMatch: { team1: [Player, Player]; team2: [Player, Player] } | null = null;
  let bestScore = -1;

  // Try different combinations
  for (let i = 0; i < validPlayers.length; i++) {
    for (let j = i + 1; j < validPlayers.length; j++) {
      for (let k = j + 1; k < validPlayers.length; k++) {
        for (let l = k + 1; l < validPlayers.length; l++) {
          const four = [validPlayers[i], validPlayers[j], validPlayers[k], validPlayers[l]];

          // Try all ways to split 4 players into 2 teams
          const splits = [
            { team1: [four[0], four[1]] as [Player, Player], team2: [four[2], four[3]] as [Player, Player] },
            { team1: [four[0], four[2]] as [Player, Player], team2: [four[1], four[3]] as [Player, Player] },
            { team1: [four[0], four[3]] as [Player, Player], team2: [four[1], four[2]] as [Player, Player] },
          ];

          for (const split of splits) {
            const key1 = getPartnershipKey(split.team1[0].id, split.team1[1].id);
            const key2 = getPartnershipKey(split.team2[0].id, split.team2[1].id);

            // Score: prefer new partnerships
            let score = 0;
            if (!usedPartnerships.has(key1)) score += 2;
            if (!usedPartnerships.has(key2)) score += 2;

            // Add some randomness for variety
            score += Math.random() * 0.5;

            if (score > bestScore) {
              bestScore = score;
              bestMatch = split;
            }
          }
        }
      }
    }
  }

  return bestMatch;
}

export function generateNextRound(
  players: Player[],
  existingMatches: Match[]
): Match[] {
  const currentRound = existingMatches.length > 0
    ? Math.max(...existingMatches.map(m => m.round))
    : 0;

  return generateRoundRobinSchedule(players, existingMatches, currentRound + 1);
}

export function calculateStandings(
  players: Player[],
  matches: Match[]
): PlayerStanding[] {
  const standings = new Map<string, PlayerStanding>();

  // Initialize standings for all players
  players.forEach((player) => {
    standings.set(player.id, {
      player,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDiff: 0,
      gamesPlayed: 0,
    });
  });

  // Calculate from completed matches
  matches
    .filter((m) => m.completed && m.score1 !== undefined && m.score2 !== undefined)
    .forEach((match) => {
      const team1Won = match.score1! > match.score2!;

      // Update team1 players
      match.team1.forEach(player => {
        const standing = standings.get(player.id);
        if (standing) {
          standing.gamesPlayed++;
          standing.pointsFor += match.score1!;
          standing.pointsAgainst += match.score2!;
          if (team1Won) {
            standing.wins++;
          } else if (match.score2! > match.score1!) {
            standing.losses++;
          }
        }
      });

      // Update team2 players
      match.team2.forEach(player => {
        const standing = standings.get(player.id);
        if (standing) {
          standing.gamesPlayed++;
          standing.pointsFor += match.score2!;
          standing.pointsAgainst += match.score1!;
          if (!team1Won && match.score2! > match.score1!) {
            standing.wins++;
          } else if (team1Won) {
            standing.losses++;
          }
        }
      });
    });

  // Calculate point differentials
  standings.forEach((standing) => {
    standing.pointDiff = standing.pointsFor - standing.pointsAgainst;
  });

  // Sort by: Wins (desc) -> Point Diff (desc) -> Points For (desc)
  return Array.from(standings.values()).sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
    return b.pointsFor - a.pointsFor;
  });
}
