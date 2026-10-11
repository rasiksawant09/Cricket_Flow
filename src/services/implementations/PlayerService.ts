import type { CricketPlayer } from "../../models/CricketPlayer";
import type { IPlayerRepository } from "../../repositories/interfaces/IPlayerRepository";
import type { IPlayerService } from "../interfaces/IPlayerService";
import { guardService, readAllPages, serviceFailure } from "./ServiceSupport";

const GENDERS = [796280000, 796280001, 796280002];

function validatePlayer(player: CricketPlayer): Result<void> {
  if (!player.promx_cricketplayer1.trim()) {
    return serviceFailure("Player validation failed.", new Error("Player name is required."));
  }
  if (!GENDERS.includes(player.promx_gender)) {
    return serviceFailure("Player validation failed.", new Error("Select a valid gender."));
  }
  return { success: true, data: undefined };
}

function normalizePlayer(player: CricketPlayer): CricketPlayer {
  return {
    ...player,
    promx_cricketplayer1: player.promx_cricketplayer1.trim(),
    promx_emailaddress: player.promx_emailaddress?.trim() || null,
    promx_employeeid: player.promx_employeeid?.trim() || null,
  };
}

export class PlayerService implements IPlayerService {
  private readonly players: IPlayerRepository;

  constructor(players: IPlayerRepository) {
    this.players = players;
  }

  getPlayers(): Promise<Result<CricketPlayer[]>> {
    return guardService("Could not retrieve players.", async () => {
      const result = await readAllPages("Could not retrieve players.", (cursor) => this.players.getAll(undefined, cursor));
      if (!result.success) return result;
      return { success: true, data: result.data.filter((player) => player.statecode === 0 && player.statuscode === 1) };
    });
  }

  createPlayer(player: CricketPlayer): Promise<Result<CricketPlayer>> {
    return guardService("Could not create player.", async () => {
      const validation = validatePlayer(player);
      if (!validation.success) return validation;
      return this.players.create({ ...normalizePlayer(player), promx_source: player.promx_source ?? 796280000 });
    });
  }

  updatePlayer(player: CricketPlayer): Promise<Result<CricketPlayer>> {
    return guardService("Could not update player.", async () => {
      const validation = validatePlayer(player);
      if (!validation.success) return validation;
      return this.players.update(normalizePlayer(player));
    });
  }

  activatePlayer(playerId: string): Promise<Result<CricketPlayer>> {
    return guardService("Could not activate player.", () => this.players.updateStatus(playerId, 1));
  }

  deactivatePlayer(playerId: string): Promise<Result<CricketPlayer>> {
    return guardService("Could not deactivate player.", () => this.players.updateStatus(playerId, 2));
  }

  deletePlayer(playerId: string): Promise<Result<void>> {
    return guardService("Could not delete player.", async () => {
      if (!playerId) {
        return serviceFailure("Could not delete player.", new Error("A player ID is required."));
      }
      return this.players.delete(playerId);
    });
  }
}
