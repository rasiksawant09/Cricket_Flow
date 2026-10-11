import type { CricketBallEvent } from "../../models/CricketBallEvent";
import type { CricketInnings } from "../../models/CricketInnings";
import type { CricketMatch } from "../../models/CricketMatch";
import type { CricketOver } from "../../models/CricketOver";
import type { IBallEventRepository } from "../../repositories/interfaces/IBallEventRepository";
import type { IInningsRepository } from "../../repositories/interfaces/IInningsRepository";
import type { IMatchRepository } from "../../repositories/interfaces/IMatchRepository";
import type { IMatchPlayerRepository } from "../../repositories/interfaces/IMatchPlayerRepository";
import type { IOverRepository } from "../../repositories/interfaces/IOverRepository";
import type { ITournamentPlayerRepository } from "../../repositories/interfaces/ITournamentPlayerRepository";
import type { IMatchService } from "../interfaces/IMatchService";
import type { IProjectionService } from "../interfaces/IProjectionService";
import type { IRuleEngineService } from "../interfaces/IRuleEngineService";
import type { IScoringService, DeliveryInput, DeliveryOutcome, InningsEndReason, LiveScoringSnapshot, MatchResultSummary } from "../interfaces/IScoringService";
import { determineMatchResult } from "./MatchResult";
import { BALLS_PER_OVER, countLegalByOver, evaluateInningsEnd, formatOvers, reduceInnings, selectEffectiveEvents } from "./MatchStateReducer";
import type { ReducedInningsState } from "./MatchStateReducer";
import { guardService, readAllPages, serviceFailure } from "./ServiceSupport";

const WIDE_EVENT = 796280001;
const NO_BALL_EVENT = 796280002;
const COMPLETED_STATUS = 2;
const LIVE_INNINGS_STATUS = 796280001;
const ALL_OUT_INNINGS_STATUS = 796280003;
const ENDED_INNINGS_STATUSES: readonly (number | null | undefined)[] = [COMPLETED_STATUS, 796280002, ALL_OUT_INNINGS_STATUS];
const MATCH_LIVE_STATUSES: readonly (number | null | undefined)[] = [796280002, 796280005];
const SUPER_OVER_REQUIRED_STATUS = 796280004;
const SUPER_OVER_LIVE_STATUS = 796280005;
const SUPER_OVER_INNINGS_TYPE = 796280001;
const SUPER_OVER_LIMIT = 1;
const BAT_DECISION = 796280000;
const OVER_IN_PROGRESS_STATUS = 796280001;
const RECENT_EVENT_COUNT = 12;

const EVENT_TYPE = { normal: 796280000, wide: 796280001, noBall: 796280002, bye: 796280003, legBye: 796280004 } as const;
const RETIRED_HURT_DISMISSAL = 796280007;

interface LiveContext {
  innings: CricketInnings | null;
  allInnings: CricketInnings[];
  overs: CricketOver[];
  events: CricketBallEvent[];
}

interface NextInningsPlan {
  inningsNumber: number;
  battingTeam: string;
  bowlingTeam: string;
  target: number | null;
  isSuperOver?: boolean;
}

function isSuperOverInnings(innings: CricketInnings): boolean {
  return innings.promx_issuperover === true || innings.promx_inningstype === SUPER_OVER_INNINGS_TYPE;
}

function failure<T>(message: string): Result<T> {
  return serviceFailure("Could not record delivery.", new Error(message));
}

export class ScoringService implements IScoringService {
  private readonly events: IBallEventRepository;
  private readonly overs: IOverRepository;
  private readonly innings: IInningsRepository;
  private readonly matches: IMatchRepository;
  private readonly matchPlayers: IMatchPlayerRepository;
  private readonly tournamentPlayers: ITournamentPlayerRepository;
  private readonly rules: IRuleEngineService;
  private readonly matchService: IMatchService;
  private readonly projections: IProjectionService;

  constructor(
    events: IBallEventRepository,
    overs: IOverRepository,
    innings: IInningsRepository,
    matches: IMatchRepository,
    matchPlayers: IMatchPlayerRepository,
    tournamentPlayers: ITournamentPlayerRepository,
    rules: IRuleEngineService,
    matchService: IMatchService,
    projections: IProjectionService,
  ) {
    this.events = events;
    this.overs = overs;
    this.innings = innings;
    this.matches = matches;
    this.matchPlayers = matchPlayers;
    this.tournamentPlayers = tournamentPlayers;
    this.rules = rules;
    this.matchService = matchService;
    this.projections = projections;
  }

