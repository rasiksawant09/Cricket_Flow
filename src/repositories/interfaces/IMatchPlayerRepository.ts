import type { CricketMatchPlayer } from "../../models/CricketMatchPlayer";
import type { RepositoryPage } from "./RepositoryPage";

export interface IMatchPlayerRepository {
  getById(id: string): Promise<Result<CricketMatchPlayer>>;
  getByMatch(matchId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketMatchPlayer>>>;
  create(model: CricketMatchPlayer): Promise<Result<CricketMatchPlayer>>;
  update(model: CricketMatchPlayer): Promise<Result<CricketMatchPlayer>>;
}
