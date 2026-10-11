import type { CricketTournamentPlayer } from "../../models/CricketTournamentPlayer";
import type { RepositoryPage } from "./RepositoryPage";

export interface ITournamentPlayerRepository {
  getById(id: string): Promise<Result<CricketTournamentPlayer>>;
  getByTournament(tournamentId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketTournamentPlayer>>>;
  getByTournamentTeam(tournamentTeamId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketTournamentPlayer>>>;
  create(model: CricketTournamentPlayer): Promise<Result<CricketTournamentPlayer>>;
  update(model: CricketTournamentPlayer): Promise<Result<CricketTournamentPlayer>>;
  delete(id: string): Promise<Result<void>>;
}
