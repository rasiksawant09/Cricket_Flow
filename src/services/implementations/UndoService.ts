import type { CricketBallEvent } from "../../models/CricketBallEvent";
import { CRICKET_BALL_EVENT_STATUS } from "../../models/CricketBallEvent";
import type { IBallEventRepository } from "../../repositories/interfaces/IBallEventRepository";
import type { IProjectionService } from "../interfaces/IProjectionService";
import type { IUndoService } from "../interfaces/IUndoService";
import { resolveOriginalBallEventId, selectEffectiveEvents } from "./MatchStateReducer";
import { guardService, readAllPages, serviceFailure } from "./ServiceSupport";

const DEAD_BALL_EVENT = 796280005;
const NORMAL_EVENT = 796280000;
const FOUR_BOUNDARY = 796280000;
const SIX_BOUNDARY = 796280001;

export class UndoService implements IUndoService {
  private readonly events: IBallEventRepository;
  private readonly projections: IProjectionService;

  constructor(events: IBallEventRepository, projections: IProjectionService) {
    this.events = events;
    this.projections = projections;
  }

  reverseBall(ballEvent: CricketBallEvent, reversalReason: string): Promise<Result<CricketBallEvent>> {
    return guardService("Could not reverse Ball Event.", async () => {
      const originalId = ballEvent.promx_cricketballeventid;
      if (!originalId) return serviceFailure("Could not reverse Ball Event.", new Error("The original Ball Event must have an ID."));
      if (!reversalReason.trim()) return serviceFailure("Could not reverse Ball Event.", new Error("A reversal reason is required."));

      const original = await this.events.getById(originalId);
      if (!original.success) return original;
      const history = await this.getMatchHistory(original.data.promx_match);
      if (!history.success) return history;
      const effective = selectEffectiveEvents(history.data);
      if (!effective.some((event) => event.promx_cricketballeventid === originalId)) {
        return serviceFailure("Could not reverse Ball Event.", new Error("Only the current effective Ball Event can be reversed."));
      }
      const rootId = resolveOriginalBallEventId(original.data, new Map(history.data.flatMap((event) =>
        event.promx_cricketballeventid ? [[event.promx_cricketballeventid, event] as const] : [],
      )));
      const sequence = history.data.reduce((max, event) => Math.max(max, event.promx_deliverysequencenumber), 0) + 1;
      const reversal = await this.events.createEvent({
        promx_balleventname: `Reversal of ${original.data.promx_balleventname}`,
        promx_ballnumber: original.data.promx_ballnumber,
        promx_deliverysequencenumber: sequence,
        promx_innings: original.data.promx_innings,
        promx_match: original.data.promx_match,
        promx_over: original.data.promx_over,
        promx_eventtype: DEAD_BALL_EVENT,
        promx_batterruns: 0,
        promx_extraruns: 0,
        promx_totalruns: 0,
        promx_islegaldelivery: false,
        promx_isboundary: false,
        promx_iswicket: false,
        promx_dismissalvalid: false,
        promx_parentballevent: rootId,
        promx_correctionreason: reversalReason.trim(),
        statuscode: CRICKET_BALL_EVENT_STATUS.reversed,
      });
      if (!reversal.success) return reversal;
      const rebuilt = await this.projections.rebuildMatchProjections(original.data.promx_match);
      if (!rebuilt.success) return rebuilt;
      return reversal;
    });
  }

