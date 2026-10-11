import { describe, expect, it } from "vitest";
import type { CricketBallEvent } from "../../models/CricketBallEvent";
import { reduceInnings, selectEffectiveEvents } from "./MatchStateReducer";
import { reduceBatterStatistics, reduceBowlerStatistics } from "./StatisticsReducer";

function event(overrides: Partial<CricketBallEvent> = {}): CricketBallEvent {
  return {
    promx_balleventname: "Ball 1",
    promx_ballnumber: 1,
    promx_deliverysequencenumber: 1,
    promx_innings: "innings",
    promx_match: "match",
    promx_over: "over",
    promx_totalruns: 4,
    promx_batterruns: 4,
    promx_extraruns: 0,
    promx_islegaldelivery: true,
    promx_isboundary: true,
    promx_boundarytype: 796280000,
    promx_iswicket: false,
    promx_striker: "batter",
    promx_bowler: "bowler",
    statuscode: 1,
    ...overrides,
  };
}

describe("Ball Event lineage projections", () => {
  it("replaces the original with a corrected event in match state and statistics", () => {
    const original = event({ promx_cricketballeventid: "original" });
    const corrected = event({
      promx_cricketballeventid: "corrected",
      promx_balleventname: "Correction of Ball 1",
      promx_parentballevent: "original",
      promx_totalruns: 6,
      promx_batterruns: 6,
      promx_boundarytype: 796280001,
      statuscode: 796280002,
    });
    const history = [original, corrected];

    expect(selectEffectiveEvents(history).map((item) => item.promx_cricketballeventid)).toEqual(["corrected"]);
    expect(reduceInnings("innings", history)).toMatchObject({ runs: 6, legalBalls: 1, wickets: 0 });
    expect(reduceBatterStatistics(history)[0]).toMatchObject({ runs: 6, ballsFaced: 1, sixes: 1, fours: 0 });
    expect(reduceBowlerStatistics(history)[0]).toMatchObject({ runsConceded: 6, legalBalls: 1 });
  });

  it("removes a reversed original from all scoring projections without counting the reversal marker", () => {
    const original = event({ promx_cricketballeventid: "original" });
    const reversal = event({
      promx_cricketballeventid: "reversal",
      promx_balleventname: "Reversal of Ball 1",
      promx_deliverysequencenumber: 2,
      promx_parentballevent: "original",
      promx_eventtype: 796280005,
      promx_totalruns: 0,
      promx_batterruns: 0,
      promx_extraruns: 0,
      promx_islegaldelivery: false,
      promx_isboundary: false,
      promx_iswicket: false,
      statuscode: 796280001,
    });
    const history = [original, reversal];

    expect(selectEffectiveEvents(history)).toEqual([]);
    expect(reduceInnings("innings", history)).toMatchObject({ runs: 0, legalBalls: 0, wickets: 0 });
    expect(reduceBatterStatistics(history)).toEqual([]);
    expect(reduceBowlerStatistics(history)).toEqual([]);
  });

  it("selects the latest correction for one original deterministically", () => {
    const original = event({ promx_cricketballeventid: "original" });
    const firstCorrection = event({
      promx_cricketballeventid: "correction-a",
      promx_parentballevent: "original",
      promx_totalruns: 6,
      promx_batterruns: 6,
      createdon: "2026-10-07T10:00:00.000Z",
      statuscode: 796280002,
    });
    const latestCorrection = event({
      promx_cricketballeventid: "correction-b",
      promx_parentballevent: "original",
      promx_totalruns: 2,
      promx_batterruns: 2,
      createdon: "2026-10-07T10:01:00.000Z",
      statuscode: 796280002,
    });

    expect(selectEffectiveEvents([original, latestCorrection, firstCorrection]).map((item) => item.promx_cricketballeventid)).toEqual(["correction-b"]);
    expect(reduceInnings("innings", [original, firstCorrection, latestCorrection]).runs).toBe(2);
  });

  it("lets a newer reversal supersede a correction and a later correction restore scoring", () => {
    const original = event({ promx_cricketballeventid: "original", createdon: "2026-10-07T10:00:00.000Z" });
    const correction = event({
      promx_cricketballeventid: "correction",
      promx_parentballevent: "original",
      promx_totalruns: 6,
      promx_batterruns: 6,
      createdon: "2026-10-07T10:01:00.000Z",
      statuscode: 796280002,
    });
    const reversal = event({
      promx_cricketballeventid: "reversal",
      promx_parentballevent: "original",
      promx_totalruns: 0,
      promx_batterruns: 0,
      promx_islegaldelivery: false,
      createdon: "2026-10-07T10:02:00.000Z",
      statuscode: 796280001,
    });
    const restoredCorrection = event({
      promx_cricketballeventid: "correction-later",
      promx_parentballevent: "original",
      promx_totalruns: 2,
      promx_batterruns: 2,
      createdon: "2026-10-07T10:03:00.000Z",
      statuscode: 796280002,
    });

    expect(selectEffectiveEvents([original, correction, reversal])).toEqual([]);
    expect(selectEffectiveEvents([reversal, original, correction, restoredCorrection]).map((item) => item.promx_cricketballeventid))
      .toEqual(["correction-later"]);
    expect(reduceInnings("innings", [original, correction, reversal, restoredCorrection]).runs).toBe(2);
  });
});
describe("reduceInnings Retired Hurt", () => {
  it("counts neither a wicket nor a ball and lets the retired batter return later", () => {
    const retiredHurt = {
      promx_cricketballeventid: "retire",
      promx_deliverysequencenumber: 1,
      promx_over: "over",
      promx_innings: "innings",
      promx_match: "match",
      promx_islegaldelivery: false,
      promx_iswicket: false,
      promx_dismissalvalid: false,
      promx_dismissaltype: 796280007,
      promx_dismissedplayer: "striker",
      promx_totalruns: 0,
      promx_strikerbeforeball: "striker",
      promx_nonstrikerbeforeball: "non-striker",
      promx_strikerafterball: null,
      promx_nonstrikerafterball: "non-striker",
      promx_bowler: "bowler",
      statuscode: 1,
    } as never;

    const state = reduceInnings("innings", [retiredHurt]);

    expect(state.wickets).toBe(0);
    expect(state.legalBalls).toBe(0);
    expect(state.striker).toBeNull();
    expect(state.nonStriker).toBe("non-striker");
    expect(state.dismissedPlayerIds).toEqual([]);
  });
});
