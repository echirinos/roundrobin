/**
 * Fixed Partner Format Generators
 * Generates matchups for formats where teams stay together
 */

import type { LocalPlayer, LocalRoundGame } from '@/src/types/database';
import type { EventSettings } from '@/src/types/formats';
import { calculateWinPercentageDisplay, getHeadToHeadRecord } from './scoring';

// ============================================
// TYPES
// ============================================

export interface Team {
  id: string;
  name: string;
  players: [LocalPlayer, LocalPlayer];
  seed?: number;
  rating?: number;
  poolId?: string;
}

export interface Pool {
  id: string;
  name: string;
  teams: Team[];
}

export interface BracketMatch {
  id: string;
  round: number;
  matchNumber: number;
  team1?: Team;
  team2?: Team;
  team1Score?: number;
  team2Score?: number;
  winner?: Team;
  bracketType: 'main' | 'consolation' | 'winners' | 'losers';
  completed: boolean;
}

export interface FixedGeneratorContext {
  teams: Team[];
  existingGames: LocalRoundGame[];
  pools?: Pool[];
  bracket?: BracketMatch[];
  currentRound: number;
  settings: EventSettings;
}

export interface GeneratedFixedRound {
  games: LocalRoundGame[];
  byeTeams: Team[];
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function createGameFromTeams(
  round: number,
  gameNumber: number,
  courtNumber: number,
  team1: Team,
  team2: Team
): LocalRoundGame {
  return {
    id: generateId(),
    round,
    gameNumber,
    courtNumber,
    team1: team1.players,
    team2: team2.players,
    completed: false,
  };
}

// ============================================
// TEAM CREATION HELPERS
// ============================================

export function createTeamsFromPlayers(players: LocalPlayer[]): Team[] {
  if (players.length % 2 !== 0) {
    throw new Error('Need even number of players to create teams');
  }

  const teams: Team[] = [];

  for (let i = 0; i < players.length; i += 2) {
    const p1 = players[i];
    const p2 = players[i + 1];

    teams.push({
      id: generateId(),
      name: `${p1.name} & ${p2.name}`,
      players: [p1, p2],
      rating: ((p1.rating ?? 0) + (p2.rating ?? 0)) / 2,
    });
  }

  return teams;
}

export function createTeamsWithPartners(
  partnerships: Array<[LocalPlayer, LocalPlayer]>
): Team[] {
  return partnerships.map(([p1, p2]) => ({
    id: generateId(),
    name: `${p1.name} & ${p2.name}`,
    players: [p1, p2],
    rating: ((p1.rating ?? 0) + (p2.rating ?? 0)) / 2,
  }));
}

// ============================================
// POOL PLAY GENERATOR
// Round robin in pools + optional bracket
// ============================================

export function createPools(teams: Team[], poolCount: number): Pool[] {
  // Sort teams by seed/rating for snake seeding
  const sortedTeams = [...teams].sort((a, b) => {
    if (a.seed && b.seed) return a.seed - b.seed;
    return (b.rating ?? 0) - (a.rating ?? 0);
  });

  const pools: Pool[] = [];
  for (let i = 0; i < poolCount; i++) {
    pools.push({
      id: generateId(),
      name: `Pool ${String.fromCharCode(65 + i)}`, // Pool A, B, C, etc.
      teams: [],
    });
  }

  // Snake seeding: 1→A, 2→B, 3→B, 4→A, etc.
  let direction = 1;
  let poolIndex = 0;

  for (const team of sortedTeams) {
    pools[poolIndex].teams.push({ ...team, poolId: pools[poolIndex].id });
    poolIndex += direction;

    if (poolIndex >= poolCount || poolIndex < 0) {
      direction *= -1;
      poolIndex += direction;
    }
  }

  return pools;
}

export function generatePoolPlayRound(ctx: FixedGeneratorContext): GeneratedFixedRound {
  const { teams, existingGames, pools, currentRound, settings } = ctx;

  if (!pools || pools.length === 0) {
    // First call: create pools
    const newPools = createPools(teams, settings.formatOptions.poolCount ?? 2);
    ctx.pools = newPools;
  }

  const poolsToUse = ctx.pools!;
  const games: LocalRoundGame[] = [];
  let gameNumber = 1;
  let courtNumber = 1;

  // Generate round-robin games within each pool
  for (const pool of poolsToUse) {
    const poolTeams = pool.teams;

    // Get teams that haven't played each other yet
    const matchups = getUnplayedPoolMatchups(poolTeams, existingGames);

    for (const [team1, team2] of matchups.slice(0, Math.ceil(poolTeams.length / 2))) {
      games.push(createGameFromTeams(currentRound, gameNumber++, courtNumber++, team1, team2));
    }
  }

  return { games, byeTeams: [] };
}

function getUnplayedPoolMatchups(teams: Team[], existingGames: LocalRoundGame[]): Array<[Team, Team]> {
  const playedPairs = new Set<string>();

  for (const game of existingGames) {
    const team1Id = getTeamIdFromPlayers(game.team1, teams);
    const team2Id = getTeamIdFromPlayers(game.team2, teams);
    if (team1Id && team2Id) {
      playedPairs.add([team1Id, team2Id].sort().join('-'));
    }
  }

  const unplayed: Array<[Team, Team]> = [];

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const pairKey = [teams[i].id, teams[j].id].sort().join('-');
      if (!playedPairs.has(pairKey)) {
        unplayed.push([teams[i], teams[j]]);
      }
    }
  }

  return shuffleArray(unplayed);
}

