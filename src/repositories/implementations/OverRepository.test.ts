import { describe, expect, it, vi } from "vitest";
import type { DataClient } from "@microsoft/power-apps/data";
import { InningsRepository } from "./InningsRepository";
import { OverRepository } from "./OverRepository";

function updatePayload(mock: ReturnType<typeof vi.fn>): Record<string, unknown> {
  return (mock.mock.calls[0] as unknown as [string, string, Record<string, unknown>])[2];
}

describe("status and state codes", () => {
  it("sends Inactive state with a Completed over, matching Dataverse's status map", async () => {
    const updateRecordAsync = vi.fn(async () => ({ success: false as const, error: new Error("stop") }));
    const repository = new OverRepository({ updateRecordAsync } as unknown as DataClient);

    await repository.update({
      promx_cricketoverid: "bbc346c3-97c4-f111-a05a-0022480b27e0",
      promx_innings: "20e86737-2055-47f1-a4b6-5176524adf4c",
      promx_overname: "Over 1",
      promx_overnumber: 1,
      statecode: 0,
      statuscode: 2,
    });

    expect(updatePayload(updateRecordAsync)).toMatchObject({ statuscode: 2, statecode: 1 });
  });

  it("keeps Active state for an in-progress over", async () => {
    const updateRecordAsync = vi.fn(async () => ({ success: false as const, error: new Error("stop") }));
    const repository = new OverRepository({ updateRecordAsync } as unknown as DataClient);

    await repository.update({
      promx_cricketoverid: "bbc346c3-97c4-f111-a05a-0022480b27e0",
      promx_innings: "20e86737-2055-47f1-a4b6-5176524adf4c",
      promx_overname: "Over 1",
      promx_overnumber: 1,
      statuscode: 796280001,
    });

    expect(updatePayload(updateRecordAsync)).toMatchObject({ statuscode: 796280001, statecode: 0 });
  });

  it("sends Inactive state for an All Out innings", async () => {
    const updateRecordAsync = vi.fn(async () => ({ success: false as const, error: new Error("stop") }));
    const repository = new InningsRepository({ updateRecordAsync } as unknown as DataClient);

    await repository.update({
      promx_cricketinningsid: "bbc346c3-97c4-f111-a05a-0022480b27e0",
      promx_match: "20e86737-2055-47f1-a4b6-5176524adf4c",
      promx_battingteam: "30e86737-2055-47f1-a4b6-5176524adf4c",
      promx_bowlingteam: "40e86737-2055-47f1-a4b6-5176524adf4c",
      promx_inningsname: "Innings 1",
      promx_inningsnumber: 1,
      statuscode: 796280003,
    });

    expect(updatePayload(updateRecordAsync)).toMatchObject({ statuscode: 796280003, statecode: 1 });
  });
});
