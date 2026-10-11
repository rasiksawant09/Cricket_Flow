import type { CricketBatterStatistic } from "../../models/CricketBatterStatistic";
import type { CricketBowlerStatistic } from "../../models/CricketBowlerStatistic";

export interface TournamentBattingLeaderboardEntry {
  playerId: string;
  playerName: string;
  teamName: string;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  outs: number;
  strikeRate: number;
}

export interface TournamentBowlingLeaderboardEntry {
  playerId: string;
  playerName: string;
  teamName: string;
  overs: number;
  runsConceded: number;
  wickets: number;
  economy: number;
}

export interface TournamentLeaderboards {
  topRunScorers: TournamentBattingLeaderboardEntry[];
  topWicketTakers: TournamentBowlingLeaderboardEntry[];
  bestStrikeRates: TournamentBattingLeaderboardEntry[];
  bestEconomyRates: TournamentBowlingLeaderboardEntry[];
}

export interface InningsScorecardStatistics {
  inningsId: string;
  runs: number;
  wickets: number;
  legalBalls: number;
  batting: Array<{
    playerId: string;
    runs: number;
    ballsFaced: number;
    fours: number;
    sixes: number;
    strikeRate: number;
    dismissed: boolean;
  }>;
  bowling: Array<{
    playerId: string;
    overs: number;
    maidens: number;
    runsConceded: number;
    wickets: number;
    economy: number;
  }>;
  fallOfWickets: Array<{
    runs: number;
    wickets: number;
    playerId: string | null;
    legalBalls: number;
  }>;
}

export interface IStatisticsService {
  getInningsScorecard(matchId: string): Promise<Result<InningsScorecardStatistics[]>>;
  getBattingStatistics(matchId: string): Promise<Result<CricketBatterStatistic[]>>;
  getBowlingStatistics(matchId: string): Promise<Result<CricketBowlerStatistic[]>>;
  rebuildBattingStatistics(matchId: string): Promise<Result<CricketBatterStatistic[]>>;
  rebuildBowlingStatistics(matchId: string): Promise<Result<CricketBowlerStatistic[]>>;
  calculateBattingStats(matchId: string): Promise<Result<CricketBatterStatistic[]>>;
  calculateBowlingStats(matchId: string): Promise<Result<CricketBowlerStatistic[]>>;
  calculateStatisticsFromEvents(matchId: string): Promise<Result<void>>;
  getTournamentLeaderboards(tournamentId: string): Promise<Result<TournamentLeaderboards>>;
}
