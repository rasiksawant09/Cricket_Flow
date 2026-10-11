import { describe, expect, it, vi } from "vitest";
import type { AuctionPlayer, AuctionTeam } from "../../models/AuctionImport";
import type { CricketPlayer } from "../../models/CricketPlayer";
import type { CricketTeam } from "../../models/CricketTeam";
import type { IAuctionRepository } from "../../repositories/interfaces/IAuctionRepository";
import type { IPlayerRepository } from "../../repositories/interfaces/IPlayerRepository";
import type { ITeamRepository } from "../../repositories/interfaces/ITeamRepository";
import { AuctionImportService } from "./AuctionImportService";

const teamId = "a67e2926-e2a4-40d1-a6a3-56350b60452f";
const playerId = "20e86737-2055-47f1-a4b6-5176524adf4c";
const activeTeam: AuctionTeam = {
  id: teamId,
  name: "Falcons",
  auctionName: "Summer Auction",
  createdOn: null,
  teamColor: "Blue",
};
const activePlayer: AuctionPlayer = { id: playerId, name: "Player One", gender: 796280000 };

function createService(existingTeams: CricketTeam[] = [], existingPlayers: CricketPlayer[] = []) {
  const auction: IAuctionRepository = {
    getActiveTeams: vi.fn(async () => ({ success: true as const, data: { items: [activeTeam] } })),
    getActiveTeamsByIds: vi.fn(async () => ({ success: true as const, data: [activeTeam] })),
    getActiveTeamPlayers: vi.fn(async () => ({ success: true as const, data: { items: [{ teamId, playerId }] } })),
    getActivePlayersByIds: vi.fn(async () => ({ success: true as const, data: [activePlayer] })),
  };
  const createTeam = vi.fn(async (team: CricketTeam) => ({
    success: true as const,
    data: { ...team, promx_cricketteamid: "scoring-team-id" },
  }));
  const createPlayer = vi.fn(async (player: CricketPlayer) => ({
    success: true as const,
    data: { ...player, promx_cricketplayerid: "scoring-player-id" },
  }));
  const teams: ITeamRepository = {
    getById: vi.fn(),
    getAll: vi.fn(async () => ({ success: true as const, data: { items: existingTeams } })),
    create: createTeam,
    update: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn(),
  };
  const players: IPlayerRepository = {
    getById: vi.fn(),
    getAll: vi.fn(async () => ({ success: true as const, data: { items: existingPlayers } })),
    create: createPlayer,
    update: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn(),
  };
  return { service: new AuctionImportService(auction, teams, players), createTeam, createPlayer };
}

describe("AuctionImportService", () => {
  it("previews and copies an active Auction team and its active players into Scoring masters", async () => {
    const { service, createTeam, createPlayer } = createService();
    const preview = await service.preview([teamId]);

    expect(preview.success).toBe(true);
    if (!preview.success) return;
    expect(preview.data).toMatchObject({ teamsToImport: 1, playersToImport: 1 });

    const imported = await service.importTeams([teamId]);

    expect(imported.success).toBe(true);
    if (!imported.success) return;
    expect(imported.data).toMatchObject({ teamsImported: 1, playersImported: 1, teamsFailed: 0, playersFailed: 0 });
    expect(createTeam).toHaveBeenCalledWith(expect.objectContaining({
      promx_teamname: "Falcons",
      promx_teamcolor: "Blue",
      promx_source: 796280001,
      promx_source_reference_id: teamId,
    }));
    expect(createPlayer).toHaveBeenCalledWith(expect.objectContaining({
      promx_cricketplayer1: "Player One",
      promx_gender: 796280000,
      promx_source: 796280001,
      promx_sourcereferenceid: playerId,
    }));
  });

  it("skips masters already imported from the same Auction records", async () => {
    const { service, createTeam, createPlayer } = createService(
      [{ promx_source: 796280001, promx_source_reference_id: teamId } as CricketTeam],
      [{ promx_source: 796280001, promx_sourcereferenceid: playerId } as CricketPlayer],
    );

    const result = await service.importTeams([teamId]);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toMatchObject({ teamsImported: 0, teamsSkipped: 1, playersImported: 0, playersSkipped: 1 });
    expect(createTeam).not.toHaveBeenCalled();
    expect(createPlayer).not.toHaveBeenCalled();
  });
});
