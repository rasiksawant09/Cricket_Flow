import type { CricketTournament } from "../../models/CricketTournament";
import type { CricketTournamentRule } from "../../models/CricketTournamentRule";
import type { ITournamentRepository } from "../../repositories/interfaces/ITournamentRepository";
import type { ITournamentRuleRepository } from "../../repositories/interfaces/ITournamentRuleRepository";
import type { ITournamentService } from "../interfaces/ITournamentService";
import { guardService, readAllPages } from "./ServiceSupport";

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
    return guardService("Could not create tournament.", () => this.tournaments.create(tournament));
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
