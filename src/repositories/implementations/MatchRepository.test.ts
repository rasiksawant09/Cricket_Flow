import { describe, expect, it, vi } from "vitest";
import type { DataClient } from "@microsoft/power-apps/data";
import { MatchRepository } from "./MatchRepository";

describe("MatchRepository", () => {
  it("writes lookup bindings with the declared navigation-property casing", async () => {
    const createRecordAsync = vi.fn(async () => ({
      success: false as const,
      error: new Error("stop after inspecting the create payload"),
    }));
    const repository = new MatchRepository({ createRecordAsync } as unknown as DataClient);

    await repository.create({
      promx_tournament: "20e86737-2055-47f1-a4b6-5176524adf4c",
      promx_teama: "a67e2926-e2a4-40d1-a6a3-56350b60452f",
      promx_teamb: "30e86737-2055-47f1-a4b6-5176524adf4c",
    });

    expect(createRecordAsync).toHaveBeenCalledWith("promx_cricketmatch", expect.objectContaining({
      "promx_Tournament@odata.bind": "/promx_crickettournaments(20e86737-2055-47f1-a4b6-5176524adf4c)",
      "promx_TeamA@odata.bind": "/promx_crickettournamentteams(a67e2926-e2a4-40d1-a6a3-56350b60452f)",
      "promx_TeamB@odata.bind": "/promx_crickettournamentteams(30e86737-2055-47f1-a4b6-5176524adf4c)",
    }));
  });
});