function getTeamIdFromPlayers(players: [LocalPlayer, LocalPlayer], teams: Team[]): string | null {
  for (const team of teams) {
    const teamPlayerIds = new Set(team.players.map(p => p.id));
    if (players.every(p => teamPlayerIds.has(p.id))) {
      return team.id;
    }
  }
  return null;
}

// ============================================
// SHUFFLE GENERATOR
// Fixed partner Popcorn (team vs team random)
// ============================================

export function generateShuffleRound(ctx: FixedGeneratorContext): GeneratedFixedRound {
  const { teams, existingGames, currentRound, settings } = ctx;
  const numberOfCourts = settings.numberOfCourts;

  // Get teams that have played each other least
  const matchupCounts = new Map<string, number>();

  for (const game of existingGames) {
    const team1Id = getTeamIdFromPlayers(game.team1, teams);
    const team2Id = getTeamIdFromPlayers(game.team2, teams);
    if (team1Id && team2Id) {
      const key = [team1Id, team2Id].sort().join('-');
      matchupCounts.set(key, (matchupCounts.get(key) ?? 0) + 1);
    }
  }

  // Generate matchups prioritizing teams that haven't played each other
  const shuffledTeams = shuffleArray([...teams]);
  const games: LocalRoundGame[] = [];
  const usedTeams = new Set<string>();
  let gameNumber = 1;
  let courtNumber = 1;

  while (usedTeams.size < teams.length - 1 && courtNumber <= numberOfCourts) {
    const available = shuffledTeams.filter(t => !usedTeams.has(t.id));
    if (available.length < 2) break;

    // Find best pairing (least played against each other)
    let bestPair: [Team, Team] | null = null;
    let bestCount = Infinity;

    for (let i = 0; i < available.length; i++) {
      for (let j = i + 1; j < available.length; j++) {
        const key = [available[i].id, available[j].id].sort().join('-');
        const count = matchupCounts.get(key) ?? 0;
        if (count < bestCount) {
          bestCount = count;
          bestPair = [available[i], available[j]];
        }
      }
    }

    if (bestPair) {
      games.push(createGameFromTeams(currentRound, gameNumber++, courtNumber++, bestPair[0], bestPair[1]));
      usedTeams.add(bestPair[0].id);
      usedTeams.add(bestPair[1].id);
    } else {
      break;
    }
  }

  const byeTeams = teams.filter(t => !usedTeams.has(t.id));

  return { games, byeTeams };
}

