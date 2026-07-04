/* eslint-disable @typescript-eslint/no-explicit-any -- dev simulation script */
/**
 * Simulation of Team Gauntlet round generation.
 * Imports the REAL generator from the repo (type-only '@/' imports are erased by tsx).
 */
import {
  generateTeamGauntletRound,
  createTeamsFromPlayers,
  type Team,
} from '../src/lib/formats/fixed-generators';
import { calculateStandingsForFormat } from '../src/lib/formats/scoring';

type LocalPlayer = { id: string; name: string; rating?: number };
type LocalRoundGame = {
  id: string;
  round: number;
  gameNumber: number;
  courtNumber: number;
  team1: [LocalPlayer, LocalPlayer];
  team2: [LocalPlayer, LocalPlayer];
  team1Score?: number;
  team2Score?: number;
  completed: boolean;
};

// scores may be a fixed pair [team1Score, team2Score] applied by SEED-STRENGTH:
// we return a function (round, court, t1idx, t2idx) => [s1,s2] | null (null = default)
type ScoreScript = (round: number, court: number, t1idx: number, t2idx: number) => [number, number] | null;

interface ScenarioOpts {
  name: string;
  numTeams: number;
  numberOfCourts: number;
  rounds: number;
  script?: ScoreScript;
  // round -> court whose game is left INCOMPLETE (no scores, completed=false)
  incomplete?: Record<number, number>;
  // round -> court whose game ends in a TIE 10-10 (completed=true)
  tie?: Record<number, number>;
}

function makePlayers(n: number): LocalPlayer[] {
  const players: LocalPlayer[] = [];
  for (let i = 0; i < n; i++) {
    players.push({ id: `p${i + 1}`, name: `P${i + 1}`, rating: 5.0 - i * 0.1 });
  }
  return players;
}

function pad(s: string, w: number): string {
  return s.length >= w ? s : s + ' '.repeat(w - s.length);
}

