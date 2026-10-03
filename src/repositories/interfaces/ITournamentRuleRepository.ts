import type { CricketTournamentRule } from "../../models/CricketTournamentRule";
import type { RepositoryPage } from "./RepositoryPage";

export interface ITournamentRuleRepository {
  getById(id: string): Promise<Result<CricketTournamentRule>>;
  getByTournament(tournamentId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketTournamentRule>>>;
  getEnabledRules(tournamentId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketTournamentRule>>>;
  create(model: CricketTournamentRule): Promise<Result<CricketTournamentRule>>;
  update(model: CricketTournamentRule): Promise<Result<CricketTournamentRule>>;
}
