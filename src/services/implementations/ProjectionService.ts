import type { CricketBallEvent } from "../../models/CricketBallEvent";
import type { CricketMatchState } from "../../models/CricketMatchState";
import type { IBallEventRepository } from "../../repositories/interfaces/IBallEventRepository";
import type { IMatchRepository } from "../../repositories/interfaces/IMatchRepository";
import type { IMatchStateRepository } from "../../repositories/interfaces/IMatchStateRepository";
import type { ITournamentRepository } from "../../repositories/interfaces/ITournamentRepository";
import type { IProjectionService } from "../interfaces/IProjectionService";
import type { IStandingService } from "../interfaces/IStandingService";
import type { IStatisticsService } from "../interfaces/IStatisticsService";
import { guardService, readAllPages, serviceFailure } from "./ServiceSupport";
import { reduceMatchStates } from "./MatchStateReducer";

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

  rebuildMatchState(matchId: string): Promise<Result<CricketMatchState[]>> {
    return guardService("Could not rebuild Match State.", async () => {
      const match = await this.matches.getById(matchId);
      if (!match.success) return match;
      const events = await readAllPages("Could not retrieve Ball Events.", (cursor) =>
        this.events.getByMatch(matchId, undefined, cursor),
      );
      if (!events.success) return events;
      const existing = await readAllPages("Could not retrieve Match State.", (cursor) =>
        this.matchStates.getByMatch(matchId, undefined, cursor),
      );
      if (!existing.success) return existing;

      const rebuilt: CricketMatchState[] = [];
      for (const reduced of reduceMatchStates(events.data)) {
        const current = existing.data.find((state) => state.promx_innings === reduced.inningsId);
        const saved = await this.matchStates.upsert({
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
        if (!saved.success) return saved;
        rebuilt.push(saved.data);
      }
      return { success: true, data: rebuilt };
    });
  }

  refreshAfterEvent(ballEvent: CricketBallEvent): Promise<Result<void>> {
    return guardService("Could not refresh projections after Ball Event.", async () => {
      const match = await this.matches.getById(ballEvent.promx_match);
      if (!match.success) return match;
      const state = await this.rebuildMatchState(ballEvent.promx_match);
      if (!state.success) return state;
      const statistics = await this.statistics.calculateStatisticsFromEvents(match.data.promx_cricketmatchid ?? ballEvent.promx_match);
      if (!statistics.success) return statistics;
      const standings = await this.standings.updateStandings(match.data.promx_tournament);
      if (!standings.success) return standings;
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
            }
            if (matches.data.nextCursor === matchCursor) {
              return serviceFailure("Could not rebuild all projections.", new Error("Dataverse returned a repeated match continuation cursor."));
            }
            matchCursor = matches.data.nextCursor;
          } while (matchCursor !== undefined);
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
