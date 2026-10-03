import type { CricketPlayer } from "../../models/CricketPlayer";
import type { RepositoryPage } from "./RepositoryPage";

export interface IPlayerRepository {
  getById(id: string): Promise<Result<CricketPlayer>>;
  getAll(pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketPlayer>>>;
  create(model: CricketPlayer): Promise<Result<CricketPlayer>>;
  update(model: CricketPlayer): Promise<Result<CricketPlayer>>;
  updateStatus(id: string, statusCode: number): Promise<Result<CricketPlayer>>;
}
