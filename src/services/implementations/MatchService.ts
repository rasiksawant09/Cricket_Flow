import type { CricketMatch } from "../../models/CricketMatch";
import type { IMatchRepository } from "../../repositories/interfaces/IMatchRepository";
import type { ITournamentRepository } from "../../repositories/interfaces/ITournamentRepository";
import type { ITournamentTeamRepository } from "../../repositories/interfaces/ITournamentTeamRepository";
import type { IMatchService } from "../interfaces/IMatchService";
import { guardService, readAllPages, serviceFailure } from "./ServiceSupport";

export class MatchService implements IMatchService {
  private readonly matches: IMatchRepository;
  private readonly tournaments: ITournamentRepository;
  private readonly tournamentTeams: ITournamentTeamRepository;

  constructor(
    matches: IMatchRepository,
    tournaments: ITournamentRepository,
    tournamentTeams: ITournamentTeamRepository,
  ) {
    this.matches = matches;
    this.tournaments = tournaments;
    this.tournamentTeams = tournamentTeams;
  }

  getMatches(): Promise<Result<CricketMatch[]>> {
    return readAllPages("Could not retrieve matches.", (cursor) => this.matches.getAll(undefined, cursor));
  }

  getMatch(matchId: string): Promise<Result<CricketMatch>> {
    return guardService("Could not retrieve match.", () => this.matches.getById(matchId));
  }

  validateMatchSetup(match: CricketMatch): Promise<Result<void>> {
    return guardService("Match setup validation failed.", () => this.validateMatchTeams(match));
  }

  createMatch(match: CricketMatch): Promise<Result<CricketMatch>> {
    return guardService("Could not create match.", async () => {
      const validation = await this.validateMatchTeams(match);
      if (!validation.success) {
        return validation;
      }
      return this.matches.create(match);
    });
  }

  updateMatch(match: CricketMatch): Promise<Result<CricketMatch>> {
    return guardService("Could not update match.", async () => {
      const validation = await this.validateMatchTeams(match);
      if (!validation.success) {
        return validation;
      }
      return this.matches.update(match);
    });
  }

  startMatch(matchId: string): Promise<Result<CricketMatch>> {
    return guardService("Could not start match.", async () => {
      const match = await this.matches.getById(matchId);
      if (!match.success) {
        return match;
      }
      if (match.data.statuscode !== 1 && match.data.statuscode !== 796280001) {
        return serviceFailure("Could not start match.", new Error("Only a draft or ready match can be started."));
      }
      return this.matches.updateStatus(matchId, 796280002);
    });
  }

  completeMatch(matchId: string): Promise<Result<CricketMatch>> {
    return guardService("Could not complete match.", () => this.matches.updateStatus(matchId, 2));
  }

  abandonMatch(matchId: string): Promise<Result<CricketMatch>> {
    return guardService("Could not abandon match.", () => this.matches.updateStatus(matchId, 796280007));
  }

  cancelMatch(matchId: string): Promise<Result<CricketMatch>> {
    return guardService("Could not cancel match.", () => this.matches.updateStatus(matchId, 796280008));
  }

  private async validateMatchTeams(match: CricketMatch): Promise<Result<void>> {
    if (match.promx_teama === match.promx_teamb) {
      return serviceFailure("Match team validation failed.", new Error("Team A and Team B must be different."));
    }
    const tournament = await this.tournaments.getById(match.promx_tournament);
    if (!tournament.success) {
      return tournament;
    }
    const teamA = await this.tournamentTeams.getById(match.promx_teama);
    if (!teamA.success) {
      return teamA;
    }
    const teamB = await this.tournamentTeams.getById(match.promx_teamb);
    if (!teamB.success) {
      return teamB;
    }
    if (teamA.data.promx_tournament !== match.promx_tournament || teamB.data.promx_tournament !== match.promx_tournament) {
      return serviceFailure("Match team validation failed.", new Error("Both tournament teams must belong to the match tournament."));
    }
    return { success: true, data: undefined };
  }
}
