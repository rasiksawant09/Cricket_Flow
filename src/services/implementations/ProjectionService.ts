import type { CricketBallEvent } from "../../models/CricketBallEvent";
import type { CricketInnings } from "../../models/CricketInnings";
import type { CricketMatchState } from "../../models/CricketMatchState";
import type { IBallEventRepository } from "../../repositories/interfaces/IBallEventRepository";
import type { IMatchRepository } from "../../repositories/interfaces/IMatchRepository";
import type { IMatchStateRepository } from "../../repositories/interfaces/IMatchStateRepository";
import type { ITournamentRepository } from "../../repositories/interfaces/ITournamentRepository";
import type { IProjectionService } from "../interfaces/IProjectionService";
import type { IStandingService } from "../interfaces/IStandingService";
import type { IStatisticsService } from "../interfaces/IStatisticsService";
import { guardService, readAllPages, serviceFailure } from "./ServiceSupport";
import { reduceInnings, reduceMatchStates } from "./MatchStateReducer";

const MATCH_STATE_LIVE = 1;
const MATCH_STATE_COMPLETED = 2;
const MATCH_COMPLETED_STATUS = 2;
const INNINGS_ENDED_STATUSES: readonly (number | null | undefined)[] = [2, 796280002, 796280003];

export class ProjectionService implements IProjectionService {
  private readonly events: IBallEventRepository;
  private readonly matches: IMatchRepository;
  private readonly tournaments: ITournamentRepository;
  private readonly matchStates: IMatchStateRepository;
  private readonly statistics: IStatisticsService;
  private readonly standings: IStandingService;

  constructor(
    events: IBallEventRepository,
    matches: IMatchRepository,
    tournaments: ITournamentRepository,
    matchStates: IMatchStateRepository,
    statistics: IStatisticsService,
    standings: IStandingService,
  ) {
    this.events = events;
    this.matches = matches;
    this.tournaments = tournaments;
    this.matchStates = matchStates;
    this.statistics = statistics;
    this.standings = standings;
  }

  getMatchState(matchId: string): Promise<Result<CricketMatchState[]>> {
    return guardService("Could not retrieve Match State.", () =>
      readAllPages("Could not retrieve Match State.", (cursor) => this.matchStates.getByMatch(matchId, undefined, cursor)),
    );
  }

  syncInningsState(innings: CricketInnings): Promise<Result<CricketMatchState>> {
    return guardService("Could not synchronize innings Match State.", async () => {
      const inningsId = innings.promx_cricketinningsid;
      if (!inningsId) {
        return serviceFailure("Could not synchronize innings Match State.", new Error("An innings ID is required."));
      }
      const events = await readAllPages("Could not retrieve Ball Events.", (cursor) =>
        this.events.getByInnings(inningsId, undefined, cursor),
      );
      if (!events.success) return events;
      const existing = await readAllPages("Could not retrieve Match State.", (cursor) =>
        this.matchStates.getByMatch(innings.promx_match, undefined, cursor),
      );
      if (!existing.success) return existing;

      const reduced = reduceInnings(inningsId, events.data);
      const current = existing.data.find((state) => state.promx_innings === inningsId);
      return this.matchStates.upsert({
        ...current,
        promx_match: innings.promx_match,
        promx_innings: inningsId,
        promx_matchstatename: current?.promx_matchstatename ?? `Match State ${inningsId}`,
        promx_currentruns: reduced.runs,
        promx_currentwickets: reduced.wickets,
        promx_currentballs: reduced.legalBalls,
        promx_currentovers: reduced.overs,
        promx_currentstriker: reduced.striker,
        promx_currentnonstriker: reduced.nonStriker,
        promx_currentbowler: reduced.bowler,
        promx_target: innings.promx_target ?? current?.promx_target,
        statuscode: INNINGS_ENDED_STATUSES.includes(innings.statuscode) ? MATCH_STATE_COMPLETED : MATCH_STATE_LIVE,
      });
    });
  }

  rebuildTournamentStandings(tournamentId: string): Promise<Result<void>> {
    return guardService("Could not rebuild tournament standings.", async () => {
      const rebuilt = await this.standings.rebuildTournamentTable(tournamentId);
      if (!rebuilt.success) return rebuilt;
      return { success: true, data: undefined };
    });
  }

  rebuildBatterStatistics(matchId: string): Promise<Result<void>> {
    return guardService("Could not rebuild batter statistics.", async () => {
      const rebuilt = await this.statistics.rebuildBattingStatistics(matchId);
      if (!rebuilt.success) return rebuilt;
      return { success: true, data: undefined };
    });
  }

  rebuildBowlerStatistics(matchId: string): Promise<Result<void>> {
    return guardService("Could not rebuild bowler statistics.", async () => {
      const rebuilt = await this.statistics.rebuildBowlingStatistics(matchId);
      if (!rebuilt.success) return rebuilt;
      return { success: true, data: undefined };
    });
  }

