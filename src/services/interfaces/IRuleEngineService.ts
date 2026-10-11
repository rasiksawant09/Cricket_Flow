import type { CricketBallEvent } from "../../models/CricketBallEvent";
import type { CricketInnings } from "../../models/CricketInnings";
import type { CricketMatchPlayer } from "../../models/CricketMatchPlayer";

export interface IRuleEngineService {
  validateBall(ballEvent: CricketBallEvent): Promise<Result<void>>;
  validateInningsStart(innings: CricketInnings): Promise<Result<void>>;
  validateWicket(ballEvent: CricketBallEvent): Promise<Result<void>>;
  validateBatter(batter: CricketMatchPlayer): Promise<Result<void>>;
  validateBowler(bowler: CricketMatchPlayer): Promise<Result<void>>;
  validatePlayingXI(matchId: string): Promise<Result<void>>;
  isSuperOverEnabled(matchId: string): Promise<Result<boolean>>;
  validateInningsTransition(innings: CricketInnings): Promise<Result<void>>;
  getInningsOversLimit(matchId: string, defaultOvers: number): Promise<Result<number>>;
}
