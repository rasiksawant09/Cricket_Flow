import type { CricketBallEvent } from "../../models/CricketBallEvent";
import type { CricketInnings } from "../../models/CricketInnings";
import type { CricketMatch } from "../../models/CricketMatch";
import type { CricketOver } from "../../models/CricketOver";
import type { IBallEventRepository } from "../../repositories/interfaces/IBallEventRepository";
import type { IInningsRepository } from "../../repositories/interfaces/IInningsRepository";
import type { IMatchRepository } from "../../repositories/interfaces/IMatchRepository";
import type { IOverRepository } from "../../repositories/interfaces/IOverRepository";
import type { IMatchService } from "../interfaces/IMatchService";
import type { IProjectionService } from "../interfaces/IProjectionService";
import type { IRuleEngineService } from "../interfaces/IRuleEngineService";
import type { IScoringService, DeliveryInput, DeliveryOutcome, LiveScoringSnapshot } from "../interfaces/IScoringService";
import { guardService, readAllPages, serviceFailure } from "./ServiceSupport";

const WIDE_EVENT = 796280001;
const NO_BALL_EVENT = 796280002;
const COMPLETED_STATUS = 2;
const LIVE_INNINGS_STATUS = 796280001;
const RECENT_EVENT_COUNT = 12;

const EVENT_TYPE = { normal: 796280000, wide: 796280001, noBall: 796280002, bye: 796280003, legBye: 796280004 } as const;

function isActive(event: CricketBallEvent): boolean {
  return event.statuscode === undefined || event.statuscode === null || event.statuscode === 1;
}

export class ScoringService implements IScoringService {
  private readonly events: IBallEventRepository;
  private readonly overs: IOverRepository;
  private readonly innings: IInningsRepository;
  private readonly matches: IMatchRepository;
  private readonly rules: IRuleEngineService;
  private readonly matchService: IMatchService;
  private readonly projections: IProjectionService;

  constructor(
    events: IBallEventRepository,
    overs: IOverRepository,
    innings: IInningsRepository,
    matches: IMatchRepository,
    rules: IRuleEngineService,
    matchService: IMatchService,
    projections: IProjectionService,
  ) {
    this.events = events;
    this.overs = overs;
    this.innings = innings;
    this.matches = matches;
    this.rules = rules;
    this.matchService = matchService;
    this.projections = projections;
  }

  processBall(ballEvent: CricketBallEvent): Promise<Result<CricketBallEvent>> {
    return this.processEvent(ballEvent);
  }

  processWide(ballEvent: CricketBallEvent): Promise<Result<CricketBallEvent>> {
    if (ballEvent.promx_eventtype !== WIDE_EVENT) {
      return Promise.resolve(serviceFailure("Could not process wide.", new Error("Ball Event type is not Wide.")));
    }
    return this.processEvent(ballEvent);
  }

  processNoBall(ballEvent: CricketBallEvent): Promise<Result<CricketBallEvent>> {
    if (ballEvent.promx_eventtype !== NO_BALL_EVENT) {
      return Promise.resolve(serviceFailure("Could not process no-ball.", new Error("Ball Event type is not No Ball.")));
    }
    return this.processEvent(ballEvent);
  }

  processWicket(ballEvent: CricketBallEvent): Promise<Result<CricketBallEvent>> {
    return guardService("Could not process wicket.", async () => {
      const validation = await this.rules.validateWicket(ballEvent);
      if (!validation.success) return validation;
      return this.processEvent(ballEvent);
    });
  }

  endOver(over: CricketOver): Promise<Result<CricketOver>> {
    return guardService("Could not complete over.", async () => {
      const id = over.promx_cricketoverid;
      if (!id) {
        return serviceFailure("Could not complete over.", new Error("An over ID is required."));
      }
      const current = await this.overs.getById(id);
      if (!current.success) return current;
      return this.overs.update({ ...current.data, statuscode: COMPLETED_STATUS });
    });
  }