  getMatchEvents(matchId: string): Promise<Result<CricketBallEvent[]>> {
    return readAllPages("Could not retrieve match Ball Events.", (cursor) =>
      this.events.getByMatch(matchId, undefined, cursor),
    );
  }

  getMatchInnings(matchId: string): Promise<Result<CricketInnings[]>> {
    return readAllPages("Could not retrieve match innings.", (cursor) =>
      this.innings.getByMatch(matchId, undefined, cursor),
    );
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
    return guardService("Could not complete match.", async () => {
      const match = await this.matches.getById(matchId);
      if (!match.success) return match;
      if (match.data.statuscode === COMPLETED_STATUS) {
        return serviceFailure("Could not complete match.", new Error("The match result has already been finalized."));
      }
      const result = await this.deriveMatchResult(matchId);
      if (!result.success) return result;
      if (!result.data) {
        return serviceFailure("Could not complete match.", new Error("Both innings must be completed before the result is finalized."));
      }
      if (result.data.kind === "tie") {
        const innings = await readAllPages("Could not retrieve innings.", (cursor) =>
          this.innings.getByMatch(matchId, undefined, cursor),
        );
        if (!innings.success) return innings;
        if (!innings.data.some(isSuperOverInnings)) {
          const enabled = await this.rules.isSuperOverEnabled(matchId);
          if (!enabled.success) return enabled;
          if (enabled.data) return this.matchService.requireSuperOver(matchId);
        }
      }
      return this.matchService.finalizeMatch(matchId, {
        winnerTeamId: result.data.winnerTeamId,
        loserTeamId: result.data.loserTeamId,
        resultType: result.data.kind === "tie" ? 796280001 : result.data.kind === "superOverWin" ? 796280004 : 796280000,
      });
    });
  }

  getMatchResult(matchId: string): Promise<Result<MatchResultSummary | null>> {
    return guardService("Could not determine match result.", () => this.deriveMatchResult(matchId));
  }

  private async deriveMatchResult(matchId: string): Promise<Result<MatchResultSummary | null>> {
    const inningsList = await readAllPages("Could not retrieve innings.", (cursor) =>
      this.innings.getByMatch(matchId, undefined, cursor),
    );
    if (!inningsList.success) return inningsList;
    const superOvers = inningsList.data.filter(isSuperOverInnings)
      .sort((left, right) => left.promx_inningsnumber - right.promx_inningsnumber);
    if (superOvers.length > 0) {
      if (superOvers.length !== 2 || superOvers.some((innings) =>
        !ENDED_INNINGS_STATUSES.includes(innings.statuscode) || innings.promx_runs == null,
      )) {
        return { success: true, data: null };
      }
      const firstSuperOver = superOvers[0];
      const secondSuperOver = superOvers[1];
      if (!firstSuperOver || !secondSuperOver || firstSuperOver.promx_runs == null || secondSuperOver.promx_runs == null) {
        return { success: true, data: null };
      }
      if (firstSuperOver.promx_runs === secondSuperOver.promx_runs) {
        return { success: true, data: { kind: "tie", winnerTeamId: null, loserTeamId: null, margin: null } };
      }
      const winner = firstSuperOver.promx_runs > secondSuperOver.promx_runs ? firstSuperOver : secondSuperOver;
      const loser = winner === firstSuperOver ? secondSuperOver : firstSuperOver;
      return {
        success: true,
        data: { kind: "superOverWin", winnerTeamId: winner.promx_battingteam, loserTeamId: loser.promx_battingteam, margin: null },
      };
    }
    const first = inningsList.data.find((item) => item.promx_inningsnumber === 1);
    const second = inningsList.data.find((item) => item.promx_inningsnumber === 2);
    if (
      !first || !second
      || !ENDED_INNINGS_STATUSES.includes(first.statuscode)
      || !ENDED_INNINGS_STATUSES.includes(second.statuscode)
      || first.promx_runs == null || second.promx_runs == null
    ) {
      return { success: true, data: null };
    }
    const limits = await this.matchService.getMatchLimits(matchId);
    if (!limits.success) return limits;
    return {
      success: true,
      data: determineMatchResult(
        { battingTeam: first.promx_battingteam, bowlingTeam: first.promx_bowlingteam, runs: first.promx_runs, wickets: first.promx_wickets ?? 0 },
        { battingTeam: second.promx_battingteam, bowlingTeam: second.promx_bowlingteam, runs: second.promx_runs, wickets: second.promx_wickets ?? 0 },
        limits.data,
      ),
    };
  }

