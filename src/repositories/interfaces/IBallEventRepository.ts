import type { CricketBallEvent } from "../../models/CricketBallEvent";
import type { RepositoryPage } from "./RepositoryPage";

export interface IBallEventRepository {
  getById(id: string): Promise<Result<CricketBallEvent>>;
  getByMatch(matchId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketBallEvent>>>;
  getByInnings(inningsId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketBallEvent>>>;
  getByOver(overId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketBallEvent>>>;
  createEvent(model: CricketBallEvent): Promise<Result<CricketBallEvent>>;
}
