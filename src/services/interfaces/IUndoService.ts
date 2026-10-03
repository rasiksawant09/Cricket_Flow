import type { CricketBallEvent } from "../../models/CricketBallEvent";

export interface IUndoService {
  reverseBall(ballEvent: CricketBallEvent, reversalReason: string): Promise<Result<CricketBallEvent>>;
  correctBall(originalEvent: CricketBallEvent, correctionEvent: CricketBallEvent): Promise<Result<CricketBallEvent>>;
  rebuildAfterCorrection(matchId: string): Promise<Result<void>>;
}
