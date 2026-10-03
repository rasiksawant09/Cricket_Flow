import type { CricketPlayer } from "../../models/CricketPlayer";

export interface IPlayerService {
  createPlayer(player: CricketPlayer): Promise<Result<CricketPlayer>>;
  updatePlayer(player: CricketPlayer): Promise<Result<CricketPlayer>>;
  activatePlayer(playerId: string): Promise<Result<CricketPlayer>>;
  deactivatePlayer(playerId: string): Promise<Result<CricketPlayer>>;
}
