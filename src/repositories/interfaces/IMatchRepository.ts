import type { CricketMatch } from "../../models/CricketMatch";
import type { RepositoryPage } from "./RepositoryPage";

export interface IMatchRepository {
  getById(id: string): Promise<Result<CricketMatch>>;
  getAll(pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketMatch>>>;
  getByTournament(tournamentId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketMatch>>>;
  getUpcoming(pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketMatch>>>;
  getLive(pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketMatch>>>;
  create(model: CricketMatch): Promise<Result<CricketMatch>>;
  update(model: CricketMatch): Promise<Result<CricketMatch>>;
  updateStatus(id: string, statusCode: number): Promise<Result<CricketMatch>>;
}
