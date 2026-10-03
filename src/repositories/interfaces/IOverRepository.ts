import type { CricketOver } from "../../models/CricketOver";
import type { RepositoryPage } from "./RepositoryPage";

export interface IOverRepository {
  getById(id: string): Promise<Result<CricketOver>>;
  getByInnings(inningsId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketOver>>>;
  create(model: CricketOver): Promise<Result<CricketOver>>;
  update(model: CricketOver): Promise<Result<CricketOver>>;
}
