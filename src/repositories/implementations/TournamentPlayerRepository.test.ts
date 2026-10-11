import { describe, expect, it, vi } from "vitest";
import type { DataClient } from "@microsoft/power-apps/data";
import { TournamentPlayerRepository } from "./TournamentPlayerRepository";

describe("TournamentPlayerRepository", () => {
  it("writes lookup bindings with the declared navigation-property casing", async () => {
    const createRecordAsync = vi.fn(async () => ({
      success: false as const,
      error: new Error("stop after inspecting the create payload"),
    }));
    const repository = new TournamentPlayerRepository({ createRecordAsync } as unknown as DataClient);

    await repository.create({
      promx_player: "a67e2926-e2a4-40d1-a6a3-56350b60452f",
      promx_tournament: "20e86737-2055-47f1-a4b6-5176524adf4c",
      promx_tournamentteam: "30e86737-2055-47f1-a4b6-5176524adf4c",
      promx_tournamentplayername: "Player One",
    });

    expect(createRecordAsync).toHaveBeenCalledWith("promx_crickettournamentplayer", expect.objectContaining({
      "promx_Player@odata.bind": "/promx_cricketplayers(a67e2926-e2a4-40d1-a6a3-56350b60452f)",
      "promx_Tournament@odata.bind": "/promx_crickettournaments(20e86737-2055-47f1-a4b6-5176524adf4c)",
      "promx_TournamentTeam@odata.bind": "/promx_crickettournamentteams(30e86737-2055-47f1-a4b6-5176524adf4c)",
    }));
  });
});