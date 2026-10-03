import type { CricketMatch } from "../../models/CricketMatch";
import type { IMatchRepository } from "../../repositories/interfaces/IMatchRepository";
import type { ITossService } from "../interfaces/ITossService";
import { guardService, serviceFailure } from "./ServiceSupport";

export class TossService implements ITossService {
  private readonly matches: IMatchRepository;

  constructor(matches: IMatchRepository) {
    this.matches = matches;
  }

  recordToss(
    matchId: string,
    tossWinnerId: string,
    tossDecision: NonNullable<CricketMatch["promx_tossdecision"]>,
  ): Promise<Result<CricketMatch>> {
    return this.saveToss(matchId, tossWinnerId, tossDecision);
  }

  updateToss(
    matchId: string,
    tossWinnerId: string,
    tossDecision: NonNullable<CricketMatch["promx_tossdecision"]>,
  ): Promise<Result<CricketMatch>> {
    return this.saveToss(matchId, tossWinnerId, tossDecision);
  }

  private saveToss(
    matchId: string,
    tossWinnerId: string,
    tossDecision: NonNullable<CricketMatch["promx_tossdecision"]>,
  ): Promise<Result<CricketMatch>> {
    return guardService("Could not save toss details.", async () => {
      const match = await this.matches.getById(matchId);
      if (!match.success) return match;
      if (match.data.statuscode !== 1 && match.data.statuscode !== 796280001) {
        return serviceFailure("Could not save toss details.", new Error("Toss details can only be changed before the match is live."));
      }
      if (tossWinnerId !== match.data.promx_teama && tossWinnerId !== match.data.promx_teamb) {
        return serviceFailure("Could not save toss details.", new Error("Toss winner must be one of the match teams."));
      }
      return this.matches.update({ ...match.data, promx_tosswinner: tossWinnerId, promx_tossdecision: tossDecision });
    });
  }
}
