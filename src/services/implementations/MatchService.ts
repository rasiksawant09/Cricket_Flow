import type { CricketMatch } from "../../models/CricketMatch";
import type { IMatchRepository } from "../../repositories/interfaces/IMatchRepository";
import type { ITournamentRepository } from "../../repositories/interfaces/ITournamentRepository";
import type { ITournamentTeamRepository } from "../../repositories/interfaces/ITournamentTeamRepository";
import type { IMatchService, MatchLimits, MatchResultOutcome } from "../interfaces/IMatchService";
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

  finalizeMatch(matchId: string, outcome: MatchResultOutcome): Promise<Result<CricketMatch>> {
    return guardService("Could not finalize match result.", async () => {
      const fail = (message: string): Result<CricketMatch> => serviceFailure("Could not finalize match result.", new Error(message));
      const match = await this.matches.getById(matchId);
      if (!match.success) return match;
      if (match.data.statuscode === 2) {
        return fail("The match result has already been finalized.");
      }
      if (match.data.statuscode === 796280007 || match.data.statuscode === 796280008) {
        return fail("An abandoned or cancelled match cannot be finalized.");
      }

      if (outcome.resultType === 796280001) {
        if (outcome.winnerTeamId !== null || outcome.loserTeamId !== null) {
          return fail("A tie cannot have a winner or loser.");
        }
      } else {
        const { winnerTeamId, loserTeamId } = outcome;
        if (!winnerTeamId || !loserTeamId || winnerTeamId === loserTeamId) {
          return fail("A decided result requires different winner and loser teams.");
        }
        const sides = [match.data.promx_teama, match.data.promx_teamb];
        if (!sides.includes(winnerTeamId) || !sides.includes(loserTeamId)) {
          return fail("The winner and loser must be the match teams.");
        }
      }

      const saved = await this.matches.update({
        ...match.data,
        promx_winner: outcome.winnerTeamId,
        promx_loser: outcome.loserTeamId,
        promx_resulttype: outcome.resultType,
      });
      if (!saved.success) return saved;
      return this.matches.updateStatus(matchId, 2);
    });
  }

  getMatchLimits(matchId: string): Promise<Result<MatchLimits>> {
    return guardService("Could not retrieve match limits.", async () => {
      const match = await this.matches.getById(matchId);
      if (!match.success) return match;
      const tournament = await this.tournaments.getById(match.data.promx_tournament);
      if (!tournament.success) return tournament;
      return {
        success: true,
        data: {
          oversPerInnings: tournament.data.promx_oversperinnings,
          playersPerTeam: tournament.data.promx_playersperteam,
        },
      };
    });
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
      const id = match.promx_cricketmatchid;
      if (!id) {
        return serviceFailure("Could not update match.", new Error("A match ID is required."));
      }
      const existing = await this.matches.getById(id);
      if (!existing.success) return existing;
      if (existing.data.statuscode !== 1 && existing.data.statuscode !== 796280001) {
        return serviceFailure("Could not update match.", new Error("Matches can only be edited while draft or ready."));
      }
      const validation = await this.validateMatchTeams(match);
      if (!validation.success) {
        return validation;
      }
      return this.matches.update({ ...existing.data, ...match });
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
      if (!match.data.promx_tosswinner || match.data.promx_tossdecision == null) {
        return serviceFailure("Could not start match.", new Error("Record the toss before starting the match."));
      }
      return this.matches.updateStatus(matchId, 796280002);
    });
  }

  requireSuperOver(matchId: string): Promise<Result<CricketMatch>> {
    return guardService("Could not set match to Super Over Required.", async () => {
      const match = await this.matches.getById(matchId);
      if (!match.success) return match;
      if (match.data.statuscode !== 796280002 && match.data.statuscode !== 796280005) {
        return serviceFailure("Could not set match to Super Over Required.", new Error("Only a live tied match can require a Super Over."));
      }
      return this.matches.updateStatus(matchId, 796280004);
    });
  }

  startSuperOver(matchId: string): Promise<Result<CricketMatch>> {
    return guardService("Could not start Super Over.", async () => {
      const match = await this.matches.getById(matchId);
      if (!match.success) return match;
      if (match.data.statuscode !== 796280004) {
        return serviceFailure("Could not start Super Over.", new Error("The match is not waiting for a Super Over."));
      }
      return this.matches.updateStatus(matchId, 796280005);
    });
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