  getLiveScoringSnapshot(matchId: string): Promise<Result<LiveScoringSnapshot>> {
    return guardService("Could not load live scoring state.", async () => {
      const [states, context, match] = await Promise.all([
        this.projections.getMatchState(matchId),
        this.loadLiveContext(matchId),
        this.matches.getById(matchId),
      ]);
      if (!states.success) return states;
      if (!context.success) return context;

      const { innings, allInnings, overs, events } = context.data;
      if (!match.success) return match;
      const snapshot: LiveScoringSnapshot = {
        matchId,
        innings,
        matchState: null,
        currentOver: null,
        currentOverEvents: [],
        recentEvents: [],
        pending: { striker: false, nonStriker: false, bowler: false },
        dismissedPlayerIds: [],
        matchCompleted: match.data.statuscode === COMPLETED_STATUS,
        superOverRequired: match.data.statuscode === SUPER_OVER_REQUIRED_STATUS,
        canStartInnings: this.planNextInnings(match.data, allInnings).success,
        canUndo: false,
      };
      const inningsId = innings?.promx_cricketinningsid;
      if (!innings || !inningsId) {
        return { success: true, data: snapshot };
      }

      const effective = selectEffectiveEvents(events);
      const reduced = reduceInnings(inningsId, events);
      const openOver = this.findOpenOver(overs);
      const overFull = openOver?.promx_cricketoverid
        ? (countLegalByOver(events).get(openOver.promx_cricketoverid) ?? 0) >= BALLS_PER_OVER
        : false;

      snapshot.matchState = states.data.find((state) => state.promx_innings === inningsId) ?? null;
      snapshot.currentOver = openOver;
      snapshot.currentOverEvents = openOver ? effective.filter((event) => event.promx_over === openOver.promx_cricketoverid) : [];
      snapshot.recentEvents = effective.slice(-RECENT_EVENT_COUNT).reverse();
      const latestEvent = effective[effective.length - 1];
      // Reversing a ball from an already-closed over would leave that over short, so only the open over is undoable.
      snapshot.canUndo = Boolean(latestEvent?.promx_cricketballeventid
        && openOver?.promx_cricketoverid
        && latestEvent.promx_over === openOver.promx_cricketoverid);
      snapshot.pending = {
        striker: reduced.striker === null,
        nonStriker: reduced.nonStriker === null,
        bowler: reduced.bowler === null || overFull,
      };
      snapshot.dismissedPlayerIds = reduced.dismissedPlayerIds;
      return { success: true, data: snapshot };
    });
  }

