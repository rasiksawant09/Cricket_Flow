import type { CricketTeam } from "../../models/CricketTeam";
import type { RepositoryPage } from "./RepositoryPage";

export interface ITeamRepository {
  getById(id: string): Promise<Result<CricketTeam>>;
  getAll(pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketTeam>>>;
  create(model: CricketTeam): Promise<Result<CricketTeam>>;
  update(model: CricketTeam): Promise<Result<CricketTeam>>;
  updateStatus(id: string, statusCode: number): Promise<Result<CricketTeam>>;
  delete(id: string): Promise<Result<void>>;
}