function runScenario(opts: ScenarioOpts) {
  const { name, numTeams, numberOfCourts, rounds } = opts;
  console.log('='.repeat(78));
  console.log(`SCENARIO: ${name}  (${numTeams} teams, numberOfCourts=${numberOfCourts}, ${rounds} rounds)`);
  console.log('='.repeat(78));

  const players = makePlayers(numTeams * 2);
  const teams: Team[] = createTeamsFromPlayers(players as any);
  // True strength order == creation order: T1 strongest ... Tn weakest
  const labelByTeamId = new Map<string, string>();
  const idxByTeamId = new Map<string, number>();
  const labelByFirstPlayer = new Map<string, string>();
  const idxByFirstPlayer = new Map<string, number>();
  teams.forEach((t, i) => {
    labelByTeamId.set(t.id, `T${i + 1}`);
    idxByTeamId.set(t.id, i);
    for (const p of t.players) {
      labelByFirstPlayer.set(p.id, `T${i + 1}`);
      idxByFirstPlayer.set(p.id, i);
    }
  });

  const allGames: LocalRoundGame[] = [];
  const trajectory: Record<string, (string | number)[]> = {};
  teams.forEach((_, i) => (trajectory[`T${i + 1}`] = []));
  const byeCounts: Record<string, number> = {};
  teams.forEach((_, i) => (byeCounts[`T${i + 1}`] = 0));
  const winsSoFar: number[] = teams.map(() => 0);
  const pdSoFar: number[] = teams.map(() => 0);

  // per-round record of who beat whom, for the "winner below beaten team" check
  const beatEdges: Array<{ round: number; winner: number; loser: number }> = [];
  const courtOfTeamByRound: Array<Map<number, number>> = []; // round-1 indexed: teamIdx -> court

  for (let round = 1; round <= rounds; round++) {
    const ctx: any = {
      teams,
      existingGames: allGames as any,
      currentRound: round,
      settings: { numberOfCourts, format: 'team_gauntlet', formatOptions: {} },
    };
    // Displayed standings at generation time (the REAL sortStandings, via team
    // reps = first player of each team) — used for the seeding-parity check.
    const repStandings = calculateStandingsForFormat(
      teams.map((t) => t.players[0]) as any,
      allGames as any,
      { scoringType: 'win_percentage' }
    );
    const { games: newGames, byeTeams } = generateTeamGauntletRound(ctx);

    const courtMap = new Map<number, number>();
    const rowParts: string[] = [];
    const rematches: string[] = [];

    // detect immediate rematches vs previous round
    const prevPairs = new Set<string>();
    for (const g of allGames) {
      if (g.round === round - 1) {
        const a = idxByFirstPlayer.get(g.team1[0].id)!;
        const b = idxByFirstPlayer.get(g.team2[0].id)!;
        prevPairs.add([a, b].sort((x, y) => x - y).join('-'));
      }
    }

    for (const g of newGames as any as LocalRoundGame[]) {
      const i1 = idxByFirstPlayer.get(g.team1[0].id)!;
      const i2 = idxByFirstPlayer.get(g.team2[0].id)!;
      courtMap.set(i1, g.courtNumber);
      courtMap.set(i2, g.courtNumber);
      const recStr = (i: number) => `T${i + 1}(${winsSoFar[i]}w,${pdSoFar[i] >= 0 ? '+' : ''}${pdSoFar[i]})`;
      rowParts.push(`C${g.courtNumber}: ${recStr(i1)} vs ${recStr(i2)}`);
      if (prevPairs.has([i1, i2].sort((x, y) => x - y).join('-'))) {
        rematches.push(`C${g.courtNumber}: T${i1 + 1} vs T${i2 + 1}`);
      }
    }
    courtOfTeamByRound.push(courtMap);

    const byeLabels = byeTeams.map((t: Team) => labelByTeamId.get(t.id)!);
    for (const b of byeLabels) byeCounts[b]++;

    teams.forEach((_, i) => {
      const c = courtMap.get(i);
      trajectory[`T${i + 1}`].push(c ?? 'BYE');
    });

    console.log(`R${round}  ${rowParts.join('   ')}${byeLabels.length ? `   BYE: ${byeLabels.join(',')}` : ''}`);
    if (rematches.length) console.log(`     ** IMMEDIATE REMATCH of R${round - 1}: ${rematches.join('; ')}`);
    rematchFailures.push(...rematches.map((r) => `${name} R${round} ${r}`));

    // Parity vs the displayed standings (all rounds >= 2, byes included):
    // the generator seeds from the same comparator and input order as the
    // standings tab, and pairing places display-rank r on court ceil(r/2)
    // with at most one seat of drift from the rematch nudge/lookahead.
    if (round >= 2) {
      const playingRanks: number[] = [];
      for (const st of repStandings) {
        const idx = idxByFirstPlayer.get(st.player.id)!;
        if (courtMap.has(idx)) playingRanks.push(idx);
      }
      playingRanks.forEach((teamIdx, rank) => {
        const expected = Math.floor(rank / 2) + 1;
        const actual = courtMap.get(teamIdx)!;
        if (Math.abs(actual - expected) > 1) {
          parityFailures.push(
            `${name} R${round}: display-rank ${rank + 1} team T${teamIdx + 1} on court ${actual}, expected ${expected}±1`
          );
        }
        if (rank === 0 && byeTeams.length === 0 && actual !== 1) {
          parityFailures.push(
            `${name} R${round}: standings leader T${teamIdx + 1} on court ${actual}, expected 1`
          );
        }
      });
    }
    const usedCourts = [...new Set((newGames as any[]).map((g) => g.courtNumber))].sort((a, b) => a - b);
    if (round === 1) console.log(`     courts used: [${usedCourts.join(',')}] of ${numberOfCourts} configured`);

    // Play the games
    for (const g of newGames as any as LocalRoundGame[]) {
      const i1 = idxByFirstPlayer.get(g.team1[0].id)!;
      const i2 = idxByFirstPlayer.get(g.team2[0].id)!;

      if (opts.incomplete?.[round] === g.courtNumber) {
        g.completed = false; // left unfinished, no scores
        console.log(`     (C${g.courtNumber} T${i1 + 1} vs T${i2 + 1} left INCOMPLETE)`);
        continue;
      }
      if (opts.tie?.[round] === g.courtNumber) {
        g.team1Score = 10;
        g.team2Score = 10;
        g.completed = true;
        console.log(`     (C${g.courtNumber} T${i1 + 1} vs T${i2 + 1} scored as TIE 10-10)`);
        continue;
      }

      const scripted = opts.script ? opts.script(round, g.courtNumber, i1, i2) : null;
      // default: stronger (lower index) team wins 11-5
      const scores = scripted ?? (i1 < i2 ? ([11, 5] as [number, number]) : ([5, 11] as [number, number]));
      g.team1Score = scores[0];
      g.team2Score = scores[1];
      g.completed = true;
      const w = scores[0] > scores[1] ? i1 : i2;
      const l = w === i1 ? i2 : i1;
      winsSoFar[w]++;
      pdSoFar[i1] += scores[0] - scores[1];
      pdSoFar[i2] += scores[1] - scores[0];
      beatEdges.push({ round, winner: w, loser: l });
      if (scripted) {
        console.log(`     (scripted: C${g.courtNumber} T${w + 1} beat T${l + 1} ${Math.max(...scores)}-${Math.min(...scores)})`);
      }
    }
    allGames.push(...(newGames as any));
  }

  console.log('\nTrajectories (court per round, BYE = sat out):');
  teams.forEach((_, i) => {
    console.log(`  T${i + 1}: ${trajectory[`T${i + 1}`].map((c) => pad(String(c), 3)).join(' ')}`);
  });
  if (Object.values(byeCounts).some((v) => v > 0)) {
    console.log(`Bye counts: ${Object.entries(byeCounts).map(([k, v]) => `${k}=${v}`).join(' ')}`);
  }

  // Check 1: did winners move to a lower-or-equal court next round?
  console.log('\nWinner court movement (winner of round r: court in r -> court in r+1):');
  const violations: string[] = [];
  for (const e of beatEdges) {
    if (e.round >= rounds) continue;
    const cw = courtOfTeamByRound[e.round - 1].get(e.winner);
    const cwNext = courtOfTeamByRound[e.round].get(e.winner);
    const clNext = courtOfTeamByRound[e.round].get(e.loser);
    if (cw === undefined || cwNext === undefined) continue;
    const moved = cwNext < cw ? 'UP' : cwNext === cw ? 'same' : 'DOWN';
    console.log(`  R${e.round}: T${e.winner + 1} won on C${cw} -> C${cwNext} (${moved})${clNext !== undefined ? `; beaten T${e.loser + 1} -> C${clNext}` : `; beaten T${e.loser + 1} -> BYE`}`);
    if (clNext !== undefined && cwNext > clNext) {
      violations.push(`R${e.round + 1}: T${e.winner + 1} (winner) on C${cwNext} but T${e.loser + 1} (team it just beat in R${e.round}) on better C${clNext}`);
    }
  }
  if (violations.length) {
    console.log('\n!! WINNER-BELOW-BEATEN-TEAM violations:');
    violations.forEach((v) => console.log('  ' + v));
    orderingFailures.push(...violations.map((v) => `${name}: ${v}`));
  } else {
    console.log('\nNo winner-below-beaten-team violations in this scenario.');
  }
  console.log('');
}

