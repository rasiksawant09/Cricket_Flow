import type { CricketMatchPlayer } from "../../models/CricketMatchPlayer";

export interface IPlayingXIService {
  getPlayingXI(matchId: string): Promise<Result<CricketMatchPlayer[]>>;
  validatePlayingXI(matchId: string): Promise<Result<void>>;
  createPlayingXI(matchId: string, players: CricketMatchPlayer[]): Promise<Result<CricketMatchPlayer[]>>;
  addPlayer(matchId: string, player: CricketMatchPlayer): Promise<Result<CricketMatchPlayer>>;
  removePlayer(matchPlayerId: string): Promise<Result<void>>;
  lockPlayingXI(matchId: string): Promise<Result<CricketMatchPlayer[]>>;
}
