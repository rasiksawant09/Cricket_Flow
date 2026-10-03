import type { CricketBallEvent } from "../../models/CricketBallEvent";
import type { CricketMatchState } from "../../models/CricketMatchState";
import type { IBallEventRepository } from "../../repositories/interfaces/IBallEventRepository";
import type { IMatchRepository } from "../../repositories/interfaces/IMatchRepository";
import type { IMatchStateRepository } from "../../repositories/interfaces/IMatchStateRepository";
import type { ITournamentRepository } from "../../repositories/interfaces/ITournamentRepository";
import type { IProjectionService } from "../interfaces/IProjectionService";
import type { IStandingService } from "../interfaces/IStandingService";
import type { IStatisticsService } from "../interfaces/IStatisticsService";
import { guardService, serviceFailure } from "./ServiceSupport";

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

  rebuildMatchState(matchId: string): Promise<Result<CricketMatchState[]>> {
    return guardService("Could not rebuild Match State.", async () => {
      const match = await this.matches.getById(matchId);
      if (!match.success) return match;
      const eventPage = await this.events.getByMatch(matchId);
      if (!eventPage.success) return eventPage;
      const statePage = await this.matchStates.getByMatch(matchId);
      if (!statePage.success) return statePage;
      return serviceFailure(
        "Could not rebuild Match State.",
        new Error("A deterministic Ball Event projection reducer is not specified; existing state was not overwritten."),
      );
    });
  }

  refreshAfterEvent(ballEvent: CricketBallEvent): Promise<Result<void>> {
    return guardService("Could not refresh projections after Ball Event.", async () => {
      const match = await this.matches.getById(ballEvent.promx_match);
      if (!match.success) return match;
      const statistics = await this.statistics.calculateStatisticsFromEvents(match.data.promx_cricketmatchid ?? ballEvent.promx_match);
      if (!statistics.success) return statistics;
      const standings = await this.standings.updateStandings(match.data.promx_tournament);
      if (!standings.success) return standings;
      const state = await this.rebuildMatchState(ballEvent.promx_match);
      if (!state.success) return state;
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
