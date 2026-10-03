import type { CricketPlayer } from "../../models/CricketPlayer";
import type { IPlayerRepository } from "../../repositories/interfaces/IPlayerRepository";
import type { IPlayerService } from "../interfaces/IPlayerService";
import { guardService } from "./ServiceSupport";

export class PlayerService implements IPlayerService {
  private readonly players: IPlayerRepository;

  constructor(players: IPlayerRepository) {
    this.players = players;
  }

  createPlayer(player: CricketPlayer): Promise<Result<CricketPlayer>> {
    return guardService("Could not create player.", () => this.players.create(player));
  }

  updatePlayer(player: CricketPlayer): Promise<Result<CricketPlayer>> {
    return guardService("Could not update player.", () => this.players.update(player));
  }

  activatePlayer(playerId: string): Promise<Result<CricketPlayer>> {
    return guardService("Could not activate player.", () => this.players.updateStatus(playerId, 1));
  }

  deactivatePlayer(playerId: string): Promise<Result<CricketPlayer>> {
    return guardService("Could not deactivate player.", () => this.players.updateStatus(playerId, 2));
  }
}
