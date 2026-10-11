import type { CricketMatch } from "../../models/CricketMatch";

export interface MatchLimits {
  oversPerInnings: number;
  playersPerTeam: number;
}

export interface MatchResultOutcome {
  winnerTeamId: string | null;
  loserTeamId: string | null;
  resultType: 796280000 | 796280001 | 796280004;
}

export interface IMatchService {
  finalizeMatch(matchId: string, outcome: MatchResultOutcome): Promise<Result<CricketMatch>>;
  getMatchLimits(matchId: string): Promise<Result<MatchLimits>>;
  getMatches(): Promise<Result<CricketMatch[]>>;
  getMatch(matchId: string): Promise<Result<CricketMatch>>;
  validateMatchSetup(match: CricketMatch): Promise<Result<void>>;
  createMatch(match: CricketMatch): Promise<Result<CricketMatch>>;
  updateMatch(match: CricketMatch): Promise<Result<CricketMatch>>;
  startMatch(matchId: string): Promise<Result<CricketMatch>>;
  requireSuperOver(matchId: string): Promise<Result<CricketMatch>>;
  startSuperOver(matchId: string): Promise<Result<CricketMatch>>;
  abandonMatch(matchId: string): Promise<Result<CricketMatch>>;
  cancelMatch(matchId: string): Promise<Result<CricketMatch>>;
}