// ============================================
// TEAM GAUNTLET GENERATOR
// Fixed-partner Gauntlet (Pickleheads "Rumble"):
// teams seeded by record, winners draw harder opponents
// ============================================

interface TeamRecord {
  team: Team;
  gamesPlayed: number;
  gamesWon: number;
  pointDifferential: number;
  pointsFor: number;
}

function calculateTeamRecords(teams: Team[], games: LocalRoundGame[]): Map<string, TeamRecord> {
  const records = new Map<string, TeamRecord>(
    teams.map(team => [
      team.id,
      { team, gamesPlayed: 0, gamesWon: 0, pointDifferential: 0, pointsFor: 0 },
    ])
  );

  for (const game of games) {
    // Mirror scoring.ts: only completed games with both scores count,
    // and ties credit neither team, so seeding matches displayed standings.
    if (!game.completed || game.team1Score === undefined || game.team2Score === undefined) {
      continue;
    }

    const team1Id = getTeamIdFromPlayers(game.team1, teams);
    const team2Id = getTeamIdFromPlayers(game.team2, teams);
    if (!team1Id || !team2Id) continue;

    const record1 = records.get(team1Id);
    const record2 = records.get(team2Id);
    if (!record1 || !record2) continue;

    const score1 = game.team1Score;
    const score2 = game.team2Score;

    record1.gamesPlayed++;
    record2.gamesPlayed++;
    record1.pointDifferential += score1 - score2;
    record2.pointDifferential += score2 - score1;
    record1.pointsFor += score1;
    record2.pointsFor += score2;

    if (score1 > score2) {
      record1.gamesWon++;
    } else if (score2 > score1) {
      record2.gamesWon++;
    }
  }

  return records;
}

function getPreviousMatchupKeys(teams: Team[], games: LocalRoundGame[], round: number): Set<string> {
  const keys = new Set<string>();

  for (const game of games) {
    if (game.round !== round) continue;

    const team1Id = getTeamIdFromPlayers(game.team1, teams);
    const team2Id = getTeamIdFromPlayers(game.team2, teams);
    if (team1Id && team2Id) {
      keys.add([team1Id, team2Id].sort().join('-'));
    }
  }

  return keys;
}

