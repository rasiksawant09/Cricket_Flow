import type { CricketBallEvent } from "../../models/CricketBallEvent";
import type { CricketInnings } from "../../models/CricketInnings";
import type { CricketMatch } from "../../models/CricketMatch";
import type { CricketOver } from "../../models/CricketOver";

export interface IScoringService {
  processBall(ballEvent: CricketBallEvent): Promise<Result<CricketBallEvent>>;
  processWide(ballEvent: CricketBallEvent): Promise<Result<CricketBallEvent>>;
  processNoBall(ballEvent: CricketBallEvent): Promise<Result<CricketBallEvent>>;
  processWicket(ballEvent: CricketBallEvent): Promise<Result<CricketBallEvent>>;
  endOver(over: CricketOver): Promise<Result<CricketOver>>;
  endInnings(innings: CricketInnings): Promise<Result<CricketInnings>>;
  completeMatch(matchId: string): Promise<Result<CricketMatch>>;
}
