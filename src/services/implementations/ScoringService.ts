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
import type { IScoringService } from "../interfaces/IScoringService";
import { guardService, serviceFailure } from "./ServiceSupport";

const WIDE_EVENT = 796280001;
const NO_BALL_EVENT = 796280002;
const COMPLETED_STATUS = 2;

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

  private processEvent(ballEvent: CricketBallEvent): Promise<Result<CricketBallEvent>> {
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
      if (!refreshed.success) return refreshed;
      return created;
    });
  }
}