  recordDelivery(input: DeliveryInput): Promise<Result<DeliveryOutcome>> {
    return guardService("Could not record delivery.", async () => {
      if (!Number.isInteger(input.runs) || input.runs < 0) {
        return failure("Runs must be a non-negative whole number.");
      }
      if ((input.kind === "bye" || input.kind === "legBye") && input.runs < 1) {
        return failure("Byes and leg byes require at least one run.");
      }

      const [match, context] = await Promise.all([
        this.matches.getById(input.matchId),
        this.loadLiveContext(input.matchId),
      ]);
      if (!match.success) return match;
      if (match.data.statuscode === COMPLETED_STATUS) {
        return failure("The match has been completed; no further deliveries are accepted.");
      }
      if (!MATCH_LIVE_STATUSES.includes(match.data.statuscode)) {
        return failure("Scoring is accepted only while the match is live.");
      }

      if (!context.success) return context;
      const { innings, overs, events } = context.data;
      const inningsId = innings?.promx_cricketinningsid;
      if (!innings || !inningsId) {
        return failure(context.data.allInnings.length > 0
          ? "The innings has been completed; no further deliveries are accepted."
          : "The match has no active innings.");
      }

      const reduced = reduceInnings(inningsId, events);
      const limits = await this.matchService.getMatchLimits(input.matchId);
      if (!limits.success) return limits;
      const configuredOvers = await this.rules.getInningsOversLimit(
        input.matchId,
        isSuperOverInnings(innings) ? SUPER_OVER_LIMIT : limits.data.oversPerInnings,
      );
      if (!configuredOvers.success) return configuredOvers;
      const effectiveLimits = { ...limits.data, oversPerInnings: configuredOvers.data };
      const earlyEnd = evaluateInningsEnd(reduced, effectiveLimits, innings.promx_target);
      if (earlyEnd) {
        await this.finishInnings(input.matchId, innings, overs, reduced, earlyEnd, null);
        return failure("The innings has ended; its lifecycle was updated. Reload to continue.");
      }
      const striker = reduced.striker ?? input.strikerId ?? null;
      const nonStriker = reduced.nonStriker ?? input.nonStrikerId ?? null;
      const selectedBowler = reduced.bowler ?? input.bowlerId ?? null;
      if (!striker) return failure("Select the batter on strike.");
      if (!nonStriker) return failure("Select the non-striker.");
      if (striker === nonStriker) return failure("The striker and non-striker must be different players.");
      if (reduced.dismissedPlayerIds.includes(striker) || reduced.dismissedPlayerIds.includes(nonStriker)) {
        return failure("A dismissed batter cannot return to the crease.");
      }
      if (!selectedBowler) return failure("Select the bowler for this over.");

      const dismissed = input.dismissedBatter === "nonStriker" ? nonStriker : striker;
      if (input.kind === "wicket" && input.dismissalType === undefined) {
        return failure("A wicket requires a dismissal type.");
      }

      const legalByOver = countLegalByOver(events);
      let over = this.findOpenOver(overs);
      if (over?.promx_cricketoverid && (legalByOver.get(over.promx_cricketoverid) ?? 0) >= BALLS_PER_OVER) {
        const advanced = await this.completeAndOpenNext(over, inningsId, overs, null);
        if (!advanced.success) return advanced;
        over = advanced.data;
      } else if (!over) {
        const opened = await this.openOver(inningsId, overs);
        if (!opened.success) return opened;
        over = opened.data;
      }
      const overId = over.promx_cricketoverid;
      if (!overId) return failure("The open over has no ID.");

      const legalInOver = legalByOver.get(overId) ?? 0;
      // Retiring hurt happens between deliveries: no ball is bowled and no wicket falls.
      const retiredHurt = input.kind === "wicket" && input.dismissalType === RETIRED_HURT_DISMISSAL;
      const legal = input.kind !== "wide" && input.kind !== "noBall" && !retiredHurt;
      const overDone = legalInOver + (legal ? 1 : 0) >= BALLS_PER_OVER;

      let afterStriker: string | null = striker;
      let afterNonStriker: string | null = nonStriker;
      if (input.kind === "wicket") {
        if (dismissed === striker) afterStriker = null;
        else afterNonStriker = null;
      } else if (input.runs % 2 === 1) {
        [afterStriker, afterNonStriker] = [afterNonStriker, afterStriker];
      }
      if (overDone) {
        [afterStriker, afterNonStriker] = [afterNonStriker, afterStriker];
      }

      const sequence = selectEffectiveEvents(events).reduce((max, event) => Math.max(max, event.promx_deliverysequencenumber), 0) + 1;
      const eventType = input.kind === "wide" ? EVENT_TYPE.wide
        : input.kind === "noBall" ? EVENT_TYPE.noBall
          : input.kind === "bye" ? EVENT_TYPE.bye
            : input.kind === "legBye" ? EVENT_TYPE.legBye
              : EVENT_TYPE.normal;
      const batterRuns = input.kind === "runs" || input.kind === "noBall" ? input.runs : 0;
      const extraRuns = input.kind === "wide" ? 1 + input.runs
        : input.kind === "noBall" ? 1
          : input.kind === "bye" || input.kind === "legBye" ? input.runs : 0;
      const ballNumber = legalInOver + 1;

      const ballEvent: CricketBallEvent = {
        promx_balleventname: `Over ${over.promx_overnumber}.${ballNumber} ${retiredHurt ? "retired hurt" : input.kind}`,
        promx_ballnumber: ballNumber,
        promx_deliverysequencenumber: sequence,
        promx_innings: inningsId,
        promx_match: input.matchId,
        promx_over: overId,
        promx_eventtype: eventType,
        promx_batterruns: batterRuns,
        promx_extraruns: extraRuns,
        promx_totalruns: batterRuns + extraRuns,
        promx_islegaldelivery: legal,
        promx_isboundary: input.kind === "runs" && (input.runs === 4 || input.runs === 6),
        promx_boundarytype: input.kind === "runs" && input.runs === 4 ? 796280000 : input.kind === "runs" && input.runs === 6 ? 796280001 : null,
        promx_iswicket: input.kind === "wicket" && !retiredHurt,
        promx_dismissaltype: input.kind === "wicket" ? input.dismissalType : null,
        promx_dismissedplayer: input.kind === "wicket" ? dismissed : null,
        ...(retiredHurt ? { promx_dismissalvalid: false } : {}),
        promx_striker: striker,
        promx_nonstriker: nonStriker,
        promx_strikerbeforeball: striker,
        promx_nonstrikerbeforeball: nonStriker,
        promx_strikerafterball: afterStriker,
        promx_nonstrikerafterball: afterNonStriker,
        promx_bowler: selectedBowler,
        statuscode: 1,
      };

      if (input.kind === "wicket" && !retiredHurt) {
        const validation = await this.rules.validateWicket(ballEvent);
        if (!validation.success) return validation;
      }
      const created = await this.appendEvent(ballEvent);
      if (!created.success) return created;

      let overError: Error | undefined;
      let overCompleted = false;
      let lifecycleError: Error | undefined;
      let nextInningsOpened = false;
      let matchCompleted = false;
      let superOverRequired = false;

      const afterEvents = [...events, created.data];
      const endReason = evaluateInningsEnd(reduceInnings(inningsId, afterEvents), effectiveLimits, innings.promx_target);
      if (endReason) {
        const currentOvers = [...overs.filter((item) => item.promx_cricketoverid !== overId), over];
        const finished = await this.finishInnings(
          input.matchId,
          innings,
          currentOvers,
          reduceInnings(inningsId, afterEvents),
          endReason,
          selectedBowler,
        );
        overCompleted = true;
        nextInningsOpened = finished.nextInningsOpened;
        matchCompleted = finished.matchCompleted;
        superOverRequired = finished.superOverRequired;
        lifecycleError = finished.error;
      } else if (overDone) {
        const advanced = await this.completeAndOpenNext(over, inningsId, [...overs, over], selectedBowler);
        overCompleted = advanced.success;
        if (!advanced.success) overError = advanced.error;
      } else if (over.promx_bowler !== selectedBowler) {
        const updated = await this.overs.update({ ...over, promx_bowler: selectedBowler });
        if (!updated.success) overError = updated.error;
      }

      const refreshed = await this.projections.refreshAfterEvent(created.data);
      return {
        success: true,
        data: {
          event: created.data,
          overCompleted,
          ...(endReason ? { inningsEnded: endReason } : {}),
          nextInningsOpened,
          matchCompleted,
          ...(superOverRequired ? { superOverRequired: true } : {}),
          ...(overError ? { overError } : {}),
          ...(lifecycleError ? { lifecycleError } : {}),
          ...(refreshed.success ? {} : { projectionError: refreshed.error }),
        },
      };
    });
  }

