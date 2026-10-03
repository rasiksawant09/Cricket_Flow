import type { CricketBallEvent } from "../../models/CricketBallEvent";
import type { IBallEventRepository } from "../../repositories/interfaces/IBallEventRepository";
import type { IProjectionService } from "../interfaces/IProjectionService";
import type { IUndoService } from "../interfaces/IUndoService";
import { guardService, serviceFailure } from "./ServiceSupport";

export class UndoService implements IUndoService {
  private readonly events: IBallEventRepository;
  private readonly projections: IProjectionService;

  constructor(events: IBallEventRepository, projections: IProjectionService) {
    this.events = events;
    this.projections = projections;
  }

  reverseBall(ballEvent: CricketBallEvent, reversalReason: string): Promise<Result<CricketBallEvent>> {
    if (!ballEvent.promx_cricketballeventid) {
      return Promise.resolve(serviceFailure("Could not reverse Ball Event.", new Error("The original Ball Event must have an ID.")));
    }
    if (reversalReason.trim().length === 0) {
      return Promise.resolve(serviceFailure("Could not reverse Ball Event.", new Error("A reversal reason is required.")));
    }
    return Promise.resolve(serviceFailure(
      "Could not reverse Ball Event.",
      new Error("The append-only reversal event representation is not specified; refusing to mutate or duplicate the original event."),
    ));
  }

  correctBall(originalEvent: CricketBallEvent, correctionEvent: CricketBallEvent): Promise<Result<CricketBallEvent>> {
    return guardService("Could not append corrected Ball Event.", async () => {
      if (!originalEvent.promx_cricketballeventid) {
        return serviceFailure("Could not append corrected Ball Event.", new Error("The original Ball Event must have an ID."));
      }
      if (correctionEvent.promx_parentballevent !== originalEvent.promx_cricketballeventid) {
        return serviceFailure("Could not append corrected Ball Event.", new Error("The correction must link to the original with promx_parentballevent."));
      }
      if (!correctionEvent.promx_correctionreason?.trim()) {
        return serviceFailure("Could not append corrected Ball Event.", new Error("A correction reason is required."));
      }
      return this.events.createEvent(correctionEvent);
    });
  }

  rebuildAfterCorrection(matchId: string): Promise<Result<void>> {
    return guardService("Could not rebuild projections after correction.", async () => {
      const events = await this.events.getByMatch(matchId);
      if (!events.success) return events;
      return this.projections.rebuildAllProjections();
    });
  }
}
