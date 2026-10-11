import { describe, expect, it, vi } from "vitest";
import type { DataClient } from "@microsoft/power-apps/data";
import { AuctionRepository } from "./AuctionRepository";

describe("AuctionRepository", () => {
  it("requests active teams in the requested page size and carries the continuation token", async () => {
    const retrieveMultipleRecordsAsync = vi.fn(async () => ({
      success: true as const,
      data: [{
        promx_teamid: "a67e2926-e2a4-40d1-a6a3-56350b60452f",
        promx_teamname: "Falcons",
        promx_teamcolor: "Blue",
        createdon: "2026-01-01T00:00:00Z",
        _promx_auction_value: "20e86737-2055-47f1-a4b6-5176524adf4c",
      }],
      skipToken: "next-page-token",
    }));
    const repository = new AuctionRepository({ retrieveMultipleRecordsAsync } as unknown as DataClient);

    const result = await repository.getActiveTeams(10, "current-page-token");

    expect(result.success).toBe(true);
    expect(retrieveMultipleRecordsAsync).toHaveBeenCalledWith("promx_team", expect.objectContaining({
      maxPageSize: 10,
      skipToken: "current-page-token",
      filter: "statecode eq 0 and statuscode eq 1",
    }));
  });

  it("filters Auction team-player relationships to Active status reason", async () => {
    const retrieveMultipleRecordsAsync = vi.fn(async () => ({ success: true as const, data: [] }));
    const repository = new AuctionRepository({ retrieveMultipleRecordsAsync } as unknown as DataClient);

    const result = await repository.getActiveTeamPlayers("a67e2926-e2a4-40d1-a6a3-56350b60452f", 10);

    expect(result.success).toBe(true);
    expect(retrieveMultipleRecordsAsync).toHaveBeenCalledWith("promx_teamplayer", expect.objectContaining({
      maxPageSize: 10,
      filter: "statecode eq 0 and statuscode eq 1 and _promx_team_value eq a67e2926-e2a4-40d1-a6a3-56350b60452f",
    }));
  });
});
