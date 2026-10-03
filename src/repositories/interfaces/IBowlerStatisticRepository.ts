import type { CricketBowlerStatistic } from "../../models/CricketBowlerStatistic";
import type { RepositoryPage } from "./RepositoryPage";

export interface IBowlerStatisticRepository {
  getByMatch(matchId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketBowlerStatistic>>>;
  getByPlayer(matchPlayerId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketBowlerStatistic>>>;
  upsert(model: CricketBowlerStatistic): Promise<Result<CricketBowlerStatistic>>;
}