  endInnings(innings: CricketInnings): Promise<Result<CricketInnings>> {
    return guardService("Could not complete innings.", async () => {
      const validation = await this.rules.validateInningsTransition(innings);
      if (!validation.success) return validation;
      const id = innings.promx_cricketinningsid;
      if (!id) {
        return serviceFailure("Could not complete innings.", new Error("An innings ID is required."));
      }
      const current = await this.innings.getById(id);
      if (!current.success) return current;
      return this.innings.update({ ...current.data, statuscode: COMPLETED_STATUS });
    });
  }

  completeMatch(matchId: string): Promise<Result<CricketMatch>> {
    return guardService("Could not complete match.", () => this.matchService.completeMatch(matchId));
  }

  getLiveScoringSnapshot(matchId: string): Promise<Result<LiveScoringSnapshot>> {
    return guardService("Could not load live scoring state.", async () => {
      const states = await this.projections.getMatchState(matchId);
      if (!states.success) return states;
      const inningsList = await readAllPages("Could not retrieve innings.", (cursor) =>
        this.innings.getByMatch(matchId, undefined, cursor),
      );
      if (!inningsList.success) return inningsList;

      const live = inningsList.data.find((item) => item.statuscode === LIVE_INNINGS_STATUS) ?? null;
      const snapshot: LiveScoringSnapshot = {
        matchId,
        innings: live,
        matchState: null,
        currentOver: null,
        currentOverEvents: [],
        recentEvents: [],
      };
      if (!live?.promx_cricketinningsid) {
        return { success: true, data: snapshot };
      }

      const inningsId = live.promx_cricketinningsid;
      const overs = await readAllPages("Could not retrieve overs.", (cursor) =>
        this.overs.getByInnings(inningsId, undefined, cursor),
      );
      if (!overs.success) return overs;
      const events = await readAllPages("Could not retrieve Ball Events.", (cursor) =>
        this.events.getByInnings(inningsId, undefined, cursor),
      );
      if (!events.success) return events;

      const active = events.data.filter(isActive).sort((a, b) => a.promx_deliverysequencenumber - b.promx_deliverysequencenumber);
      const openOver = overs.data
        .filter((over) => over.statuscode !== COMPLETED_STATUS)
        .sort((a, b) => b.promx_overnumber - a.promx_overnumber)[0] ?? null;

      snapshot.matchState = states.data.find((state) => state.promx_innings === inningsId) ?? null;
      snapshot.currentOver = openOver;
      snapshot.currentOverEvents = openOver ? active.filter((event) => event.promx_over === openOver.promx_cricketoverid) : [];
      snapshot.recentEvents = active.slice(-RECENT_EVENT_COUNT).reverse();
      return { success: true, data: snapshot };
    });
  }