  correctBall(originalEvent: CricketBallEvent, correctionEvent: CricketBallEvent): Promise<Result<CricketBallEvent>> {
    return guardService("Could not append corrected Ball Event.", async () => {
      const originalId = originalEvent.promx_cricketballeventid;
      if (!originalId) {
        return serviceFailure("Could not append corrected Ball Event.", new Error("The original Ball Event must have an ID."));
      }
      if (!correctionEvent.promx_correctionreason?.trim()) {
        return serviceFailure("Could not append corrected Ball Event.", new Error("A correction reason is required."));
      }
      const original = await this.events.getById(originalId);
      if (!original.success) return original;
      const history = await this.getMatchHistory(original.data.promx_match);
      if (!history.success) return history;
      const byId = new Map(history.data.flatMap((event) =>
        event.promx_cricketballeventid ? [[event.promx_cricketballeventid, event] as const] : [],
      ));
      const rootId = resolveOriginalBallEventId(original.data, byId);
      if (correctionEvent.promx_parentballevent && correctionEvent.promx_parentballevent !== rootId && correctionEvent.promx_parentballevent !== originalId) {
        return serviceFailure("Could not append corrected Ball Event.", new Error("The correction parent must reference the original Ball Event."));
      }
      if (correctionEvent.promx_match !== original.data.promx_match
        || correctionEvent.promx_innings !== original.data.promx_innings
        || correctionEvent.promx_over !== original.data.promx_over
        || correctionEvent.promx_deliverysequencenumber !== original.data.promx_deliverysequencenumber
        || correctionEvent.promx_ballnumber !== original.data.promx_ballnumber) {
        return serviceFailure("Could not append corrected Ball Event.", new Error("A correction must retain the original match, innings, over, and delivery position."));
      }
      if (correctionEvent.promx_eventtype !== original.data.promx_eventtype
        || correctionEvent.promx_islegaldelivery !== original.data.promx_islegaldelivery
        || correctionEvent.promx_iswicket !== original.data.promx_iswicket
        || correctionEvent.promx_dismissaltype !== original.data.promx_dismissaltype
        || correctionEvent.promx_dismissedplayer !== original.data.promx_dismissedplayer
        || correctionEvent.promx_strikerbeforeball !== original.data.promx_strikerbeforeball
        || correctionEvent.promx_nonstrikerbeforeball !== original.data.promx_nonstrikerbeforeball
        || correctionEvent.promx_strikerafterball !== original.data.promx_strikerafterball
        || correctionEvent.promx_nonstrikerafterball !== original.data.promx_nonstrikerafterball
        || correctionEvent.promx_bowler !== original.data.promx_bowler) {
        return serviceFailure("Could not append corrected Ball Event.", new Error("Corrections may change run values only; reverse and re-enter the delivery to change its participants or lifecycle."));
      }
      const batterRuns = correctionEvent.promx_batterruns ?? 0;
      const extraRuns = correctionEvent.promx_extraruns ?? 0;
      if (!Number.isInteger(batterRuns) || batterRuns < 0 || !Number.isInteger(extraRuns) || extraRuns < 0) {
        return serviceFailure("Could not append corrected Ball Event.", new Error("Corrected batter and extra runs must be non-negative whole numbers."));
      }
      if ((original.data.promx_eventtype === 796280001 || original.data.promx_eventtype === 796280002) && extraRuns < 1) {
        return serviceFailure("Could not append corrected Ball Event.", new Error("A corrected Wide or No Ball must retain at least one extra run."));
      }
      if (strikeRotationParity(original.data) !== strikeRotationParity({ ...original.data, promx_batterruns: batterRuns, promx_extraruns: extraRuns })) {
        return serviceFailure("Could not append corrected Ball Event.", new Error("The corrected runs would change strike rotation. Reverse and re-enter the delivery instead."));
      }
      const isBoundary = original.data.promx_eventtype === NORMAL_EVENT && (batterRuns === 4 || batterRuns === 6);
      const corrected = await this.events.createEvent({
        ...original.data,
        ...correctionEvent,
        promx_cricketballeventid: undefined,
        promx_parentballevent: rootId,
        promx_correctionreason: correctionEvent.promx_correctionreason.trim(),
        promx_totalruns: batterRuns + extraRuns,
        promx_isboundary: isBoundary,
        promx_boundarytype: isBoundary ? (batterRuns === 4 ? FOUR_BOUNDARY : SIX_BOUNDARY) : null,
        statuscode: CRICKET_BALL_EVENT_STATUS.corrected,
      });
      if (!corrected.success) return corrected;
      const rebuilt = await this.projections.rebuildMatchProjections(original.data.promx_match);
      if (!rebuilt.success) return rebuilt;
      return corrected;
    });
  }

  rebuildAfterCorrection(matchId: string): Promise<Result<void>> {
    return guardService("Could not rebuild projections after correction.", () => this.projections.rebuildMatchProjections(matchId));
  }

  private getMatchHistory(matchId: string): Promise<Result<CricketBallEvent[]>> {
    return readAllPages("Could not retrieve Ball Event lineage.", (cursor) =>
      this.events.getByMatch(matchId, undefined, cursor),
    );
  }
}

function strikeRotationParity(event: CricketBallEvent): number {
  switch (event.promx_eventtype) {
    case 796280001:
      return Math.max((event.promx_extraruns ?? 0) - 1, 0) % 2;
    case 796280003:
    case 796280004:
      return (event.promx_extraruns ?? 0) % 2;
    case 796280000:
    case 796280002:
      return (event.promx_batterruns ?? 0) % 2;
    default:
      return 0;
  }
}