  rebuildMatchState(matchId: string): Promise<Result<CricketMatchState[]>> {
    return guardService("Could not rebuild Match State.", async () => {
      const match = await this.matches.getById(matchId);
      if (!match.success) return match;
      const [events, existing] = await Promise.all([
        readAllPages("Could not retrieve Ball Events.", (cursor) =>
          this.events.getByMatch(matchId, undefined, cursor),
        ),
        readAllPages("Could not retrieve Match State.", (cursor) =>
          this.matchStates.getByMatch(matchId, undefined, cursor),
        ),
      ]);
      if (!events.success) return events;
      if (!existing.success) return existing;

      const saves = reduceMatchStates(events.data).map((reduced) => {
        const current = existing.data.find((state) => state.promx_innings === reduced.inningsId);
        return this.matchStates.upsert({
          ...current,
          promx_match: matchId,
          promx_innings: reduced.inningsId,
          promx_matchstatename: current?.promx_matchstatename ?? `Match State ${reduced.inningsId}`,
          promx_currentruns: reduced.runs,
          promx_currentwickets: reduced.wickets,
          promx_currentballs: reduced.legalBalls,
          promx_currentovers: reduced.overs,
          promx_currentstriker: reduced.striker,
          promx_currentnonstriker: reduced.nonStriker,
          promx_currentbowler: reduced.bowler,
        });
      });
      const rebuilt: CricketMatchState[] = [];
      for (const saved of await Promise.all(saves)) {
        if (!saved.success) return saved;
        rebuilt.push(saved.data);
      }
      return { success: true, data: rebuilt };
    });
  }

  rebuildMatchProjections(matchId: string): Promise<Result<void>> {
    return guardService("Could not rebuild match projections.", async () => {
      const match = await this.matches.getById(matchId);
      if (!match.success) return match;
      const state = await this.rebuildMatchState(matchId);
      if (!state.success) return state;
      const batting = await this.statistics.rebuildBattingStatistics(matchId);
      if (!batting.success) return batting;
      const bowling = await this.statistics.rebuildBowlingStatistics(matchId);
      if (!bowling.success) return bowling;
      if (match.data.statuscode === MATCH_COMPLETED_STATUS) {
        const standings = await this.standings.updateStandings(match.data.promx_tournament);
        if (!standings.success) return standings;
      }
      return { success: true, data: undefined };
    });
  }

  refreshAfterEvent(ballEvent: CricketBallEvent): Promise<Result<void>> {
    return guardService("Could not refresh projections after Ball Event.", async () => {
      const match = await this.matches.getById(ballEvent.promx_match);
      if (!match.success) return match;
      const [state, statistics] = await Promise.all([
        this.rebuildMatchState(ballEvent.promx_match),
        this.statistics.calculateStatisticsFromEvents(match.data.promx_cricketmatchid ?? ballEvent.promx_match),
      ]);
      if (!state.success) return state;
      if (!statistics.success) return statistics;
      if (match.data.statuscode === MATCH_COMPLETED_STATUS) {
        const standings = await this.standings.updateStandings(match.data.promx_tournament);
        if (!standings.success) return standings;
      }
      return { success: true, data: undefined };
    });
  }

  rebuildAllProjections(): Promise<Result<void>> {
    return guardService("Could not rebuild all projections.", async () => {
      let tournamentCursor: string | undefined;
      do {
        const tournaments = await this.tournaments.getAll(undefined, tournamentCursor);
        if (!tournaments.success) return tournaments;
        for (const tournament of tournaments.data.items) {
          const tournamentId = tournament.promx_crickettournamentid;
          if (!tournamentId) {
            return serviceFailure("Could not rebuild all projections.", new Error("A tournament record has no primary ID."));
          }
          let matchCursor: string | undefined;
          do {
            const matches = await this.matches.getByTournament(tournamentId, undefined, matchCursor);
            if (!matches.success) return matches;
            for (const match of matches.data.items) {
              const matchId = match.promx_cricketmatchid;
              if (!matchId) {
                return serviceFailure("Could not rebuild all projections.", new Error("A match record has no primary ID."));
              }
              const result = await this.rebuildMatchState(matchId);
              if (!result.success) return result;
              const batting = await this.rebuildBatterStatistics(matchId);
              if (!batting.success) return batting;
              const bowling = await this.rebuildBowlerStatistics(matchId);
              if (!bowling.success) return bowling;
            }
            if (matches.data.nextCursor === matchCursor) {
              return serviceFailure("Could not rebuild all projections.", new Error("Dataverse returned a repeated match continuation cursor."));
            }
            matchCursor = matches.data.nextCursor;
          } while (matchCursor !== undefined);
          const standings = await this.rebuildTournamentStandings(tournamentId);
          if (!standings.success) return standings;
        }
        if (tournaments.data.nextCursor === tournamentCursor) {
          return serviceFailure("Could not rebuild all projections.", new Error("Dataverse returned a repeated tournament continuation cursor."));
        }
        tournamentCursor = tournaments.data.nextCursor;
      } while (tournamentCursor !== undefined);
      return { success: true, data: undefined };
    });
  }
}
