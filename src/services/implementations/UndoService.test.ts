import { describe, expect, it, vi } from "vitest";
import type { CricketBallEvent } from "../../models/CricketBallEvent";
import type { IBallEventRepository } from "../../repositories/interfaces/IBallEventRepository";
import type { IProjectionService } from "../interfaces/IProjectionService";
import { UndoService } from "./UndoService";

const original: CricketBallEvent = {
  promx_cricketballeventid: "original",
  promx_balleventname: "Over 1.1 runs",
  promx_ballnumber: 1,
  promx_deliverysequencenumber: 1,
  promx_match: "match",
  promx_innings: "innings",
  promx_over: "over",
  promx_eventtype: 796280000,
  promx_batterruns: 4,
  promx_extraruns: 0,
  promx_totalruns: 4,
  promx_islegaldelivery: true,
  promx_isboundary: true,
  promx_boundarytype: 796280000,
  promx_iswicket: false,
  promx_strikerbeforeball: "striker",
  promx_nonstrikerbeforeball: "non-striker",
  promx_strikerafterball: "striker",
  promx_nonstrikerafterball: "non-striker",
  promx_bowler: "bowler",
  statuscode: 1,
};

function createService(sourceEvent: CricketBallEvent = original) {
  const createEvent = vi.fn(async (event: CricketBallEvent) => ({
    success: true as const,
    data: { ...event, promx_cricketballeventid: "amendment" },
  }));
  const rebuildMatchProjections = vi.fn(async () => ({ success: true as const, data: undefined }));
  const service = new UndoService(
    {
      getById: async () => ({ success: true as const, data: sourceEvent }),
      getByMatch: async () => ({ success: true as const, data: { items: [sourceEvent] } }),
      createEvent,
    } as unknown as IBallEventRepository,
    { rebuildMatchProjections } as unknown as IProjectionService,
  );
  return { service, createEvent, rebuildMatchProjections };
}

describe("UndoService append-only lineage", () => {
  it("reverses by appending a non-scoring marker that references the original", async () => {
    const { service, createEvent, rebuildMatchProjections } = createService();

    const result = await service.reverseBall(original, "Scorer entered the wrong delivery.");

    expect(result.success).toBe(true);
    expect(createEvent).toHaveBeenCalledWith(expect.objectContaining({
      promx_parentballevent: "original",
      promx_correctionreason: "Scorer entered the wrong delivery.",
      statuscode: 796280001,
      promx_totalruns: 0,
      promx_islegaldelivery: false,
    }));
    expect(rebuildMatchProjections).toHaveBeenCalledWith("match");
  });

  it("appends a corrected replacement and preserves delivery lineage", async () => {
    const { service, createEvent, rebuildMatchProjections } = createService();
    const correction: CricketBallEvent = {
      ...original,
      promx_parentballevent: "original",
      promx_correctionreason: "It was six runs.",
      promx_batterruns: 6,
      promx_totalruns: 6,
      promx_boundarytype: 796280001,
    };

    const result = await service.correctBall(original, correction);

    expect(result.success).toBe(true);
    expect(createEvent).toHaveBeenCalledWith(expect.objectContaining({
      promx_parentballevent: "original",
      promx_correctionreason: "It was six runs.",
      promx_batterruns: 6,
      promx_totalruns: 6,
      promx_boundarytype: 796280001,
      statuscode: 796280002,
    }));
    expect(rebuildMatchProjections).toHaveBeenCalledWith("match");
  });

  it("rejects a correction that would change the original strike rotation", async () => {
    const { service, createEvent, rebuildMatchProjections } = createService();
    const correction = {
      ...original,
      promx_parentballevent: "original",
      promx_correctionreason: "Wrong run count.",
      promx_batterruns: 5,
      promx_totalruns: 5,
    };

    const result = await service.correctBall(original, correction);

    expect(result.success).toBe(false);
    expect(createEvent).not.toHaveBeenCalled();
    expect(rebuildMatchProjections).not.toHaveBeenCalled();
  });

  it("rejects a correction that removes the mandatory Wide extra", async () => {
    const wide: CricketBallEvent = {
      ...original,
      promx_eventtype: 796280001,
      promx_batterruns: 0,
      promx_extraruns: 1,
      promx_totalruns: 1,
      promx_islegaldelivery: false,
      promx_isboundary: false,
      promx_boundarytype: null,
    };
    const { service, createEvent } = createService(wide);

    const result = await service.correctBall(wide, {
      ...wide,
      promx_parentballevent: "original",
      promx_correctionreason: "Attempt to remove the Wide extra.",
      promx_extraruns: 0,
    });

    expect(result.success).toBe(false);
    expect(createEvent).not.toHaveBeenCalled();
  });
});