export function generateTeamGauntletRound(ctx: FixedGeneratorContext): GeneratedFixedRound {
  const { teams, existingGames, currentRound, settings } = ctx;
  const numberOfCourts = settings.numberOfCourts;
  const records = calculateTeamRecords(teams, existingGames);

  // Mirror sortStandings (scoring.ts) exactly — wins, win %, head-to-head,
  // point differential, points for — so the standings tab always predicts
  // next round's seeding. Full ties keep stable roster order, like the tab.
  const bySeed = (a: Team, b: Team) => {
    const recordA = records.get(a.id)!;
    const recordB = records.get(b.id)!;
    if (recordB.gamesWon !== recordA.gamesWon) return recordB.gamesWon - recordA.gamesWon;

    // The same rounded percentage the standings tab displays — a fractional
    // comparison here could order two teams differently than the tab does.
    const winPctA = calculateWinPercentageDisplay(recordA.gamesWon, recordA.gamesPlayed);
    const winPctB = calculateWinPercentageDisplay(recordB.gamesWon, recordB.gamesPlayed);
    if (winPctB !== winPctA) return winPctB - winPctA;

    const h2h = getHeadToHeadRecord(a.players[0].id, b.players[0].id, existingGames);
    if (h2h.wins !== h2h.losses) return h2h.losses - h2h.wins;

    if (recordB.pointDifferential !== recordA.pointDifferential) {
      return recordB.pointDifferential - recordA.pointDifferential;
    }
    // Full tie: return 0 so the stable sort keeps roster order — the exact
    // order the standings tab falls back to. A rating tiebreak here would
    // diverge from the displayed standings whenever every record key ties.
    return recordB.pointsFor - recordA.pointsFor;
  };

  // Teams with the fewest games get priority when courts are short (fair byes);
  // within a fairness tier, standings decide who plays — winners keep playing.
  const byFairness = [...teams].sort((a, b) => {
    const playedDelta =
      records.get(a.id)!.gamesPlayed - records.get(b.id)!.gamesPlayed;
    return playedDelta !== 0 ? playedDelta : bySeed(a, b);
  });

  const capacity = Math.min(numberOfCourts, Math.floor(teams.length / 2)) * 2;
  const playing = byFairness.slice(0, capacity);
  const byeTeams = byFairness.slice(capacity);

  // Sort from roster order — the same input order the standings tab sorts —
  // not from byFairness order. Head-to-head can be cyclic (A beat B beat C
  // beat A), and with an intransitive comparator the sorted result depends on
  // input order; starting both sorts from the same order keeps the seeding
  // consistent with the displayed standings even in cycle states.
  const playingIds = new Set(playing.map(t => t.id));
  const seeded = teams.filter(t => playingIds.has(t.id)).sort(bySeed);

  const lastRoundMatchups = getPreviousMatchupKeys(teams, existingGames, currentRound - 1);
  const games: LocalRoundGame[] = [];
  let gameNumber = 1;
  let courtNumber = 1;

  // Pair adjacent seeds (1v2 on court 1, 3v4 on court 2, ...), nudging one seat
  // down to avoid an immediate rematch of the previous round.
  const queue = [...seeded];

  while (queue.length >= 2 && courtNumber <= numberOfCourts) {
    const team1 = queue.shift()!;
    let opponentIndex = 0;

    const directKey = [team1.id, queue[0].id].sort().join('-');
    if (queue.length > 1 && lastRoundMatchups.has(directKey)) {
      opponentIndex = 1;
    } else if (queue.length === 3) {
      // Lookahead: taking queue[0] here leaves queue[1]/queue[2] as the final
      // pair, which the nudge above can never protect. If that leftover pair
      // just played each other, take queue[1] instead.
      const leftoverKey = [queue[1].id, queue[2].id].sort().join('-');
      if (lastRoundMatchups.has(leftoverKey)) {
        opponentIndex = 1;
      }
    }

    const team2 = queue.splice(opponentIndex, 1)[0];
    games.push(createGameFromTeams(currentRound, gameNumber++, courtNumber++, team1, team2));
  }

  byeTeams.push(...queue);

  return { games, byeTeams };
}

// ============================================
// BRACKET GENERATOR
// Single elimination + consolation bracket
// ============================================

export function generateBracket(teams: Team[], consolationBracket: boolean = false): BracketMatch[] {
  // Sort by seed
  const seededTeams = [...teams].sort((a, b) => {
    if (a.seed && b.seed) return a.seed - b.seed;
    return (b.rating ?? 0) - (a.rating ?? 0);
  });

  // Calculate bracket size (power of 2)
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(seededTeams.length)));

  const matches: BracketMatch[] = [];
  let matchNumber = 1;

  // First round matchups with seeding
  const firstRoundMatchups: Array<[Team | undefined, Team | undefined]> = [];

  // Standard bracket seeding (1v16, 8v9, 5v12, 4v13, etc.)
  const seedOrder = generateBracketSeedOrder(bracketSize);

  for (let i = 0; i < bracketSize / 2; i++) {
    const seed1 = seedOrder[i * 2];
    const seed2 = seedOrder[i * 2 + 1];

    const team1 = seededTeams[seed1 - 1];
    const team2 = seededTeams[seed2 - 1];

    firstRoundMatchups.push([team1, team2]);
  }

  // Create first round matches
  for (const [team1, team2] of firstRoundMatchups) {
    matches.push({
      id: generateId(),
      round: 1,
      matchNumber: matchNumber++,
      team1,
      team2,
      bracketType: 'main',
      completed: false,
    });
  }

  // Create subsequent rounds (empty, to be filled as winners advance)
  let currentRoundMatches = matches.length;
  let round = 2;

  while (currentRoundMatches > 1) {
    const nextRoundMatches = Math.floor(currentRoundMatches / 2);

    for (let i = 0; i < nextRoundMatches; i++) {
      matches.push({
        id: generateId(),
        round,
        matchNumber: matchNumber++,
        bracketType: 'main',
        completed: false,
      });
    }

    currentRoundMatches = nextRoundMatches;
    round++;
  }

  // Consolation bracket for first-round losers
  if (consolationBracket && seededTeams.length >= 4) {
    const consolationMatches = generateConsolationBracket(firstRoundMatchups.length);
    matches.push(...consolationMatches);
  }

  return matches;
}

