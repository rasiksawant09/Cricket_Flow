import type { CricketMatch } from "../../models/CricketMatch";

export interface IMatchService {
  getMatches(): Promise<Result<CricketMatch[]>>;
  getMatch(matchId: string): Promise<Result<CricketMatch>>;
  validateMatchSetup(match: CricketMatch): Promise<Result<void>>;
  createMatch(match: CricketMatch): Promise<Result<CricketMatch>>;
  updateMatch(match: CricketMatch): Promise<Result<CricketMatch>>;
  startMatch(matchId: string): Promise<Result<CricketMatch>>;
  completeMatch(matchId: string): Promise<Result<CricketMatch>>;
  abandonMatch(matchId: string): Promise<Result<CricketMatch>>;
  cancelMatch(matchId: string): Promise<Result<CricketMatch>>;
}
