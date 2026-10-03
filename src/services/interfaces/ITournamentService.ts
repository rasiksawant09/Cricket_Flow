import type { CricketTournament } from "../../models/CricketTournament";
import type { CricketTournamentRule } from "../../models/CricketTournamentRule";

export interface ITournamentService {
  getTournaments(): Promise<Result<CricketTournament[]>>;
  getTournament(tournamentId: string): Promise<Result<CricketTournament>>;
  createTournament(tournament: CricketTournament): Promise<Result<CricketTournament>>;
  activateTournament(tournamentId: string): Promise<Result<CricketTournament>>;
  completeTournament(tournamentId: string): Promise<Result<CricketTournament>>;
  archiveTournament(tournamentId: string): Promise<Result<CricketTournament>>;
  createTournamentRule(rule: CricketTournamentRule): Promise<Result<CricketTournamentRule>>;
  updateTournamentRule(rule: CricketTournamentRule): Promise<Result<CricketTournamentRule>>;
  setTournamentRuleEnabled(ruleId: string, enabled: boolean): Promise<Result<CricketTournamentRule>>;
}
