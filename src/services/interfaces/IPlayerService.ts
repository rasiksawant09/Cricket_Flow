import type { CricketPlayer } from "../../models/CricketPlayer";

export interface IPlayerService {
  getPlayers(): Promise<Result<CricketPlayer[]>>;
  createPlayer(player: CricketPlayer): Promise<Result<CricketPlayer>>;
  updatePlayer(player: CricketPlayer): Promise<Result<CricketPlayer>>;
  activatePlayer(playerId: string): Promise<Result<CricketPlayer>>;
  deactivatePlayer(playerId: string): Promise<Result<CricketPlayer>>;
  deletePlayer(playerId: string): Promise<Result<void>>;
}
