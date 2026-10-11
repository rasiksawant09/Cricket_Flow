import { describe, expect, it, vi } from "vitest";
import type { DataClient } from "@microsoft/power-apps/data";
import { PlayerRepository } from "./PlayerRepository";

describe("PlayerRepository", () => {
  it("does not select promx_active because it is not available on the live table", async () => {
    const retrieveMultipleRecordsAsync = vi.fn(async () => ({
      success: true as const,
      data: [] as Record<string, unknown>[],
    }));
    const repository = new PlayerRepository({ retrieveMultipleRecordsAsync } as unknown as DataClient);

    const result = await repository.getAll();

    expect(result.success).toBe(true);
    expect(retrieveMultipleRecordsAsync).toHaveBeenCalledWith("promx_cricketplayer", expect.objectContaining({
      select: expect.not.arrayContaining(["promx_active"]),
    }));
  });

  it("does not write promx_active when creating imported players", async () => {
    const createRecordAsync = vi.fn(async () => ({
      success: true as const,
      data: {
        promx_cricketplayer1: "Player One",
        promx_gender: 796280000,
        promx_source: 796280001,
        promx_sourcereferenceid: "auction-player-id",
      },
    }));
    const repository = new PlayerRepository({ createRecordAsync } as unknown as DataClient);

    await repository.create({
      promx_cricketplayer1: "Player One",
      promx_gender: 796280000,
      promx_active: true,
      promx_source: 796280001,
      promx_sourcereferenceid: "auction-player-id",
    });

    expect(createRecordAsync).toHaveBeenCalledWith("promx_cricketplayer", expect.not.objectContaining({ promx_active: true }));
  });
});