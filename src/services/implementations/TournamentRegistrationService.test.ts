import { describe, expect, it, vi } from "vitest";
import type { CricketPlayer } from "../../models/CricketPlayer";
import type { CricketTeam } from "../../models/CricketTeam";
import type { CricketTournamentPlayer } from "../../models/CricketTournamentPlayer";
import type { IPlayerRepository } from "../../repositories/interfaces/IPlayerRepository";
import type { ITeamRepository } from "../../repositories/interfaces/ITeamRepository";
import type { ITournamentPlayerRepository } from "../../repositories/interfaces/ITournamentPlayerRepository";
import type { ITournamentRepository } from "../../repositories/interfaces/ITournamentRepository";
import type { ITournamentTeamRepository } from "../../repositories/interfaces/ITournamentTeamRepository";
import { TournamentRegistrationService } from "./TournamentRegistrationService";

const activePlayer = { promx_cricketplayerid: "player", promx_cricketplayer1: "Player One", statuscode: 1, statecode: 0 } as CricketPlayer;
const team = { promx_crickettournamentteamid: "team", promx_tournament: "tournament", statuscode: 1, statecode: 0 };

function makeService(registered: CricketTournamentPlayer[] = [], teamTournament = "tournament") {
  const create = vi.fn(async (player: CricketTournamentPlayer) => ({ success: true as const, data: player }));
  const service = new TournamentRegistrationService(
    { getById: async () => ({ success: true as const, data: { ...team, promx_tournament: teamTournament } }) } as unknown as ITournamentTeamRepository,
    { getByTournament: async () => ({ success: true as const, data: { items: registered } }), create } as unknown as ITournamentPlayerRepository,
    {} as ITeamRepository,
    { getById: async () => ({ success: true as const, data: activePlayer }) } as unknown as IPlayerRepository,
    {} as ITournamentRepository,
  );
  return { service, create };
}

const registration: CricketTournamentPlayer = {
  promx_tournament: "tournament",
  promx_tournamentteam: "team",
  promx_player: "player",
  promx_tournamentplayername: "Player One",
};