function generateBracketSeedOrder(bracketSize: number): number[] {
  // Standard bracket seeding for powers of 2
  if (bracketSize === 2) return [1, 2];
  if (bracketSize === 4) return [1, 4, 2, 3];
  if (bracketSize === 8) return [1, 8, 4, 5, 2, 7, 3, 6];
  if (bracketSize === 16) return [1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11];
  if (bracketSize === 32) {
    return [
      1, 32, 16, 17, 8, 25, 9, 24,
      4, 29, 13, 20, 5, 28, 12, 21,
      2, 31, 15, 18, 7, 26, 10, 23,
      3, 30, 14, 19, 6, 27, 11, 22
    ];
  }

  // Default for other sizes
  const order: number[] = [];
  for (let i = 1; i <= bracketSize; i++) {
    order.push(i);
  }
  return order;
}

function generateConsolationBracket(firstRoundLosers: number): BracketMatch[] {
  const matches: BracketMatch[] = [];
  let matchNumber = 1;

  // First round of consolation
  for (let i = 0; i < Math.floor(firstRoundLosers / 2); i++) {
    matches.push({
      id: generateId(),
      round: 1,
      matchNumber: matchNumber++,
      bracketType: 'consolation',
      completed: false,
    });
  }

  // Subsequent rounds
  let currentMatches = matches.length;
  let round = 2;

  while (currentMatches > 1) {
    const nextRound = Math.floor(currentMatches / 2);
    for (let i = 0; i < nextRound; i++) {
      matches.push({
        id: generateId(),
        round,
        matchNumber: matchNumber++,
        bracketType: 'consolation',
        completed: false,
      });
    }
    currentMatches = nextRound;
    round++;
  }

  return matches;
}

export function generateBracketRound(ctx: FixedGeneratorContext): GeneratedFixedRound {
  const { teams, bracket, currentRound, settings } = ctx;

  if (!bracket || bracket.length === 0) {
    // Generate initial bracket
    const consolation = settings.formatOptions.consolationBracket ?? false;
    ctx.bracket = generateBracket(teams, consolation);
  }

  // Get matches for current round that need to be played
  const roundMatches = ctx.bracket!.filter(m => m.round === currentRound && m.team1 && m.team2 && !m.completed);

  const games: LocalRoundGame[] = [];
  let gameNumber = 1;
  let courtNumber = 1;

  for (const match of roundMatches) {
    if (match.team1 && match.team2) {
      games.push(createGameFromTeams(currentRound, gameNumber++, courtNumber++, match.team1, match.team2));
    }
  }

  return { games, byeTeams: [] };
}

// ============================================
// MiLP GENERATOR
// League play with auto partner/opponent rotation
// ============================================

