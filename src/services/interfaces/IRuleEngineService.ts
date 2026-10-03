import type { CricketBallEvent } from "../../models/CricketBallEvent";
import type { CricketInnings } from "../../models/CricketInnings";
import type { CricketMatchPlayer } from "../../models/CricketMatchPlayer";

export interface IRuleEngineService {
  validateBall(ballEvent: CricketBallEvent): Promise<Result<void>>;
  validateWicket(ballEvent: CricketBallEvent): Promise<Result<void>>;
  validateBatter(batter: CricketMatchPlayer): Promise<Result<void>>;
  validateBowler(bowler: CricketMatchPlayer): Promise<Result<void>>;
  validateInningsTransition(innings: CricketInnings): Promise<Result<void>>;
}