// Global failure accumulators — this sim ASSERTS (exit 1), not just observes.
const rematchFailures: string[] = [];
const parityFailures: string[] = [];
const orderingFailures: string[] = [];

// ---------------------------------------------------------------
// Scenario A: 12 players -> 6 teams, 6 courts, 6 rounds
// Upsets (R2, courts 1 and 3): the weaker-by-strength team wins 11-9
// Squeaker (R3, court 1): the stronger-by-strength team wins by only 1 point
// ---------------------------------------------------------------
const scriptA: ScoreScript = (round, court, i1, i2) => {
  if (round === 2 && (court === 1 || court === 3)) {
    // upsets: weaker-by-strength team wins 11-9 (court 3 = weakest playing team upsets)
    return i1 > i2 ? [11, 9] : [9, 11];
  }
  if (round === 3 && court === 1) {
    // squeaker: stronger-by-strength (but fewer-wins) team wins by only 1 point
    return i1 < i2 ? [11, 10] : [10, 11];
  }
  return null;
};

runScenario({ name: 'A: 6 teams / 6 courts', numTeams: 6, numberOfCourts: 6, rounds: 6, script: scriptA });
runScenario({ name: 'B: 6 teams / 3 courts (same script)', numTeams: 6, numberOfCourts: 3, rounds: 6, script: scriptA });
runScenario({ name: 'C: 5 teams / 2 courts, byes, no upsets', numTeams: 5, numberOfCourts: 2, rounds: 10 });
runScenario({ name: 'D: 6 teams / 3 courts, TIE in R1 court 2', numTeams: 6, numberOfCourts: 3, rounds: 4, tie: { 1: 2 } });
runScenario({ name: 'E: 6 teams / 2 courts, R2 court 1 left INCOMPLETE', numTeams: 6, numberOfCourts: 2, rounds: 5, incomplete: { 2: 1 } });

// ---------------------------------------------------------------
// Assertion summary — any failure is a regression.
// ---------------------------------------------------------------
const allFailures = [
  ...orderingFailures.map((f) => `ordering: ${f}`),
  ...rematchFailures.map((f) => `rematch: ${f}`),
  ...parityFailures.map((f) => `parity: ${f}`),
];
if (allFailures.length) {
  console.log(`\n${allFailures.length} ASSERTION FAILURE(S):`);
  allFailures.forEach((f) => console.log('  FAIL ' + f));
  process.exit(1);
}
console.log('\nAll gauntlet scenarios PASS (ordering, rematch-avoidance, standings parity)');
