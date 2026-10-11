import type { CricketTournament } from "../../models/CricketTournament";
import type { CricketTournamentRule } from "../../models/CricketTournamentRule";
import type { ITournamentRepository } from "../../repositories/interfaces/ITournamentRepository";
import type { ITournamentRuleRepository } from "../../repositories/interfaces/ITournamentRuleRepository";
import type { ITournamentService } from "../interfaces/ITournamentService";
import { guardService, readAllPages, serviceFailure } from "./ServiceSupport";

export class TournamentService implements ITournamentService {
  private readonly tournaments: ITournamentRepository;
  private readonly rules: ITournamentRuleRepository;

  constructor(tournaments: ITournamentRepository, rules: ITournamentRuleRepository) {
    this.tournaments = tournaments;
    this.rules = rules;
  }

  getTournaments(): Promise<Result<CricketTournament[]>> {
    return readAllPages("Could not retrieve tournaments.", (cursor) => this.tournaments.getAll(undefined, cursor));
  }

  getTournament(tournamentId: string): Promise<Result<CricketTournament>> {
    return guardService("Could not retrieve tournament.", () => this.tournaments.getById(tournamentId));
  }

  createTournament(tournament: CricketTournament): Promise<Result<CricketTournament>> {
    return guardService("Could not create tournament.", async () => {
      const validation = validateTournament(tournament);
      if (!validation.success) return validation;
      return this.tournaments.create({
        ...tournament,
        promx_tournamentname: tournament.promx_tournamentname.trim(),
        promx_pointsforwin: tournament.promx_pointsforwin ?? 0,
        promx_pointsfortie: tournament.promx_pointsfortie ?? 0,
        promx_pointsforloss: tournament.promx_pointsforloss ?? 0,
      });
    });
  }

  updateTournament(tournament: CricketTournament): Promise<Result<CricketTournament>> {
    return guardService("Could not update tournament.", async () => {
      const id = tournament.promx_crickettournamentid;
      if (!id) {
        return serviceFailure("Could not update tournament.", new Error("A tournament ID is required."));
      }
      const validation = validateTournament(tournament);
      if (!validation.success) return validation;
      const existing = await this.tournaments.getById(id);
      if (!existing.success) return existing;
      return this.tournaments.update({
        ...existing.data,
        ...tournament,
        promx_tournamentname: tournament.promx_tournamentname.trim(),
        promx_pointsforwin: tournament.promx_pointsforwin ?? 0,
        promx_pointsfortie: tournament.promx_pointsfortie ?? 0,
        promx_pointsforloss: tournament.promx_pointsforloss ?? 0,
      });
    });
  }

  setTournamentStatus(
    tournamentId: string,
    statusCode: NonNullable<CricketTournament["statuscode"]>,
  ): Promise<Result<CricketTournament>> {
    return guardService("Could not update tournament status.", async () => {
      if (![1, 2, 796280001, 796280002].includes(statusCode)) {
        return serviceFailure("Could not update tournament status.", new Error("The selected tournament status is not supported."));
      }
      return this.tournaments.updateStatus(tournamentId, statusCode);
    });
  }

  activateTournament(tournamentId: string): Promise<Result<CricketTournament>> {
    return guardService("Could not activate tournament.", () => this.tournaments.updateStatus(tournamentId, 1));
  }

  completeTournament(tournamentId: string): Promise<Result<CricketTournament>> {
    return guardService("Could not complete tournament.", () => this.tournaments.updateStatus(tournamentId, 2));
  }

  archiveTournament(tournamentId: string): Promise<Result<CricketTournament>> {
    return guardService("Could not archive tournament.", () => this.tournaments.updateStatus(tournamentId, 796280002));
  }

  createTournamentRule(rule: CricketTournamentRule): Promise<Result<CricketTournamentRule>> {
    return guardService("Could not create tournament rule.", () => this.rules.create(rule));
  }

  updateTournamentRule(rule: CricketTournamentRule): Promise<Result<CricketTournamentRule>> {
    return guardService("Could not update tournament rule.", () => this.rules.update(rule));
  }

  setTournamentRuleEnabled(ruleId: string, enabled: boolean): Promise<Result<CricketTournamentRule>> {
    return guardService("Could not update tournament rule enabled state.", async () => {
      const existing = await this.rules.getById(ruleId);
      if (!existing.success) {
        return existing;
      }
      return this.rules.update({ ...existing.data, promx_enabled: enabled });
    });
  }
}

function validateTournament(tournament: CricketTournament): Result<void> {
  if (!tournament.promx_tournamentname.trim()) {
    return serviceFailure("Tournament validation failed.", new Error("Tournament name is required."));
  }
  if (!Number.isFinite(tournament.promx_oversperinnings) || tournament.promx_oversperinnings <= 0) {
    return serviceFailure("Tournament validation failed.", new Error("Overs per innings must be greater than zero."));
  }
  const wholeOvers = Math.floor(tournament.promx_oversperinnings);
  const remainingBalls = Math.round((tournament.promx_oversperinnings - wholeOvers) * 10);
  if (remainingBalls > 5 || Math.abs(tournament.promx_oversperinnings - (wholeOvers + remainingBalls / 10)) > 0.000001) {
    return serviceFailure("Tournament validation failed.", new Error("Overs must use whole.balls notation with zero to five balls in the fractional part."));
  }
  if (!Number.isInteger(tournament.promx_playersperteam) || tournament.promx_playersperteam <= 0) {
    return serviceFailure("Tournament validation failed.", new Error("Players per team must be a positive whole number."));
  }
  const points = [tournament.promx_pointsforwin ?? 0, tournament.promx_pointsfortie ?? 0, tournament.promx_pointsforloss ?? 0];
  if (points.some((value) => !Number.isFinite(value) || value < 0)) {
    return serviceFailure("Tournament validation failed.", new Error("Win, tie, and loss points must be non-negative numbers."));
  }
  return { success: true, data: undefined };
}
