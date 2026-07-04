/**
 * Verifies the permanent-bye fix in ladder generators.
 * 18 players / 4 courts => 16 play, 2 sit per round. Before the fix, the 2
 * round-1 bye players never played again. After: byes must rotate.
 */
import {
  generateKingOfCourtRound,
  generateClaimThroneRound,
  generateUpDownRiverRound,
  type GeneratorContext,
} from '../src/lib/formats/rotating-generators';
import { calculateStandingsForFormat } from '../src/lib/formats/scoring';
import type {
  LocalPlayer,
  LocalRoundGame,
} from '../src/types/database';

type GenFn = (ctx: GeneratorContext) => { games: LocalRoundGame[]; byePlayers: LocalPlayer[] };

const GENERATORS: Array<[string, GenFn, Record<string, unknown>]> = [
  ['king_of_court', generateKingOfCourtRound, {}],
  ['claim_throne', generateClaimThroneRound, {}],
  ['up_down_river', generateUpDownRiverRound, { playersMovingUp: 2, playersMovingDown: 2 }],
];

const CONFIGS: Array<[number, number, number, number?]> = [
  [16, 4, 8],       // exact fit: zero byes, waiting-queue early return
  [18, 4, 10],
  [12, 1, 12],      // reviewer's starvation repro: 8 waiting > 4 seats
  [13, 2, 12],      // threshold case
  [21, 4, 12],      // threshold case
  [18, 4, 10, 3],   // round 3 leaves one game unscored: players in it are
                    // benched next round and must re-enter via the queue
  [18, 8, 10],      // overprovisioned courts: generator must clamp to 4 real
  [13, 5, 12],      // courts, not strand queue re-entries on empty court N
];

function makePlayers(n: number): LocalPlayer[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `P${i + 1}`,
    rating: 5.0 - i * 0.1,
  })) as LocalPlayer[];
}

function playGames(games: LocalRoundGame[], players: LocalPlayer[]): void {
  // Deterministic: team containing the lowest player index wins 11-5.
  const idx = new Map(players.map((p, i) => [p.id, i]));
  for (const g of games) {
    const best1 = Math.min(...g.team1.map(p => idx.get(p.id)!));
    const best2 = Math.min(...g.team2.map(p => idx.get(p.id)!));
    if (best1 < best2) {
      g.team1Score = 11;
      g.team2Score = 5;
    } else {
      g.team1Score = 5;
      g.team2Score = 11;
    }
    g.completed = true;
  }
}

let failures = 0;

for (const [name, gen, formatOptions] of GENERATORS) {
 for (const [NUM_PLAYERS, NUM_COURTS, ROUNDS, INCOMPLETE_AT] of CONFIGS) {
  const players = makePlayers(NUM_PLAYERS);
  const games: LocalRoundGame[] = [];
  const usedPartnerships = new Set<string>();
  const byeCounts = new Map(players.map(p => [p.id, 0]));
  let maxConsecutiveByes = 0;
  const consecutive = new Map(players.map(p => [p.id, 0]));

  for (let round = 1; round <= ROUNDS; round++) {
    const standings = calculateStandingsForFormat(players, games, {
      scoringType: 'court_weighted',
      courtWeights: {},
    });
    const ctx = {
      players,
      existingGames: games,
      standings,
      currentRound: round,
      settings: {
        numberOfCourts: NUM_COURTS,
        format: name,
        formatOptions,
      } as unknown as GeneratorContext['settings'],
      usedPartnerships,
    } as GeneratorContext;

    const result = gen(ctx);
    playGames(result.games, players);
    if (round === INCOMPLETE_AT && result.games.length > 1) {
      const g = result.games[result.games.length - 1];
      g.completed = false;
      g.team1Score = undefined;
      g.team2Score = undefined;
    }
    games.push(...result.games);

    for (const p of players) {
      if (result.byePlayers.some(b => b.id === p.id)) {
        byeCounts.set(p.id, byeCounts.get(p.id)! + 1);
        consecutive.set(p.id, consecutive.get(p.id)! + 1);
        maxConsecutiveByes = Math.max(maxConsecutiveByes, consecutive.get(p.id)!);
      } else {
        consecutive.set(p.id, 0);
      }
    }
  }

  const counts = [...byeCounts.values()];
  const maxByes = Math.max(...counts);
  const minByes = Math.min(...counts);
  const playersPerRound = games.length
    ? (NUM_PLAYERS * ROUNDS - counts.reduce((a, b) => a + b, 0)) / ROUNDS
    : 0;

  console.log(`\n=== ${name}: ${NUM_PLAYERS} players / ${NUM_COURTS} courts / ${ROUNDS} rounds ===`);
  console.log(
    `bye counts: ${players.map(p => `${p.name}=${byeCounts.get(p.id)}`).join(' ')}`
  );
  console.log(
    `max byes for one player: ${maxByes}, min: ${minByes}, max consecutive: ${maxConsecutiveByes}, avg players/round: ${playersPerRound}`
  );

  // 2 of 18 sit per round => 20 bye-slots over 10 rounds; fair-ish rotation
  // means nobody should sit more than a handful, and NOBODY sits forever.
  const effectiveCourts = Math.min(NUM_COURTS, Math.max(1, Math.floor(NUM_PLAYERS / 4)));
  const sitPerRound = NUM_PLAYERS - effectiveCourts * 4;
  const fairMaxConsecutive = sitPerRound > 0 ? Math.ceil(NUM_PLAYERS / Math.max(1, NUM_PLAYERS - sitPerRound)) : 0;
  const incompleteSlack = INCOMPLETE_AT ? 1 : 0;
  if (maxConsecutiveByes > fairMaxConsecutive + 1 + incompleteSlack) {
    console.log(`FAIL: a player sat out ${maxConsecutiveByes} consecutive rounds (fair max ~${fairMaxConsecutive + 1})`);
    failures++;
  } else if (maxByes >= ROUNDS - 1) {
    console.log(`FAIL: a player sat ${maxByes}/${ROUNDS} rounds`);
    failures++;
  } else {
    console.log('PASS: byes rotate, no permanent sit-outs');
  }
 }
}

if (failures > 0) {
  console.log(`\n${failures} generator(s) FAILED`);
  process.exit(1);
}
console.log('\nAll ladder generators PASS');
