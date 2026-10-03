import type { CricketBallEvent } from "../../models/CricketBallEvent";
import type { CricketMatchState } from "../../models/CricketMatchState";

export interface IProjectionService {
  rebuildMatchState(matchId: string): Promise<Result<CricketMatchState[]>>;
  refreshAfterEvent(ballEvent: CricketBallEvent): Promise<Result<void>>;
  rebuildAllProjections(): Promise<Result<void>>;
}