  startInnings(matchId: string): Promise<Result<CricketInnings>> {
    return guardService("Could not start innings.", async () => {
      const match = await this.matches.getById(matchId);
      if (!match.success) return match;
      const inningsList = await readAllPages("Could not retrieve innings.", (cursor) =>
        this.innings.getByMatch(matchId, undefined, cursor),
      );
      if (!inningsList.success) return inningsList;
      const plan = this.planNextInnings(match.data, inningsList.data);
      if (!plan.success) return plan;
      if (plan.data.isSuperOver && match.data.statuscode === SUPER_OVER_REQUIRED_STATUS) {
        const started = await this.matchService.startSuperOver(matchId);
        if (!started.success) return started;
      }
      return this.createInnings(matchId, plan.data);
    });
  }

  private planNextInnings(match: CricketMatch, inningsList: readonly CricketInnings[]): Result<NextInningsPlan> {
    const fail = (message: string): Result<NextInningsPlan> => serviceFailure("Could not start innings.", new Error(message));
    if (match.statuscode === SUPER_OVER_REQUIRED_STATUS || match.statuscode === SUPER_OVER_LIVE_STATUS) {
      if (inningsList.some((item) => item.statuscode === LIVE_INNINGS_STATUS)) {
        return fail("An innings is already live.");
      }
      const regulationFirst = inningsList.find((item) => item.promx_inningsnumber === 1 && !isSuperOverInnings(item));
      const regulationSecond = inningsList.find((item) => item.promx_inningsnumber === 2 && !isSuperOverInnings(item));
      if (!regulationFirst || !regulationSecond
        || !ENDED_INNINGS_STATUSES.includes(regulationFirst.statuscode)
        || !ENDED_INNINGS_STATUSES.includes(regulationSecond.statuscode)) {
        return fail("Both regulation innings must be complete before starting a Super Over.");
      }
      const superOvers = inningsList.filter(isSuperOverInnings)
        .sort((left, right) => left.promx_inningsnumber - right.promx_inningsnumber);
      if (superOvers.length === 0) {
        return {
          success: true,
          data: {
            inningsNumber: 3,
            battingTeam: regulationSecond.promx_battingteam,
            bowlingTeam: regulationFirst.promx_battingteam,
            target: null,
            isSuperOver: true,
          },
        };
      }
      const firstSuperOver = superOvers[0];
      if (superOvers.length === 1 && firstSuperOver
        && ENDED_INNINGS_STATUSES.includes(firstSuperOver.statuscode)
        && firstSuperOver.promx_runs != null) {
        return {
          success: true,
          data: {
            inningsNumber: 4,
            battingTeam: firstSuperOver.promx_bowlingteam,
            bowlingTeam: firstSuperOver.promx_battingteam,
            target: firstSuperOver.promx_runs + 1,
            isSuperOver: true,
          },
        };
      }
      return fail("Both Super Over innings are already complete or in progress.");
    }
    if (!MATCH_LIVE_STATUSES.includes(match.statuscode)) {
      return fail("Innings can only be started while the match is live.");
    }
    if (inningsList.some((item) => item.statuscode === LIVE_INNINGS_STATUS)) {
      return fail("An innings is already live.");
    }
    if (inningsList.length === 0) {
      if (!match.promx_tosswinner || match.promx_tossdecision == null) {
        return fail("Record the toss before starting the first innings.");
      }
      const tossWinnerBats = match.promx_tossdecision === BAT_DECISION;
      const otherTeam = match.promx_tosswinner === match.promx_teama ? match.promx_teamb : match.promx_teama;
      return {
        success: true,
        data: {
          inningsNumber: 1,
          battingTeam: tossWinnerBats ? match.promx_tosswinner : otherTeam,
          bowlingTeam: tossWinnerBats ? otherTeam : match.promx_tosswinner,
          target: null,
        },
      };
    }
    const first = inningsList.find((item) => item.promx_inningsnumber === 1);
    if (inningsList.length === 1 && first && ENDED_INNINGS_STATUSES.includes(first.statuscode)) {
      if (first.promx_runs == null) {
        return fail("The first innings total is not recorded.");
      }
      return {
        success: true,
        data: {
          inningsNumber: 2,
          battingTeam: first.promx_bowlingteam,
          bowlingTeam: first.promx_battingteam,
          target: first.promx_runs + 1,
        },
      };
    }
    return fail("All innings are completed.");
  }

