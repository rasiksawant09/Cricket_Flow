import type { CricketBatterStatistic } from "../../models/CricketBatterStatistic";
import type { RepositoryPage } from "./RepositoryPage";

export interface IBatterStatisticRepository {
  getByMatch(matchId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketBatterStatistic>>>;
  getByPlayer(matchPlayerId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketBatterStatistic>>>;
  upsert(model: CricketBatterStatistic): Promise<Result<CricketBatterStatistic>>;
}