  recordDelivery(input: DeliveryInput): Promise<Result<DeliveryOutcome>> {
    return guardService("Could not record delivery.", async () => {
      if (!Number.isInteger(input.runs) || input.runs < 0) {
        return serviceFailure("Could not record delivery.", new Error("Runs must be a non-negative whole number."));
      }
      if ((input.kind === "bye" || input.kind === "legBye") && input.runs < 1) {
        return serviceFailure("Could not record delivery.", new Error("Byes and leg byes require at least one run."));
      }

      const snapshot = await this.getLiveScoringSnapshot(input.matchId);
      if (!snapshot.success) return snapshot;
      const { innings, currentOver, matchState } = snapshot.data;
      if (!innings?.promx_cricketinningsid) {
        return serviceFailure("Could not record delivery.", new Error("The match has no live innings."));
      }
      if (!currentOver?.promx_cricketoverid) {
        return serviceFailure("Could not record delivery.", new Error("The live innings has no open over; over creation is not supported here."));
      }

      const inningsEvents = await readAllPages("Could not retrieve Ball Events.", (cursor) =>
        this.events.getByInnings(innings.promx_cricketinningsid ?? "", undefined, cursor),
      );
      if (!inningsEvents.success) return inningsEvents;
      const active = inningsEvents.data.filter(isActive);
      const sequence = active.reduce((max, event) => Math.max(max, event.promx_deliverysequencenumber), 0) + 1;
      const overId = currentOver.promx_cricketoverid;
      const legalInOver = active.filter((event) => event.promx_over === overId && event.promx_islegaldelivery === true).length;

      const striker = matchState?.promx_currentstriker ?? null;
      const nonStriker = matchState?.promx_currentnonstriker ?? null;
      const bowler = matchState?.promx_currentbowler ?? currentOver.promx_bowler ?? null;
      const dismissed = input.dismissedBatter === "nonStriker" ? nonStriker : striker;
      if (input.kind === "wicket" && (input.dismissalType === undefined || !dismissed)) {
        return serviceFailure("Could not record delivery.", new Error("A wicket requires a dismissal type and a known dismissed batter."));
      }

      const eventType = input.kind === "wide" ? EVENT_TYPE.wide
        : input.kind === "noBall" ? EVENT_TYPE.noBall
          : input.kind === "bye" ? EVENT_TYPE.bye
            : input.kind === "legBye" ? EVENT_TYPE.legBye
              : EVENT_TYPE.normal;
      const legal = input.kind !== "wide" && input.kind !== "noBall";
      const batterRuns = input.kind === "runs" || input.kind === "noBall" ? input.runs : 0;
      const extraRuns = input.kind === "wide" || input.kind === "noBall" ? 1 + (input.kind === "wide" ? input.runs : 0)
        : input.kind === "bye" || input.kind === "legBye" ? input.runs : 0;
      const ballNumber = legalInOver + 1;

      const ballEvent: CricketBallEvent = {
        promx_balleventname: `Over ${currentOver.promx_overnumber}.${ballNumber} ${input.kind}`,
        promx_ballnumber: ballNumber,
        promx_deliverysequencenumber: sequence,
        promx_innings: innings.promx_cricketinningsid,
        promx_match: input.matchId,
        promx_over: overId,
        promx_eventtype: eventType,
        promx_batterruns: batterRuns,
        promx_extraruns: extraRuns,
        promx_totalruns: batterRuns + extraRuns,
        promx_islegaldelivery: legal,
        promx_isboundary: input.kind === "runs" && (input.runs === 4 || input.runs === 6),
        promx_boundarytype: input.kind === "runs" && input.runs === 4 ? 796280000 : input.kind === "runs" && input.runs === 6 ? 796280001 : null,
        promx_iswicket: input.kind === "wicket",
        promx_dismissaltype: input.kind === "wicket" ? input.dismissalType : null,
        promx_dismissedplayer: input.kind === "wicket" ? dismissed : null,
        promx_striker: striker,
        promx_nonstriker: nonStriker,
        promx_strikerbeforeball: striker,
        promx_nonstrikerbeforeball: nonStriker,
        promx_bowler: bowler,
        statuscode: 1,
      };

      if (input.kind === "wicket") {
        const validation = await this.rules.validateWicket(ballEvent);
        if (!validation.success) return validation;
      }
      return this.persistEvent(ballEvent);
    });
  }

  private processEvent(ballEvent: CricketBallEvent): Promise<Result<CricketBallEvent>> {
    return guardService("Could not process Ball Event.", async () => {
      const outcome = await this.persistEvent(ballEvent);
      if (!outcome.success) return outcome;
      if (outcome.data.projectionError) {
        return { success: false, error: outcome.data.projectionError };
      }
      return { success: true, data: outcome.data.event };
    });
  }

  private persistEvent(ballEvent: CricketBallEvent): Promise<Result<DeliveryOutcome>> {
    return guardService("Could not process Ball Event.", async () => {
      const match = await this.matches.getById(ballEvent.promx_match);
      if (!match.success) return match;
      if (match.data.statuscode !== 796280002 && match.data.statuscode !== 796280005) {
        return serviceFailure("Could not process Ball Event.", new Error("Scoring is accepted only while the match is live."));
      }
      const validation = await this.rules.validateBall(ballEvent);
      if (!validation.success) return validation;
      const created = await this.events.createEvent(ballEvent);
      if (!created.success) return created;
      const refreshed = await this.projections.refreshAfterEvent(created.data);
      return {
        success: true,
        data: refreshed.success ? { event: created.data } : { event: created.data, projectionError: refreshed.error },
      };
    });
  }
}