  private async createInnings(matchId: string, plan: NextInningsPlan): Promise<Result<CricketInnings>> {
    const innings: CricketInnings = {
      promx_match: matchId,
      promx_battingteam: plan.battingTeam,
      promx_bowlingteam: plan.bowlingTeam,
      promx_inningsname: plan.isSuperOver ? `Super Over ${plan.inningsNumber - 2}` : `Innings ${plan.inningsNumber}`,
      promx_inningsnumber: plan.inningsNumber,
      promx_inningstype: plan.isSuperOver ? SUPER_OVER_INNINGS_TYPE : 796280000,
      promx_issuperover: plan.isSuperOver ?? false,
      promx_target: plan.target,
      statuscode: LIVE_INNINGS_STATUS,
    };
    const validation = await this.rules.validateInningsStart(innings);
    if (!validation.success) return validation;
    const created = await this.innings.create(innings);
    if (!created.success) return created;
    const state = await this.projections.syncInningsState(created.data);
    if (!state.success) return state;
    return created;
  }

  private async finishInnings(
    matchId: string,
    innings: CricketInnings,
    overs: readonly CricketOver[],
    reduced: ReducedInningsState,
    reason: InningsEndReason,
    bowlerId: string | null,
  ): Promise<{ nextInningsOpened: boolean; matchCompleted: boolean; superOverRequired: boolean; error?: Error }> {
    const outcome: { nextInningsOpened: boolean; matchCompleted: boolean; superOverRequired: boolean; error?: Error } = {
      nextInningsOpened: false,
      matchCompleted: false,
      superOverRequired: false,
    };
    try {
      for (const open of overs.filter((item) => item.statuscode !== COMPLETED_STATUS)) {
        const closed = await this.overs.update({ ...open, promx_bowler: open.promx_bowler ?? bowlerId, statuscode: COMPLETED_STATUS });
        if (!closed.success) {
          outcome.error = closed.error;
          return outcome;
        }
      }

      const ended = await this.innings.update({
        ...innings,
        promx_runs: reduced.runs,
        promx_wickets: reduced.wickets,
        promx_balls: reduced.legalBalls,
        promx_overs: formatOvers(reduced.legalBalls),
        statuscode: reason === "allOut" ? ALL_OUT_INNINGS_STATUS : COMPLETED_STATUS,
      });
      if (!ended.success) {
        outcome.error = ended.error;
        return outcome;
      }
      const synced = await this.projections.syncInningsState(ended.data);
      if (!synced.success) {
        outcome.error = synced.error;
        return outcome;
      }

      if (!isSuperOverInnings(innings) && innings.promx_inningsnumber === 1) {
        const next = await this.createInnings(matchId, {
          inningsNumber: 2,
          battingTeam: innings.promx_bowlingteam,
          bowlingTeam: innings.promx_battingteam,
          target: reduced.runs + 1,
        });
        outcome.nextInningsOpened = next.success;
        if (!next.success) outcome.error = next.error;
        return outcome;
      }

      if (isSuperOverInnings(innings) && innings.promx_inningsnumber === 3) {
        const next = await this.createInnings(matchId, {
          inningsNumber: 4,
          battingTeam: innings.promx_bowlingteam,
          bowlingTeam: innings.promx_battingteam,
          target: reduced.runs + 1,
          isSuperOver: true,
        });
        outcome.nextInningsOpened = next.success;
        if (!next.success) outcome.error = next.error;
        return outcome;
      }

      const completed = await this.completeMatch(matchId);
      outcome.matchCompleted = completed.success && completed.data.statuscode === COMPLETED_STATUS;
      outcome.superOverRequired = completed.success && completed.data.statuscode === SUPER_OVER_REQUIRED_STATUS;
      if (!completed.success) outcome.error = completed.error;
      return outcome;
    } catch (error) {
      outcome.error = error instanceof Error ? error : new Error("Could not complete the innings.");
      return outcome;
    }
  }