describe("TournamentRegistrationService validation", () => {
  it("bulk registers unique active players and returns per-player create failures", async () => {
    const players = [
      { ...activePlayer, promx_cricketplayerid: "player-1", promx_cricketplayer1: "Player One" },
      { ...activePlayer, promx_cricketplayerid: "player-2", promx_cricketplayer1: "Player Two" },
    ];
    const create = vi.fn(async (value: CricketTournamentPlayer) => value.promx_player === "player-2"
      ? { success: false as const, error: new Error("Dataverse rejected this registration.") }
      : { success: true as const, data: { ...value, promx_crickettournamentplayerid: "registration-1" } });
    const getById = vi.fn(async (playerId: string) => {
      const player = players.find((item) => item.promx_cricketplayerid === playerId);
      return player
        ? { success: true as const, data: player }
        : { success: false as const, error: new Error("Player was not found.") };
    });
    const service = new TournamentRegistrationService(
      { getById: async () => ({ success: true as const, data: team }) } as never,
      { getByTournament: async () => ({ success: true as const, data: { items: [] } }), create } as never,
      {} as ITeamRepository,
      { getById } as never,
      {} as ITournamentRepository,
    );

    const result = await service.registerPlayers("tournament", "team", ["player-1", "player-1", "player-2"]);

    expect(getById).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.registered).toHaveLength(1);
      expect(result.data.registered[0]?.promx_player).toBe("player-1");
      expect(result.data.failed).toEqual([{
        playerId: "player-2",
        playerName: "Player Two",
        message: "Dataverse rejected this registration.",
      }]);
    }
  });

  it("creates the Cricket Flow player master before registering it in the tournament", async () => {
    const calls: string[] = [];
    const masterPlayer = { promx_cricketplayerid: "master-player", promx_cricketplayer1: "Player One", statuscode: 1, statecode: 0 } as CricketPlayer;
    const createMaster = vi.fn(async () => {
      calls.push("master");
      return { success: true as const, data: masterPlayer };
    });
    const createRegistration = vi.fn(async (value: CricketTournamentPlayer) => {
      calls.push("registration");
      return { success: true as const, data: value };
    });
    const service = new TournamentRegistrationService(
      { getById: async () => ({ success: true as const, data: team }) } as never,
      { getByTournament: async () => ({ success: true as const, data: { items: [] } }), create: createRegistration } as never,
      {} as ITeamRepository,
      { create: createMaster, getById: async () => ({ success: true as const, data: masterPlayer }) } as never,
      { getById: async () => ({ success: true as const, data: {} }) } as never,
    );

    const result = await service.createAndRegisterPlayer(
      { promx_cricketplayer1: "Player One", promx_gender: 796280000 } as CricketPlayer,
      { promx_tournament: "tournament", promx_tournamentteam: "team" } as never,
    );

    expect(result.success).toBe(true);
    expect(calls).toEqual(["master", "registration"]);
    expect(createRegistration).toHaveBeenCalledWith(expect.objectContaining({ promx_player: "master-player" }));
  });

  it("clears the previous captain of the team when another player is made captain", async () => {
    const current = { promx_crickettournamentplayerid: "p2", promx_tournament: "tournament", promx_tournamentteam: "team", promx_tournamentplayername: "Two" } as CricketTournamentPlayer;
    const previous = { promx_crickettournamentplayerid: "p1", promx_tournamentteam: "team", promx_iscaptain: true } as CricketTournamentPlayer;
    const update = vi.fn(async (value: CricketTournamentPlayer) => ({ success: true as const, data: value }));
    const service = new TournamentRegistrationService(
      { getById: async () => ({ success: true as const, data: team }) } as never,
      {
        getById: async () => ({ success: true as const, data: current }),
        getByTournamentTeam: async () => ({ success: true as const, data: { items: [previous, current] } }),
        update,
      } as never,
      {} as ITeamRepository,
      {} as IPlayerRepository,
      {} as ITournamentRepository,
    );

    const result = await service.updateTournamentPlayer({ ...current, promx_iscaptain: true });

    expect(result.success).toBe(true);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ promx_crickettournamentplayerid: "p1", promx_iscaptain: false }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ promx_crickettournamentplayerid: "p2", promx_iscaptain: true }));
  });

  it("removes a player by deleting only its tournament registration", async () => {
    const deleteRegistration = vi.fn(async () => ({ success: true as const, data: undefined }));
    const service = new TournamentRegistrationService(
      {} as ITournamentTeamRepository,
      { delete: deleteRegistration } as never,
      {} as ITeamRepository,
      {} as IPlayerRepository,
      {} as ITournamentRepository,
    );

    const result = await service.removeTournamentPlayer("registration");

    expect(result.success).toBe(true);
    expect(deleteRegistration).toHaveBeenCalledWith("registration");
  });

  it("creates the Cricket Flow master before registering it in the tournament", async () => {
    const calls: string[] = [];
    const masterTeam = {
      promx_cricketteamid: "master-team",
      promx_teamname: "Falcons",
      promx_teamshortname: "FAL",
      statuscode: 1,
      statecode: 0,
    } as CricketTeam;
    const createMaster = vi.fn(async () => {
      calls.push("master");
      return { success: true as const, data: masterTeam };
    });
    const createRegistration = vi.fn(async (value: never) => {
      calls.push("registration");
      return { success: true as const, data: value };
    });
    const service = new TournamentRegistrationService(
      {
        getByTournament: async () => ({ success: true as const, data: { items: [] } }),
        create: createRegistration,
      } as never,
      {} as ITournamentPlayerRepository,
      { create: createMaster, getById: async () => ({ success: true as const, data: masterTeam }) } as never,
      {} as IPlayerRepository,
      { getById: async () => ({ success: true as const, data: {} }) } as never,
    );

    const result = await service.createAndRegisterTeam("tournament", {
      promx_teamname: "Falcons",
      promx_teamshortname: "FAL",
    } as CricketTeam, "A", 1);

    expect(result.success).toBe(true);
    expect(calls).toEqual(["master", "registration"]);
    expect(createRegistration).toHaveBeenCalledWith(expect.objectContaining({
      promx_team: "master-team",
      promx_tournament: "tournament",
      promx_groupname: "A",
      promx_seednumber: 1,
    }));
  });

  it("removes a team by deleting only its tournament registration", async () => {
    const deleteRegistration = vi.fn(async () => ({ success: true as const, data: undefined }));
    const service = new TournamentRegistrationService(
      { delete: deleteRegistration } as never,
      {} as ITournamentPlayerRepository,
      {} as ITeamRepository,
      {} as IPlayerRepository,
      {} as ITournamentRepository,
    );

    const result = await service.removeTournamentTeam("registration");

    expect(result.success).toBe(true);
    expect(deleteRegistration).toHaveBeenCalledWith("registration");
  });

  it("rejects duplicate team registration in a tournament", async () => {
    const createTeam = vi.fn(async (value: never) => ({ success: true as const, data: value }));
    const registeredTeam = { promx_team: "master-team", promx_tournament: "tournament" };
    const service = new TournamentRegistrationService(
      {
        getByTournament: async () => ({ success: true as const, data: { items: [registeredTeam] } }),
        create: createTeam,
      } as never,
      {} as ITournamentPlayerRepository,
      {
        getById: async () => ({ success: true as const, data: { promx_teamname: "Rangers", statuscode: 1, statecode: 0 } as CricketTeam }),
      } as never,
      {} as IPlayerRepository,
      { getById: async () => ({ success: true as const, data: {} }) } as never,
    );

    const result = await service.registerTeam({
      promx_tournament: "tournament",
      promx_team: "master-team",
      promx_tournamentteamname: "Rangers",
    });

    expect(result.success).toBe(false);
    expect(createTeam).not.toHaveBeenCalled();
  });

  it("rejects a team from another tournament", async () => {
    const { service, create } = makeService([], "another-tournament");

    const result = await service.registerPlayer(registration);

    expect(result.success).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects duplicate player registration in the tournament", async () => {
    const { service, create } = makeService([registration]);

    const result = await service.registerPlayer(registration);

    expect(result.success).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });
});