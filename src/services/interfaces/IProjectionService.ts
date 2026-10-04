import type { CricketBallEvent } from "../../models/CricketBallEvent";
import type { CricketMatchState } from "../../models/CricketMatchState";

export interface IProjectionService {
  getMatchState(matchId: string): Promise<Result<CricketMatchState[]>>;
  rebuildMatchState(matchId: string): Promise<Result<CricketMatchState[]>>;
  refreshAfterEvent(ballEvent: CricketBallEvent): Promise<Result<void>>;
  rebuildAllProjections(): Promise<Result<void>>;
}
