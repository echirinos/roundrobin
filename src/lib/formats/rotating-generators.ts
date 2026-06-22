/**
 * Rotating Partner Format Generators
 * Generates matchups for formats where partners change each game
 */

import type { LocalPlayer, LocalRoundGame, LocalStanding } from '@/src/types/database';
import type { EventSettings, FormatOptions, PlayerGender } from '@/src/types/formats';

// ============================================
// TYPES
// ============================================

export interface GeneratorContext {
  players: LocalPlayer[];
  existingGames: LocalRoundGame[];
  standings: LocalStanding[];
  currentRound: number;
  settings: EventSettings;
  usedPartnerships: Set<string>;
  courtWeights?: Record<number, number>;
}

export interface GeneratedRound {
  games: LocalRoundGame[];
  byePlayers: LocalPlayer[];
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function getPartnershipKey(id1: string, id2: string): string {
  return [id1, id2].sort().join('-');
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getByeCounts(players: LocalPlayer[], games: LocalRoundGame[]): Map<string, number> {
  const byeCounts = new Map<string, number>();
  players.forEach(p => byeCounts.set(p.id, 0));

  const gamesByRound = games.reduce((acc, g) => {
    if (!acc[g.round]) acc[g.round] = [];
    acc[g.round].push(g);
    return acc;
  }, {} as Record<number, LocalRoundGame[]>);

  for (const roundGames of Object.values(gamesByRound)) {
    const playedIds = new Set<string>();
    roundGames.forEach(g => {
      g.team1.forEach(p => playedIds.add(p.id));
      g.team2.forEach(p => playedIds.add(p.id));
    });

    players.forEach(p => {
      if (!playedIds.has(p.id)) {
        byeCounts.set(p.id, (byeCounts.get(p.id) || 0) + 1);
      }
    });
  }

  return byeCounts;
}

function selectPlayersForRound(
  players: LocalPlayer[],
  games: LocalRoundGame[],
  numberOfCourts: number
): { playing: LocalPlayer[]; byes: LocalPlayer[] } {
  const playersNeeded = numberOfCourts * 4;

  if (players.length <= playersNeeded) {
    return { playing: players, byes: [] };
  }

  // Fair bye system: prioritize players with fewer byes
  const byeCounts = getByeCounts(players, games);

  const sorted = [...players].sort((a, b) => {
    const aCount = byeCounts.get(a.id) || 0;
    const bCount = byeCounts.get(b.id) || 0;
    if (aCount !== bCount) return aCount - bCount; // Fewer byes = play first
    return Math.random() - 0.5; // Randomize ties
  });

  return {
    playing: sorted.slice(0, playersNeeded),
    byes: sorted.slice(playersNeeded),
  };
}

function createGame(
  round: number,
  gameNumber: number,
  courtNumber: number,
  team1: [LocalPlayer, LocalPlayer],
  team2: [LocalPlayer, LocalPlayer]
): LocalRoundGame {
  return {
    id: generateId(),
    round,
    gameNumber,
    courtNumber,
    team1,
    team2,
    completed: false,
  };
}

// ============================================
// POPCORN GENERATOR
// Random matchups with shuffle button support
// ============================================

export function generatePopcornRound(ctx: GeneratorContext): GeneratedRound {
  const { players, existingGames, currentRound, settings } = ctx;
  const numberOfCourts = settings.numberOfCourts;

  const { playing, byes } = selectPlayersForRound(players, existingGames, numberOfCourts);
  const shuffled = shuffleArray(playing);

  const games: LocalRoundGame[] = [];
  let gameNumber = 1;

  for (let court = 1; court <= numberOfCourts && (court - 1) * 4 < shuffled.length; court++) {
    const startIdx = (court - 1) * 4;
    if (startIdx + 3 >= shuffled.length) break;

    const fourPlayers = shuffled.slice(startIdx, startIdx + 4);

    // Random team split
    const shuffledFour = shuffleArray(fourPlayers);
    const team1: [LocalPlayer, LocalPlayer] = [shuffledFour[0], shuffledFour[1]];
    const team2: [LocalPlayer, LocalPlayer] = [shuffledFour[2], shuffledFour[3]];

    games.push(createGame(currentRound, gameNumber++, court, team1, team2));
  }

  return { games, byePlayers: byes };
}

// ============================================
// GAUNTLET GENERATOR
// Seeded matchups where winners face harder opponents
// ============================================

export function generateGauntletRound(ctx: GeneratorContext): GeneratedRound {
  const { players, standings, existingGames, currentRound, settings, usedPartnerships } = ctx;
  const numberOfCourts = settings.numberOfCourts;

  const { playing, byes } = selectPlayersForRound(players, existingGames, numberOfCourts);

  // Sort by current standings (best players first)
  const sorted = [...playing].sort((a, b) => {
    const aStanding = standings.find(s => s.player.id === a.id);
    const bStanding = standings.find(s => s.player.id === b.id);
    const aWins = aStanding?.gamesWon ?? 0;
    const bWins = bStanding?.gamesWon ?? 0;
    return bWins - aWins;
  });

  // Create matchups: top players face each other
  const games: LocalRoundGame[] = [];
  let gameNumber = 1;

  for (let court = 1; court <= numberOfCourts && (court - 1) * 4 < sorted.length; court++) {
    const startIdx = (court - 1) * 4;
    if (startIdx + 3 >= sorted.length) break;

    const fourPlayers = sorted.slice(startIdx, startIdx + 4);

    // Best team split: avoid repeated partnerships if possible
    const bestSplit = findBestTeamSplit(fourPlayers, usedPartnerships);

    games.push(createGame(currentRound, gameNumber++, court, bestSplit.team1, bestSplit.team2));

    // Track partnerships
    usedPartnerships.add(getPartnershipKey(bestSplit.team1[0].id, bestSplit.team1[1].id));
    usedPartnerships.add(getPartnershipKey(bestSplit.team2[0].id, bestSplit.team2[1].id));
  }

  return { games, byePlayers: byes };
}

// ============================================
// UP & DOWN THE RIVER GENERATOR
// Top 2 move up, bottom 2 move down
// ============================================

export function generateUpDownRiverRound(ctx: GeneratorContext): GeneratedRound {
  const { players, standings, existingGames, currentRound, settings, usedPartnerships } = ctx;
  const numberOfCourts = settings.numberOfCourts;
  const playersMovingUp = settings.formatOptions.playersMovingUp ?? 2;
  const playersMovingDown = settings.formatOptions.playersMovingDown ?? 2;

  // Get current court assignments from standings
  const courtAssignments = getCourtAssignmentsFromStandings(standings, numberOfCourts);

  // First round: random assignment
  if (currentRound === 1) {
    return generatePopcornRound(ctx);
  }

  // Process movement from previous round
  const newCourtAssignments = processCourtMovement(
    courtAssignments,
    existingGames,
    currentRound - 1,
    playersMovingUp,
    playersMovingDown,
    numberOfCourts
  );

  // Generate games for each court
  const games: LocalRoundGame[] = [];
  let gameNumber = 1;
  const allAssigned = new Set<string>();

  for (let court = 1; court <= numberOfCourts; court++) {
    const courtPlayers = newCourtAssignments.get(court) || [];

    if (courtPlayers.length >= 4) {
      const bestSplit = findBestTeamSplit(courtPlayers.slice(0, 4), usedPartnerships);
      games.push(createGame(currentRound, gameNumber++, court, bestSplit.team1, bestSplit.team2));
      courtPlayers.slice(0, 4).forEach(p => allAssigned.add(p.id));

      usedPartnerships.add(getPartnershipKey(bestSplit.team1[0].id, bestSplit.team1[1].id));
      usedPartnerships.add(getPartnershipKey(bestSplit.team2[0].id, bestSplit.team2[1].id));
    }
  }

  const byePlayers = players.filter(p => !allAssigned.has(p.id));

  return { games, byePlayers };
}

// ============================================
// KING OF THE COURT GENERATOR
// Winners move up, losers move down
// ============================================

export function generateKingOfCourtRound(ctx: GeneratorContext): GeneratedRound {
  const { players, standings, existingGames, currentRound, settings, usedPartnerships } = ctx;
  const numberOfCourts = settings.numberOfCourts;

  // First round: seed by rating/standings
  if (currentRound === 1) {
    return generateSeededFirstRound(ctx);
  }

  // Get last round's results
  const lastRoundGames = existingGames.filter(g => g.round === currentRound - 1);

  // Process movement: winners up, losers down
  const newCourtAssignments = new Map<number, LocalPlayer[]>();

  for (let court = 1; court <= numberOfCourts; court++) {
    newCourtAssignments.set(court, []);
  }

  for (const game of lastRoundGames) {
    if (!game.completed) continue;

    const team1Won = (game.team1Score ?? 0) > (game.team2Score ?? 0);
    const winners = team1Won ? game.team1 : game.team2;
    const losers = team1Won ? game.team2 : game.team1;

    // Winners move up (or stay if on king court)
    const winnerCourt = Math.max(1, game.courtNumber - 1);
    // Losers move down (or stay if on lowest court)
    const loserCourt = Math.min(numberOfCourts, game.courtNumber + 1);

    const winnerList = newCourtAssignments.get(winnerCourt) || [];
    const loserList = newCourtAssignments.get(loserCourt) || [];

    winnerList.push(...winners);
    loserList.push(...losers);

    newCourtAssignments.set(winnerCourt, winnerList);
    newCourtAssignments.set(loserCourt, loserList);
  }

  // Generate games
  const games: LocalRoundGame[] = [];
  let gameNumber = 1;
  const allAssigned = new Set<string>();

  for (let court = 1; court <= numberOfCourts; court++) {
    const courtPlayers = newCourtAssignments.get(court) || [];

    if (courtPlayers.length >= 4) {
      const selectedFour = courtPlayers.slice(0, 4);
      const bestSplit = findBestTeamSplit(selectedFour, usedPartnerships);
      games.push(createGame(currentRound, gameNumber++, court, bestSplit.team1, bestSplit.team2));
      selectedFour.forEach(p => allAssigned.add(p.id));

      usedPartnerships.add(getPartnershipKey(bestSplit.team1[0].id, bestSplit.team1[1].id));
      usedPartnerships.add(getPartnershipKey(bestSplit.team2[0].id, bestSplit.team2[1].id));
    }
  }

  const byePlayers = players.filter(p => !allAssigned.has(p.id));

  return { games, byePlayers };
}

// ============================================
// CLAIM THE THRONE GENERATOR
// King court winners stay, challengers rotate in
// ============================================

export function generateClaimThroneRound(ctx: GeneratorContext): GeneratedRound {
  const { players, standings, existingGames, currentRound, settings, usedPartnerships } = ctx;
  const numberOfCourts = settings.numberOfCourts;

  // First round: seed by rating/standings
  if (currentRound === 1) {
    return generateSeededFirstRound(ctx);
  }

  // Get last round's results
  const lastRoundGames = existingGames.filter(g => g.round === currentRound - 1);
  const kingCourtGame = lastRoundGames.find(g => g.courtNumber === 1);

  const newCourtAssignments = new Map<number, LocalPlayer[]>();
  for (let court = 1; court <= numberOfCourts; court++) {
    newCourtAssignments.set(court, []);
  }

  // King court: winners stay, losers drop to court 2
  if (kingCourtGame?.completed) {
    const team1Won = (kingCourtGame.team1Score ?? 0) > (kingCourtGame.team2Score ?? 0);
    const winners = team1Won ? kingCourtGame.team1 : kingCourtGame.team2;
    const losers = team1Won ? kingCourtGame.team2 : kingCourtGame.team1;

    newCourtAssignments.get(1)!.push(...winners);
    newCourtAssignments.get(2)!.push(...losers);
  }

  // Other courts: winners move up to challenge
  for (const game of lastRoundGames) {
    if (game.courtNumber === 1 || !game.completed) continue;

    const team1Won = (game.team1Score ?? 0) > (game.team2Score ?? 0);
    const winners = team1Won ? game.team1 : game.team2;
    const losers = team1Won ? game.team2 : game.team1;

    // Winners move up one court (toward king court)
    const winnerCourt = Math.max(1, game.courtNumber - 1);
    // Losers stay or move down
    const loserCourt = Math.min(numberOfCourts, game.courtNumber + 1);

    newCourtAssignments.get(winnerCourt)!.push(...winners);
    newCourtAssignments.get(loserCourt)!.push(...losers);
  }

  // Generate games
  const games: LocalRoundGame[] = [];
  let gameNumber = 1;
  const allAssigned = new Set<string>();

  for (let court = 1; court <= numberOfCourts; court++) {
    const courtPlayers = newCourtAssignments.get(court) || [];

    if (courtPlayers.length >= 4) {
      const selectedFour = courtPlayers.slice(0, 4);
      const bestSplit = findBestTeamSplit(selectedFour, usedPartnerships);
      games.push(createGame(currentRound, gameNumber++, court, bestSplit.team1, bestSplit.team2));
      selectedFour.forEach(p => allAssigned.add(p.id));

      usedPartnerships.add(getPartnershipKey(bestSplit.team1[0].id, bestSplit.team1[1].id));
      usedPartnerships.add(getPartnershipKey(bestSplit.team2[0].id, bestSplit.team2[1].id));
    }
  }

  const byePlayers = players.filter(p => !allAssigned.has(p.id));

  return { games, byePlayers };
}

// ============================================
// CREAM OF THE CROP GENERATOR
// Two-phase: sorting then competition
// ============================================

export function generateCreamOfCropRound(ctx: GeneratorContext): GeneratedRound {
  const { currentRound, settings } = ctx;
  const sortingRounds = settings.formatOptions.sortingRounds ?? 3;

  // Phase 1: Sorting phase (random like Popcorn)
  if (currentRound <= sortingRounds) {
    return generatePopcornRound(ctx);
  }

  // Phase 2: Competition phase (like King of Court but players stay on assigned courts)
  return generateKingOfCourtRound(ctx);
}

// ============================================
// DOUBLE HEADER GENERATOR
// 2 games with same partner before rotating
// ============================================

export function generateDoubleHeaderRound(ctx: GeneratorContext): GeneratedRound {
  const { players, existingGames, currentRound, settings, usedPartnerships } = ctx;
  const numberOfCourts = settings.numberOfCourts;
  const gamesPerPartnership = settings.formatOptions.gamesPerPartnership ?? 2;

  const { playing, byes } = selectPlayersForRound(players, existingGames, numberOfCourts);
  const shuffled = shuffleArray(playing);

  const games: LocalRoundGame[] = [];
  let gameNumber = 1;

  for (let court = 1; court <= numberOfCourts && (court - 1) * 4 < shuffled.length; court++) {
    const startIdx = (court - 1) * 4;
    if (startIdx + 3 >= shuffled.length) break;

    const fourPlayers = shuffled.slice(startIdx, startIdx + 4);
    const bestSplit = findBestTeamSplit(fourPlayers, usedPartnerships);

    // Create multiple games with same partnership
    for (let g = 0; g < gamesPerPartnership; g++) {
      games.push(createGame(currentRound, gameNumber++, court, bestSplit.team1, bestSplit.team2));
    }

    usedPartnerships.add(getPartnershipKey(bestSplit.team1[0].id, bestSplit.team1[1].id));
    usedPartnerships.add(getPartnershipKey(bestSplit.team2[0].id, bestSplit.team2[1].id));
  }

  return { games, byePlayers: byes };
}

// ============================================
// MIXED MADNESS GENERATOR
// Gender-balanced mixed doubles
// ============================================

export function generateMixedMadnessRound(ctx: GeneratorContext): GeneratedRound {
  const { players, existingGames, currentRound, settings, usedPartnerships } = ctx;
  const numberOfCourts = settings.numberOfCourts;
  const genderBalanceMode = settings.formatOptions.genderBalanceMode ?? 'strict';

  // Separate players by gender
  const males = players.filter(p => p.gender === 'male');
  const females = players.filter(p => p.gender === 'female');
  const others = players.filter(p => !p.gender || p.gender === 'other' || p.gender === 'prefer_not_to_say');

  // Determine how many mixed teams we can make
  const minGenderCount = Math.min(males.length, females.length);
  const mixedTeamsAvailable = Math.floor(minGenderCount / 2) * 2; // Must be even

  const games: LocalRoundGame[] = [];
  let gameNumber = 1;
  const assignedPlayers = new Set<string>();

  if (genderBalanceMode === 'strict' && mixedTeamsAvailable >= 4) {
    // Strict mode: all teams must be mixed
    const shuffledMales = shuffleArray(males);
    const shuffledFemales = shuffleArray(females);

    for (let court = 1; court <= numberOfCourts; court++) {
      const maleIdx = (court - 1) * 2;
      const femaleIdx = (court - 1) * 2;

      if (maleIdx + 1 >= shuffledMales.length || femaleIdx + 1 >= shuffledFemales.length) break;

      const team1: [LocalPlayer, LocalPlayer] = [shuffledMales[maleIdx], shuffledFemales[femaleIdx]];
      const team2: [LocalPlayer, LocalPlayer] = [shuffledMales[maleIdx + 1], shuffledFemales[femaleIdx + 1]];

      games.push(createGame(currentRound, gameNumber++, court, team1, team2));

      [team1[0], team1[1], team2[0], team2[1]].forEach(p => assignedPlayers.add(p.id));
      usedPartnerships.add(getPartnershipKey(team1[0].id, team1[1].id));
      usedPartnerships.add(getPartnershipKey(team2[0].id, team2[1].id));
    }
  } else {
    // Flexible mode: try to balance but allow same-gender teams if needed
    return generatePopcornRound(ctx);
  }

  const byePlayers = players.filter(p => !assignedPlayers.has(p.id));

  return { games, byePlayers };
}

// ============================================
// SCRAMBLE GENERATOR
// Groups of 4-5 players per court, rotating within group
// ============================================

export function generateScrambleRound(ctx: GeneratorContext): GeneratedRound {
  const { players, existingGames, currentRound, settings, usedPartnerships } = ctx;
  const numberOfCourts = settings.numberOfCourts;
  const playersPerGroup = settings.formatOptions.playersPerGroup ?? 4;

  // First round: assign players to court groups
  if (currentRound === 1) {
    const shuffled = shuffleArray(players);
    const courtGroups = new Map<number, LocalPlayer[]>();

    for (let i = 0; i < shuffled.length; i++) {
      const court = (i % numberOfCourts) + 1;
      if (!courtGroups.has(court)) courtGroups.set(court, []);
      courtGroups.get(court)!.push(shuffled[i]);
    }

    const games: LocalRoundGame[] = [];
    let gameNumber = 1;
    const assignedPlayers = new Set<string>();

    for (let court = 1; court <= numberOfCourts; court++) {
      const group = courtGroups.get(court) || [];
      if (group.length >= 4) {
        const selectedFour = group.slice(0, 4);
        const bestSplit = findBestTeamSplit(selectedFour, usedPartnerships);
        games.push(createGame(currentRound, gameNumber++, court, bestSplit.team1, bestSplit.team2));
        selectedFour.forEach(p => assignedPlayers.add(p.id));

        usedPartnerships.add(getPartnershipKey(bestSplit.team1[0].id, bestSplit.team1[1].id));
        usedPartnerships.add(getPartnershipKey(bestSplit.team2[0].id, bestSplit.team2[1].id));
      }
    }

    const byePlayers = players.filter(p => !assignedPlayers.has(p.id));
    return { games, byePlayers };
  }

  // Subsequent rounds: keep same groups, rotate partners within
  // Get court assignments from last round
  const lastRoundGames = existingGames.filter(g => g.round === currentRound - 1);
  const courtGroups = new Map<number, LocalPlayer[]>();

  for (const game of lastRoundGames) {
    if (!courtGroups.has(game.courtNumber)) {
      courtGroups.set(game.courtNumber, []);
    }
    const group = courtGroups.get(game.courtNumber)!;
    game.team1.forEach(p => {
      if (!group.some(g => g.id === p.id)) group.push(p);
    });
    game.team2.forEach(p => {
      if (!group.some(g => g.id === p.id)) group.push(p);
    });
  }

  const games: LocalRoundGame[] = [];
  let gameNumber = 1;
  const assignedPlayers = new Set<string>();

  for (let court = 1; court <= numberOfCourts; court++) {
    const group = courtGroups.get(court) || [];
    if (group.length >= 4) {
      const selectedFour = group.slice(0, 4);
      const bestSplit = findBestTeamSplit(selectedFour, usedPartnerships);
      games.push(createGame(currentRound, gameNumber++, court, bestSplit.team1, bestSplit.team2));
      selectedFour.forEach(p => assignedPlayers.add(p.id));

      usedPartnerships.add(getPartnershipKey(bestSplit.team1[0].id, bestSplit.team1[1].id));
      usedPartnerships.add(getPartnershipKey(bestSplit.team2[0].id, bestSplit.team2[1].id));
    }
  }

  const byePlayers = players.filter(p => !assignedPlayers.has(p.id));
  return { games, byePlayers };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function findBestTeamSplit(
  fourPlayers: LocalPlayer[],
  usedPartnerships: Set<string>
): { team1: [LocalPlayer, LocalPlayer]; team2: [LocalPlayer, LocalPlayer] } {
  // All possible ways to split 4 players into 2 teams
  const splits = [
    { team1: [fourPlayers[0], fourPlayers[1]] as [LocalPlayer, LocalPlayer], team2: [fourPlayers[2], fourPlayers[3]] as [LocalPlayer, LocalPlayer] },
    { team1: [fourPlayers[0], fourPlayers[2]] as [LocalPlayer, LocalPlayer], team2: [fourPlayers[1], fourPlayers[3]] as [LocalPlayer, LocalPlayer] },
    { team1: [fourPlayers[0], fourPlayers[3]] as [LocalPlayer, LocalPlayer], team2: [fourPlayers[1], fourPlayers[2]] as [LocalPlayer, LocalPlayer] },
  ];

  let bestSplit = splits[0];
  let bestScore = -1;

  for (const split of splits) {
    const key1 = getPartnershipKey(split.team1[0].id, split.team1[1].id);
    const key2 = getPartnershipKey(split.team2[0].id, split.team2[1].id);

    let score = 0;
    if (!usedPartnerships.has(key1)) score += 2;
    if (!usedPartnerships.has(key2)) score += 2;
    score += Math.random() * 0.5; // Add randomness for variety

    if (score > bestScore) {
      bestScore = score;
      bestSplit = split;
    }
  }

  return bestSplit;
}

function generateSeededFirstRound(ctx: GeneratorContext): GeneratedRound {
  const { players, standings, currentRound, settings, usedPartnerships } = ctx;
  const numberOfCourts = settings.numberOfCourts;

  // Sort by rating or previous standings
  const sorted = [...players].sort((a, b) => {
    const aRating = a.rating ?? 0;
    const bRating = b.rating ?? 0;
    const aStanding = standings.find(s => s.player.id === a.id);
    const bStanding = standings.find(s => s.player.id === b.id);
    const aWins = aStanding?.gamesWon ?? 0;
    const bWins = bStanding?.gamesWon ?? 0;

    // Primary: rating, Secondary: wins
    if (bRating !== aRating) return bRating - aRating;
    return bWins - aWins;
  });

  const games: LocalRoundGame[] = [];
  let gameNumber = 1;
  const assignedPlayers = new Set<string>();

  for (let court = 1; court <= numberOfCourts; court++) {
    const startIdx = (court - 1) * 4;
    if (startIdx + 3 >= sorted.length) break;

    const fourPlayers = sorted.slice(startIdx, startIdx + 4);
    const bestSplit = findBestTeamSplit(fourPlayers, usedPartnerships);

    games.push(createGame(currentRound, gameNumber++, court, bestSplit.team1, bestSplit.team2));
    fourPlayers.forEach(p => assignedPlayers.add(p.id));

    usedPartnerships.add(getPartnershipKey(bestSplit.team1[0].id, bestSplit.team1[1].id));
    usedPartnerships.add(getPartnershipKey(bestSplit.team2[0].id, bestSplit.team2[1].id));
  }

  const byePlayers = players.filter(p => !assignedPlayers.has(p.id));

  return { games, byePlayers };
}

function getCourtAssignmentsFromStandings(
  standings: LocalStanding[],
  numberOfCourts: number
): Map<number, LocalPlayer[]> {
  const assignments = new Map<number, LocalPlayer[]>();

  for (let court = 1; court <= numberOfCourts; court++) {
    assignments.set(court, []);
  }

  // Distribute players to courts based on standings
  standings.forEach((standing, index) => {
    const court = Math.min(Math.floor(index / 4) + 1, numberOfCourts);
    assignments.get(court)!.push(standing.player);
  });

  return assignments;
}

function processCourtMovement(
  currentAssignments: Map<number, LocalPlayer[]>,
  games: LocalRoundGame[],
  lastRound: number,
  movingUp: number,
  movingDown: number,
  numberOfCourts: number
): Map<number, LocalPlayer[]> {
  const newAssignments = new Map<number, LocalPlayer[]>();

  for (let court = 1; court <= numberOfCourts; court++) {
    newAssignments.set(court, []);
  }

  const lastRoundGames = games.filter(g => g.round === lastRound);

  for (const game of lastRoundGames) {
    if (!game.completed) continue;

    // Sort players by their performance in this game
    const allPlayers = [...game.team1, ...game.team2];
    const team1Won = (game.team1Score ?? 0) > (game.team2Score ?? 0);

    // Winners first, then losers
    const sorted = team1Won
      ? [...game.team1, ...game.team2]
      : [...game.team2, ...game.team1];

    // Top X move up
    sorted.slice(0, movingUp).forEach(p => {
      const newCourt = Math.max(1, game.courtNumber - 1);
      newAssignments.get(newCourt)!.push(p);
    });

    // Middle stays
    sorted.slice(movingUp, 4 - movingDown).forEach(p => {
      newAssignments.get(game.courtNumber)!.push(p);
    });

    // Bottom X move down
    sorted.slice(4 - movingDown).forEach(p => {
      const newCourt = Math.min(numberOfCourts, game.courtNumber + 1);
      newAssignments.get(newCourt)!.push(p);
    });
  }

  return newAssignments;
}

// ============================================
// MAIN GENERATOR DISPATCHER
// ============================================

export function generateRound(ctx: GeneratorContext): GeneratedRound {
  const format = ctx.settings.format;

  switch (format) {
    case 'popcorn':
      return generatePopcornRound(ctx);
    case 'gauntlet':
      return generateGauntletRound(ctx);
    case 'up_down_river':
      return generateUpDownRiverRound(ctx);
    case 'king_of_court':
      return generateKingOfCourtRound(ctx);
    case 'claim_throne':
      return generateClaimThroneRound(ctx);
    case 'cream_crop':
      return generateCreamOfCropRound(ctx);
    case 'double_header':
      return generateDoubleHeaderRound(ctx);
    case 'mixed_madness':
      return generateMixedMadnessRound(ctx);
    case 'scramble':
      return generateScrambleRound(ctx);
    case 'round_robin':
    default:
      return generatePopcornRound(ctx);
  }
}
