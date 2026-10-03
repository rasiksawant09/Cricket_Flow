import type { CricketMatchState } from "../../models/CricketMatchState";
import type { RepositoryPage } from "./RepositoryPage";

export interface IMatchStateRepository {
  getByMatch(matchId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketMatchState>>>;
  getByInnings(inningsId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketMatchState>>>;
  upsert(model: CricketMatchState): Promise<Result<CricketMatchState>>;
}