export function generateMiLPSchedule(teams: Team[], matchesPerOpponent: number = 1): LocalRoundGame[][] {
  const rounds: LocalRoundGame[][] = [];

  // Generate all possible matchups
  const allMatchups: Array<[Team, Team]> = [];

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      for (let k = 0; k < matchesPerOpponent; k++) {
        allMatchups.push([teams[i], teams[j]]);
      }
    }
  }

  // Shuffle matchups
  const shuffledMatchups = shuffleArray(allMatchups);

  // Distribute matchups across rounds
  const matchupsPerRound = Math.floor(teams.length / 2);
  let roundNumber = 1;
  let gameNumber = 1;
  let currentRound: LocalRoundGame[] = [];
  const teamsUsedThisRound = new Set<string>();

  for (const [team1, team2] of shuffledMatchups) {
    // Check if either team is already playing this round
    if (teamsUsedThisRound.has(team1.id) || teamsUsedThisRound.has(team2.id)) {
      // Save current round and start new one
      if (currentRound.length > 0) {
        rounds.push(currentRound);
        roundNumber++;
        gameNumber = 1;
        currentRound = [];
        teamsUsedThisRound.clear();
      }
    }

    // Add match to current round
    const courtNumber = currentRound.length + 1;
    currentRound.push(createGameFromTeams(roundNumber, gameNumber++, courtNumber, team1, team2));
    teamsUsedThisRound.add(team1.id);
    teamsUsedThisRound.add(team2.id);

    // Check if round is full
    if (currentRound.length >= matchupsPerRound) {
      rounds.push(currentRound);
      roundNumber++;
      gameNumber = 1;
      currentRound = [];
      teamsUsedThisRound.clear();
    }
  }

  // Add any remaining matches
  if (currentRound.length > 0) {
    rounds.push(currentRound);
  }

  return rounds;
}

export function generateMiLPRound(ctx: FixedGeneratorContext): GeneratedFixedRound {
  const { teams, existingGames, currentRound, settings } = ctx;
  const matchesPerOpponent = settings.formatOptions.matchesPerOpponent ?? 1;

  // Count existing matchups
  const matchupCounts = new Map<string, number>();

  for (const game of existingGames) {
    const team1Id = getTeamIdFromPlayers(game.team1, teams);
    const team2Id = getTeamIdFromPlayers(game.team2, teams);
    if (team1Id && team2Id) {
      const key = [team1Id, team2Id].sort().join('-');
      matchupCounts.set(key, (matchupCounts.get(key) ?? 0) + 1);
    }
  }

  // Find matchups that haven't reached the limit
  const availableMatchups: Array<[Team, Team]> = [];

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const key = [teams[i].id, teams[j].id].sort().join('-');
      const count = matchupCounts.get(key) ?? 0;
      if (count < matchesPerOpponent) {
        availableMatchups.push([teams[i], teams[j]]);
      }
    }
  }

  // Shuffle and select matchups for this round
  const shuffled = shuffleArray(availableMatchups);
  const games: LocalRoundGame[] = [];
  const usedTeams = new Set<string>();
  let gameNumber = 1;
  let courtNumber = 1;

  for (const [team1, team2] of shuffled) {
    if (usedTeams.has(team1.id) || usedTeams.has(team2.id)) continue;
    if (courtNumber > settings.numberOfCourts) break;

    games.push(createGameFromTeams(currentRound, gameNumber++, courtNumber++, team1, team2));
    usedTeams.add(team1.id);
    usedTeams.add(team2.id);
  }

  const byeTeams = teams.filter(t => !usedTeams.has(t.id));

  return { games, byeTeams };
}

// ============================================
// MAIN GENERATOR DISPATCHER
// ============================================

export function generateFixedRound(ctx: FixedGeneratorContext): GeneratedFixedRound {
  const format = ctx.settings.format;

  switch (format) {
    case 'pool_play':
      return generatePoolPlayRound(ctx);
    case 'shuffle':
      return generateShuffleRound(ctx);
    case 'team_gauntlet':
      return generateTeamGauntletRound(ctx);
    case 'bracket':
      return generateBracketRound(ctx);
    case 'milp':
      return generateMiLPRound(ctx);
    default:
      return generateShuffleRound(ctx);
  }
}

// ============================================
// BRACKET PROGRESSION
// ============================================

