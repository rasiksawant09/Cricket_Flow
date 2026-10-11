import type { CricketTournamentTeam } from "../../models/CricketTournamentTeam";
import type { RepositoryPage } from "./RepositoryPage";

export interface ITournamentTeamRepository {
  getById(id: string): Promise<Result<CricketTournamentTeam>>;
  getByTournament(tournamentId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketTournamentTeam>>>;
  create(model: CricketTournamentTeam): Promise<Result<CricketTournamentTeam>>;
  update(model: CricketTournamentTeam): Promise<Result<CricketTournamentTeam>>;
  delete(id: string): Promise<Result<void>>;
}
