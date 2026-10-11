import type { CricketBallEvent } from "../../models/CricketBallEvent";
import type { CricketInnings } from "../../models/CricketInnings";
import type { CricketMatchState } from "../../models/CricketMatchState";

export interface IProjectionService {
  getMatchState(matchId: string): Promise<Result<CricketMatchState[]>>;
  syncInningsState(innings: CricketInnings): Promise<Result<CricketMatchState>>;
  rebuildBatterStatistics(matchId: string): Promise<Result<void>>;
  rebuildBowlerStatistics(matchId: string): Promise<Result<void>>;
  rebuildTournamentStandings(tournamentId: string): Promise<Result<void>>;
  rebuildMatchState(matchId: string): Promise<Result<CricketMatchState[]>>;
  rebuildMatchProjections(matchId: string): Promise<Result<void>>;
  refreshAfterEvent(ballEvent: CricketBallEvent): Promise<Result<void>>;
  rebuildAllProjections(): Promise<Result<void>>;
}
