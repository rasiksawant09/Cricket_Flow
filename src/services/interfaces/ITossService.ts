import type { CricketMatch } from "../../models/CricketMatch";

export interface ITossService {
  recordToss(
    matchId: string,
    tossWinnerId: string,
    tossDecision: NonNullable<CricketMatch["promx_tossdecision"]>,
  ): Promise<Result<CricketMatch>>;
  updateToss(
    matchId: string,
    tossWinnerId: string,
    tossDecision: NonNullable<CricketMatch["promx_tossdecision"]>,
  ): Promise<Result<CricketMatch>>;
}