  private async loadLiveContext(matchId: string): Promise<Result<LiveContext>> {
    const inningsList = await readAllPages("Could not retrieve innings.", (cursor) =>
      this.innings.getByMatch(matchId, undefined, cursor),
    );
    if (!inningsList.success) return inningsList;
    const innings = inningsList.data.find((item) => item.statuscode === LIVE_INNINGS_STATUS) ?? null;
    const inningsId = innings?.promx_cricketinningsid;
    if (!innings || !inningsId) {
      return { success: true, data: { innings: null, allInnings: inningsList.data, overs: [], events: [] } };
    }

    const [overs, events] = await Promise.all([
      readAllPages("Could not retrieve overs.", (cursor) =>
        this.overs.getByInnings(inningsId, undefined, cursor),
      ),
      readAllPages("Could not retrieve Ball Events.", (cursor) =>
        this.events.getByInnings(inningsId, undefined, cursor),
      ),
    ]);
    if (!overs.success) return overs;
    if (!events.success) return events;
    return { success: true, data: { innings, allInnings: inningsList.data, overs: overs.data, events: events.data } };
  }

  private findOpenOver(overs: readonly CricketOver[]): CricketOver | null {
    return overs
      .filter((over) => over.statuscode !== COMPLETED_STATUS)
      .sort((a, b) => b.promx_overnumber - a.promx_overnumber)[0] ?? null;
  }

  private async openOver(inningsId: string, overs: readonly CricketOver[]): Promise<Result<CricketOver>> {
    const number = overs.reduce((max, over) => Math.max(max, over.promx_overnumber), 0) + 1;
    return this.overs.create({
      promx_innings: inningsId,
      promx_overname: `Over ${number}`,
      promx_overnumber: number,
      statuscode: OVER_IN_PROGRESS_STATUS,
    });
  }

