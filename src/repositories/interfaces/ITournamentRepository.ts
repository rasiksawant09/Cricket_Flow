import type { CricketTournament } from "../../models/CricketTournament";
import type { RepositoryPage } from "./RepositoryPage";

export interface ITournamentRepository {
  getById(id: string): Promise<Result<CricketTournament>>;
  getAll(pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketTournament>>>;
  getActive(pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketTournament>>>;
  create(model: CricketTournament): Promise<Result<CricketTournament>>;
  update(model: CricketTournament): Promise<Result<CricketTournament>>;
  updateStatus(id: string, statusCode: number): Promise<Result<CricketTournament>>;
}
