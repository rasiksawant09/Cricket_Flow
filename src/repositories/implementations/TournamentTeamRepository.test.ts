import { describe, expect, it, vi } from "vitest";
import type { DataClient } from "@microsoft/power-apps/data";
import { TournamentTeamRepository } from "./TournamentTeamRepository";

describe("TournamentTeamRepository", () => {
  it("deletes only the tournament registration record", async () => {
    const deleteRecordAsync = vi.fn(async () => ({ success: true as const, data: undefined }));
    const repository = new TournamentTeamRepository({ deleteRecordAsync } as unknown as DataClient);

    const result = await repository.delete("registration-id");

    expect(result.success).toBe(true);
    expect(deleteRecordAsync).toHaveBeenCalledOnce();
    expect(deleteRecordAsync).toHaveBeenCalledWith("promx_crickettournamentteam", "registration-id");
  });

  it("writes lookup bindings with the declared navigation-property casing", async () => {
    const createRecordAsync = vi.fn(async () => ({
      success: false as const,
      error: new Error("stop after inspecting the create payload"),
    }));
    const repository = new TournamentTeamRepository({ createRecordAsync } as unknown as DataClient);

    await repository.create({
      promx_team: "a67e2926-e2a4-40d1-a6a3-56350b60452f",
      promx_tournament: "20e86737-2055-47f1-a4b6-5176524adf4c",
      promx_tournamentteamname: "Falcons",
    });

    expect(createRecordAsync).toHaveBeenCalledWith("promx_crickettournamentteam", expect.objectContaining({
      "promx_Team@odata.bind": "/promx_cricketteams(a67e2926-e2a4-40d1-a6a3-56350b60452f)",
      "promx_Tournament@odata.bind": "/promx_crickettournaments(20e86737-2055-47f1-a4b6-5176524adf4c)",
    }));
  });
});