  private async completeAndOpenNext(
    current: CricketOver,
    inningsId: string,
    overs: readonly CricketOver[],
    bowlerId: string | null,
  ): Promise<Result<CricketOver>> {
    const completed = await this.overs.update({
      ...current,
      promx_bowler: current.promx_bowler ?? bowlerId,
      statuscode: COMPLETED_STATUS,
    });
    if (!completed.success) return completed;
    return this.openOver(inningsId, overs);
  }

  private async appendEvent(ballEvent: CricketBallEvent): Promise<Result<CricketBallEvent>> {
    const match = await this.matches.getById(ballEvent.promx_match);
    if (!match.success) return match;
    if (match.data.statuscode !== 796280002 && match.data.statuscode !== 796280005) {
      return serviceFailure("Could not process Ball Event.", new Error("Scoring is accepted only while the match is live."));
    }
    const participantValidation = await this.validateEventParticipants(ballEvent, match.data.promx_tournament);
    if (!participantValidation.success) return participantValidation;
    const validation = await this.rules.validateBall(ballEvent);
    if (!validation.success) return validation;
    return this.events.createEvent(ballEvent);
  }

  private async validateEventParticipants(ballEvent: CricketBallEvent, tournamentId: string): Promise<Result<void>> {
    const fail = (message: string): Result<void> => serviceFailure("Could not validate Ball Event participants.", new Error(message));
    const strikerId = ballEvent.promx_strikerbeforeball ?? ballEvent.promx_striker;
    const nonStrikerId = ballEvent.promx_nonstrikerbeforeball ?? ballEvent.promx_nonstriker;
    const bowlerId = ballEvent.promx_bowler;
    if (!strikerId || !nonStrikerId || !bowlerId || strikerId === nonStrikerId) {
      return fail("Select two different batters and a bowler before recording a Ball Event.");
    }

    const [innings, striker, nonStriker, bowler] = await Promise.all([
      this.innings.getById(ballEvent.promx_innings),
      this.matchPlayers.getById(strikerId),
      this.matchPlayers.getById(nonStrikerId),
      this.matchPlayers.getById(bowlerId),
    ]);
    if (!innings.success) return innings;
    if (innings.data.promx_match !== ballEvent.promx_match) {
      return fail("The innings does not belong to the Ball Event match.");
    }
    if (!striker.success) return striker;
    if (!nonStriker.success) return nonStriker;
    if (!bowler.success) return bowler;

    const batters = [striker.data, nonStriker.data];
    const [batterRegistrations, bowlerRegistration] = await Promise.all([
      Promise.all(batters.map((batter) => this.tournamentPlayers.getById(batter.promx_tournamentplayer))),
      this.tournamentPlayers.getById(bowler.data.promx_tournamentplayer),
    ]);
    for (const [index, batter] of batters.entries()) {
      if (batter.promx_match !== ballEvent.promx_match || batter.promx_isplaying !== true) {
        return fail("Both batters must be selected in this match's Playing XI.");
      }
      const registration = batterRegistrations[index];
      if (!registration?.success) return registration ?? fail("Could not load a batter registration.");
      if (registration.data.promx_tournament !== tournamentId || registration.data.promx_tournamentteam !== innings.data.promx_battingteam) {
        return fail("Both batters must belong to the current batting team.");
      }
    }

    if (bowler.data.promx_match !== ballEvent.promx_match || bowler.data.promx_isplaying !== true) {
      return fail("The bowler must be selected in this match's Playing XI.");
    }
    if (!bowlerRegistration.success) return bowlerRegistration;
    if (bowlerRegistration.data.promx_tournament !== tournamentId || bowlerRegistration.data.promx_tournamentteam !== innings.data.promx_bowlingteam) {
      return fail("The bowler must belong to the current bowling team.");
    }
    if (ballEvent.promx_iswicket === true && ballEvent.promx_dismissedplayer
      && !batters.some((batter) => batter.promx_cricketmatchplayerid === ballEvent.promx_dismissedplayer)) {
      return fail("The dismissed player must be one of the current batters.");
    }
    return { success: true, data: undefined };
  }

  private processEvent(ballEvent: CricketBallEvent): Promise<Result<CricketBallEvent>> {
    return guardService("Could not process Ball Event.", async () => {
      const created = await this.appendEvent(ballEvent);
      if (!created.success) return created;
      const refreshed = await this.projections.refreshAfterEvent(created.data);
      if (!refreshed.success) return refreshed;
      return created;
    });
  }
}
