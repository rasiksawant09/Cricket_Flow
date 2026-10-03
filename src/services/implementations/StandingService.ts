import type { CricketTournamentStanding } from "../../models/CricketTournamentStanding";
import type { IInningsRepository } from "../../repositories/interfaces/IInningsRepository";
import type { IMatchRepository } from "../../repositories/interfaces/IMatchRepository";
import type { IBallEventRepository } from "../../repositories/interfaces/IBallEventRepository";
import type { ITournamentRepository } from "../../repositories/interfaces/ITournamentRepository";
import type { ITournamentRuleRepository } from "../../repositories/interfaces/ITournamentRuleRepository";
import type { ITournamentStandingRepository } from "../../repositories/interfaces/ITournamentStandingRepository";
import type { ITournamentTeamRepository } from "../../repositories/interfaces/ITournamentTeamRepository";
import type { IStandingService } from "../interfaces/IStandingService";
import { guardService, serviceFailure } from "./ServiceSupport";

export class StandingService implements IStandingService {
  private readonly matches: IMatchRepository;
  private readonly events: IBallEventRepository;
  private readonly innings: IInningsRepository;
  private readonly tournamentTeams: ITournamentTeamRepository;
  private readonly tournaments: ITournamentRepository;
  private readonly rules: ITournamentRuleRepository;
  private readonly standings: ITournamentStandingRepository;

  constructor(
    matches: IMatchRepository,
    events: IBallEventRepository,
    innings: IInningsRepository,
    tournamentTeams: ITournamentTeamRepository,
    tournaments: ITournamentRepository,
    rules: ITournamentRuleRepository,
    standings: ITournamentStandingRepository,
  ) {
    this.matches = matches;
    this.events = events;
    this.innings = innings;
    this.tournamentTeams = tournamentTeams;
    this.tournaments = tournaments;
    this.rules = rules;
    this.standings = standings;
  }

  updateStandings(tournamentId: string): Promise<Result<CricketTournamentStanding[]>> {
    return guardService("Could not calculate tournament standings.", async () => {
      const tournament = await this.tournaments.getById(tournamentId);
      if (!tournament.success) return tournament;
      const teams = await this.tournamentTeams.getByTournament(tournamentId);
      if (!teams.success) return teams;
      const matches = await this.matches.getByTournament(tournamentId);
      if (!matches.success) return matches;
      const enabledRules = await this.rules.getEnabledRules(tournamentId);
      if (!enabledRules.success) return enabledRules;
      const current = await this.standings.getByTournament(tournamentId);
      if (!current.success) return current;

      for (const match of matches.data.items) {
        const matchId = match.promx_cricketmatchid;
        if (!matchId) continue;
        const matchInnings = await this.innings.getByMatch(matchId);
        if (!matchInnings.success) return matchInnings;
        for (const innings of matchInnings.data.items) {
          const inningsId = innings.promx_cricketinningsid;
          if (!inningsId) continue;
          const ballEvents = await this.events.getByInnings(inningsId);
          if (!ballEvents.success) return ballEvents;
        }
      }

      if (enabledRules.data.items.length > 0) {
        return serviceFailure(
          "Could not calculate tournament standings.",
          new Error("Enabled rule JSON has no documented evaluation schema; refusing to calculate points."),
        );
      }
      if (matches.data.items.length > 0 || teams.data.items.length > 0 || current.data.items.length > 0) {
        return serviceFailure(
          "Could not calculate tournament standings.",
          new Error("The approved documents do not define complete points and NRR calculation/rebuild semantics; no standing rows were written."),
        );
      }
      return { success: true, data: [] };
    });
  }

  calculateNRR(tournamentId: string, tournamentTeamId: string): Promise<Result<number>> {
    return guardService("Could not calculate Net Run Rate.", async () => {
      const tournament = await this.tournaments.getById(tournamentId);
      if (!tournament.success) return tournament;
      const tournamentTeam = await this.tournamentTeams.getById(tournamentTeamId);
      if (!tournamentTeam.success) return tournamentTeam;
      if (tournamentTeam.data.promx_tournament !== tournamentId) {
        return serviceFailure("Could not calculate Net Run Rate.", new Error("Tournament Team does not belong to the requested tournament."));
      }
      const enabledRules = await this.rules.getEnabledRules(tournamentId);
      if (!enabledRules.success) return enabledRules;
      const matches = await this.matches.getByTournament(tournamentId);
      if (!matches.success) return matches;
      for (const match of matches.data.items) {
        const matchId = match.promx_cricketmatchid;
        if (!matchId) continue;
        const matchInnings = await this.innings.getByMatch(matchId);
        if (!matchInnings.success) return matchInnings;
        for (const innings of matchInnings.data.items) {
          if (innings.promx_battingteam !== tournamentTeamId && innings.promx_bowlingteam !== tournamentTeamId) continue;
          if (!innings.promx_cricketinningsid) continue;
          const ballEvents = await this.events.getByInnings(innings.promx_cricketinningsid);
          if (!ballEvents.success) return ballEvents;
        }
      }
      return serviceFailure(
        "Could not calculate Net Run Rate.",
        new Error(enabledRules.data.items.length > 0
          ? "Enabled rule JSON has no documented evaluation schema; refusing to calculate NRR."
          : "NRR rules for all-outs, incomplete overs, and Super Overs are not specified; refusing to calculate NRR."),
      );
    });
  }

  rebuildTournamentTable(tournamentId: string): Promise<Result<CricketTournamentStanding[]>> {
    return this.updateStandings(tournamentId);
  }
}
