import type { CricketInnings } from "../../models/CricketInnings";
import type { RepositoryPage } from "./RepositoryPage";

export interface IInningsRepository {
  getById(id: string): Promise<Result<CricketInnings>>;
  getByMatch(matchId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketInnings>>>;
  create(model: CricketInnings): Promise<Result<CricketInnings>>;
  update(model: CricketInnings): Promise<Result<CricketInnings>>;
}
