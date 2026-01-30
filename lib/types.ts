export interface Player {
  id: string;
  name: string;
}

export interface Match {
  id: string;
  round: number;
  team1: [Player, Player];
  team2: [Player, Player];
  score1?: number;
  score2?: number;
  completed: boolean;
}

export interface PlayerStanding {
  player: Player;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
  gamesPlayed: number;
  apd: number; // Average Point Differential
  winPct: number; // Win percentage
}
