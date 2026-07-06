/* eslint-disable @typescript-eslint/no-explicit-any -- dev simulation script */
/**
 * Simulation of mid-session LATE ARRIVALS in Team Gauntlet (set partners).
 * Imports the REAL roster pairing + generator from the repo and asserts:
 *   1. An odd roster never throws — the unpaired player waits, rounds keep going.
 *   2. Played rounds are byte-identical before and after roster changes.
 *   3. Existing teams' records are unchanged by a late add.
 *   4. A freshly paired late team plays the very next round (0-games priority).
 *   5. Two unpaired late arrivals auto-pair in the order they were added.
 *   6. Legacy rosters without partnerId pair adjacently (old behavior intact).
 */
import {
  generateTeamGauntletRound,
  createTeamsFromRoster,
  createTeamsFromPlayers,
  derivePartnerships,
  type Team,
} from '../src/lib/formats/fixed-generators';
import { calculateStandingsForFormat } from '../src/lib/formats/scoring';

type LocalPlayer = {
  id: string;
  name: string;
  rating?: number;
  partnerId?: string;
};
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

const failures: string[] = [];

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ok   ${message}`);
  } else {
    console.log(`  FAIL ${message}`);
    failures.push(message);
  }
}

function makePairedRoster(teamCount: number): LocalPlayer[] {
  const roster: LocalPlayer[] = [];
  for (let t = 0; t < teamCount; t++) {
    const a: LocalPlayer = { id: `p${t * 2 + 1}`, name: `P${t * 2 + 1}`, rating: 5.0 - t * 0.2 };
    const b: LocalPlayer = { id: `p${t * 2 + 2}`, name: `P${t * 2 + 2}`, rating: 5.0 - t * 0.2 };
    a.partnerId = b.id;
    b.partnerId = a.id;
    roster.push(a, b);
  }
  return roster;
}

function teamKey(team: Team): string {
  return team.players.map((p) => p.id).sort().join('+');
}

function playRound(
  roster: LocalPlayer[],
  allGames: LocalRoundGame[],
  round: number,
  numberOfCourts: number
): { games: LocalRoundGame[]; byeTeams: Team[]; teams: Team[]; waiting: LocalPlayer[] } {
  const { teams, waitingPlayers } = createTeamsFromRoster(roster as any);
  const { games, byeTeams } = generateTeamGauntletRound({
    teams,
    existingGames: allGames as any,
    currentRound: round,
    settings: { numberOfCourts, format: 'team_gauntlet', formatOptions: {} } as any,
  });
  return { games: games as any, byeTeams, teams, waiting: waitingPlayers as any };
}

function scoreAll(games: LocalRoundGame[], roster: LocalPlayer[]) {
  // Higher-rated (earlier roster) team wins 11-5.
  const posOf = new Map(roster.map((p, i) => [p.id, i]));
  for (const g of games) {
    const i1 = posOf.get(g.team1[0].id) ?? 99;
    const i2 = posOf.get(g.team2[0].id) ?? 99;
    const [s1, s2] = i1 < i2 ? [11, 5] : [5, 11];
    g.team1Score = s1;
    g.team2Score = s2;
    g.completed = true;
  }
}

function teamRecords(roster: LocalPlayer[], games: LocalRoundGame[]): Map<string, string> {
  // teamKey -> "wins-losses(pd)" via the real standings calculator on team reps.
  const { teams } = createTeamsFromRoster(roster as any);
  const standings = calculateStandingsForFormat(
    teams.map((t) => t.players[0]) as any,
    games as any,
    { scoringType: 'win_percentage' }
  );
  const byRep = new Map(standings.map((s: any) => [s.player.id, s]));
  const records = new Map<string, string>();
  for (const team of teams) {
    const s: any = byRep.get(team.players[0].id);
    records.set(teamKey(team), `${s.gamesWon}-${s.gamesLost}(${s.pointDifferential})`);
  }
  return records;
}

console.log('='.repeat(78));
console.log('SCENARIO: Team Gauntlet late arrivals (4 teams, 2 courts)');
console.log('='.repeat(78));

const roster: LocalPlayer[] = makePairedRoster(4);
const allGames: LocalRoundGame[] = [];

// --- Rounds 1-2: normal play ---------------------------------------------
for (let round = 1; round <= 2; round++) {
  const { games, waiting } = playRound(roster, allGames, round, 2);
  assert(games.length === 2, `R${round}: 4 teams on 2 courts -> 2 games`);
  assert(waiting.length === 0, `R${round}: nobody waiting`);
  scoreAll(games, roster);
  allGames.push(...games);
}

const snapshotAfterR2 = JSON.stringify(allGames);

// --- Late arrival #1: solo player, odd roster ------------------------------
console.log('\nLate arrival: solo player (odd roster of 9)');
roster.push({ id: 'late1', name: 'Late One' });

let threw = false;
let r3: ReturnType<typeof playRound> | undefined;
try {
  r3 = playRound(roster, allGames, 3, 2);
} catch {
  threw = true;
}
assert(!threw, 'odd roster does not throw on round generation');
if (r3) {
  assert(r3.teams.length === 4, 'solo late arrival forms no team yet');
  assert(
    r3.waiting.length === 1 && r3.waiting[0].id === 'late1',
    'solo late arrival is the one waiting for a partner'
  );
  const r3PlayerIds = new Set(
    r3.games.flatMap((g) => [...g.team1, ...g.team2].map((p) => p.id))
  );
  assert(!r3PlayerIds.has('late1'), 'waiting player is not scheduled in R3');
  assert(JSON.stringify(allGames) === snapshotAfterR2, 'R1-R2 games untouched by the add');
  scoreAll(r3.games, roster);
  allGames.push(...r3.games);
}

const snapshotAfterR3 = JSON.stringify(allGames);
const recordsAfterR3 = teamRecords(roster, allGames);

// --- Late arrival #2: partner shows up, pair them ---------------------------
console.log('\nLate arrival: partner joins, pair into a team (5 teams)');
roster.push({ id: 'late2', name: 'Late Two' });
roster[roster.length - 2].partnerId = 'late2';
roster[roster.length - 1].partnerId = 'late1';

const { teams: teamsWithLate, waitingPlayers: waitingAfterPair } =
  createTeamsFromRoster(roster as any);
assert(teamsWithLate.length === 5, 'paired late arrivals form the 5th team');
assert(waitingAfterPair.length === 0, 'nobody waiting once paired');

// Existing teams' records must be identical before/after the roster grew.
const recordsWithLate = teamRecords(roster, allGames);
let recordsIntact = true;
for (const [key, record] of recordsAfterR3) {
  if (recordsWithLate.get(key) !== record) recordsIntact = false;
}
assert(recordsIntact, 'every original team keeps its exact record after the add');
assert(
  recordsWithLate.get('late1+late2') === '0-0(0)',
  `new team starts 0-0 (got ${recordsWithLate.get('late1+late2')})`
);

const r4 = playRound(roster, allGames, 4, 2);
assert(JSON.stringify(allGames) === snapshotAfterR3, 'R1-R3 games untouched by pairing');
assert(r4.games.length === 2, 'R4: 5 teams on 2 courts -> 2 games + 1 bye');
const r4PlayerIds = new Set(
  r4.games.flatMap((g) => [...g.team1, ...g.team2].map((p) => p.id))
);
assert(
  r4PlayerIds.has('late1') && r4PlayerIds.has('late2'),
  'new team plays immediately (fewest-games court priority)'
);
assert(
  r4.byeTeams.length === 1 && !r4.byeTeams.some((t) => teamKey(t) === 'late1+late2'),
  'the single bye goes to an original team, not the newcomers'
);
scoreAll(r4.games, roster);
allGames.push(...r4.games);

// --- Late arrivals #3+#4: added without explicit pairing --------------------
console.log('\nLate arrivals: two unpaired players auto-pair in add order');
roster.push({ id: 'late3', name: 'Late Three' });
roster.push({ id: 'late4', name: 'Late Four' });

const autoPaired = createTeamsFromRoster(roster as any);
assert(autoPaired.teams.length === 6, 'unpaired even arrivals auto-pair into a team');
assert(autoPaired.waitingPlayers.length === 0, 'no waiting players with an even pool');
assert(
  autoPaired.teams.some((t) => teamKey(t) === 'late3+late4'),
  'auto-paired team is the two newest arrivals'
);

// --- Malformed partnerIds: dangling / self / duplicate ----------------------
console.log('\nMalformed partnerIds fall to the pool, never throw');
const malformed: LocalPlayer[] = [
  { id: 'm1', name: 'M1', partnerId: 'ghost' }, // dangling: partner doesn't exist
  { id: 'm2', name: 'M2', partnerId: 'm2' }, // self-referential
  { id: 'm3', name: 'M3', partnerId: 'm4' },
  { id: 'm4', name: 'M4', partnerId: 'm3' }, // valid mutual pair
  { id: 'm5', name: 'M5', partnerId: 'm4' }, // duplicate: also points at m4 (non-mutual)
];
let malformedThrew = false;
let malformedResult: ReturnType<typeof derivePartnerships> | undefined;
try {
  malformedResult = derivePartnerships(malformed as any);
} catch {
  malformedThrew = true;
}
assert(!malformedThrew, 'malformed partnerIds never throw');
if (malformedResult) {
  assert(
    malformedResult.pairs.length === 1 &&
      malformedResult.pairs[0].map((p) => p.id).sort().join('+') === 'm3+m4',
    'only the mutual m3<->m4 pair forms; self/dangling/duplicate go to pool'
  );
  const poolIds = malformedResult.pool.map((p) => p.id).sort().join(',');
  assert(poolIds === 'm1,m2,m5', `pool holds the malformed players (got ${poolIds})`);
}

// --- Legacy roster: no partnerIds at all ------------------------------------
console.log('\nLegacy roster: adjacent pairing preserved');
const legacy: LocalPlayer[] = Array.from({ length: 8 }, (_, i) => ({
  id: `l${i + 1}`,
  name: `L${i + 1}`,
}));
const legacyRoster = createTeamsFromRoster(legacy as any);
const legacyOld = createTeamsFromPlayers(legacy as any);
assert(
  legacyRoster.teams.map(teamKey).join('|') === legacyOld.map(teamKey).join('|'),
  'partnerId-free roster pairs exactly like the old positional pairing'
);
assert(legacyRoster.waitingPlayers.length === 0, 'even legacy roster has no waiting players');

// --- Summary -----------------------------------------------------------------
if (failures.length) {
  console.log(`\n${failures.length} ASSERTION FAILURE(S):`);
  failures.forEach((f) => console.log('  FAIL ' + f));
  process.exit(1);
}
console.log('\nAll late-arrival scenarios PASS (no blocking, rounds untouched, smooth joins)');