export function advanceWinner(
  bracket: BracketMatch[],
  completedMatchId: string,
  winnerTeam: Team
): BracketMatch[] {
  const match = bracket.find(m => m.id === completedMatchId);
  if (!match) return bracket;

  // Mark match as completed
  match.winner = winnerTeam;
  match.completed = true;

  // Find next match in bracket
  const nextRoundMatches = bracket.filter(m =>
    m.round === match.round + 1 &&
    m.bracketType === match.bracketType &&
    !m.completed
  );

  if (nextRoundMatches.length > 0) {
    // Determine which slot (team1 or team2) the winner goes to
    const matchIndex = bracket.filter(m =>
      m.round === match.round &&
      m.bracketType === match.bracketType
    ).findIndex(m => m.id === match.id);

    const nextMatchIndex = Math.floor(matchIndex / 2);
    const nextMatch = nextRoundMatches[nextMatchIndex];

    if (nextMatch) {
      if (matchIndex % 2 === 0) {
        nextMatch.team1 = winnerTeam;
      } else {
        nextMatch.team2 = winnerTeam;
      }
    }
  }

  return bracket;
}

export function advanceLoserToConsolation(
  bracket: BracketMatch[],
  completedMatchId: string,
  loserTeam: Team
): BracketMatch[] {
  const match = bracket.find(m => m.id === completedMatchId);
  if (!match || match.bracketType !== 'main' || match.round !== 1) return bracket;

  // Find corresponding consolation match
  const consolationMatches = bracket.filter(m =>
    m.bracketType === 'consolation' &&
    m.round === 1 &&
    (!m.team1 || !m.team2)
  );

  if (consolationMatches.length > 0) {
    const consolationMatch = consolationMatches[0];
    if (!consolationMatch.team1) {
      consolationMatch.team1 = loserTeam;
    } else if (!consolationMatch.team2) {
      consolationMatch.team2 = loserTeam;
    }
  }

  return bracket;
}

// ============================================
// POOL STANDINGS
// ============================================

export interface PoolStanding {
  team: Team;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
  rank: number;
}

export function calculatePoolStandings(pool: Pool, games: LocalRoundGame[]): PoolStanding[] {
  const standings = new Map<string, PoolStanding>();

  // Initialize standings for all teams in pool
  for (const team of pool.teams) {
    standings.set(team.id, {
      team,
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDifferential: 0,
      rank: 0,
    });
  }

  // Process games
  for (const game of games) {
    if (!game.completed) continue;

    const team1Id = getTeamIdFromPlayers(game.team1, pool.teams);
    const team2Id = getTeamIdFromPlayers(game.team2, pool.teams);

    if (!team1Id || !team2Id) continue;

    const standing1 = standings.get(team1Id);
    const standing2 = standings.get(team2Id);

    if (!standing1 || !standing2) continue;

    const team1Won = (game.team1Score ?? 0) > (game.team2Score ?? 0);

    standing1.gamesPlayed++;
    standing2.gamesPlayed++;

    standing1.pointsFor += game.team1Score ?? 0;
    standing1.pointsAgainst += game.team2Score ?? 0;

    standing2.pointsFor += game.team2Score ?? 0;
    standing2.pointsAgainst += game.team1Score ?? 0;

    if (team1Won) {
      standing1.gamesWon++;
      standing2.gamesLost++;
    } else {
      standing2.gamesWon++;
      standing1.gamesLost++;
    }
  }

  // Calculate point differentials and sort
  const standingsArray = Array.from(standings.values());

  for (const standing of standingsArray) {
    standing.pointDifferential = standing.pointsFor - standing.pointsAgainst;
  }

  standingsArray.sort((a, b) => {
    if (b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon;
    if (b.pointDifferential !== a.pointDifferential) return b.pointDifferential - a.pointDifferential;
    return b.pointsFor - a.pointsFor;
  });

  // Assign ranks
  standingsArray.forEach((standing, index) => {
    standing.rank = index + 1;
  });

  return standingsArray;
}
