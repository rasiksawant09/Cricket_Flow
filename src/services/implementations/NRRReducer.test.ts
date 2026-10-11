import { describe, expect, it } from "vitest";
import { reduceNRR, type NRRInningsScore } from "./NRRReducer";

const completedInnings: NRRInningsScore = {
  matchStatusCode: 2,
  inningsStatusCode: 2,
  battingTeamId: "team-a",
  bowlingTeamId: "team-b",
  runs: 120,
  wickets: 2,
  legalBalls: 111,
};

describe("reduceNRR", () => {
  it("converts legal balls to decimal overs and calculates run rates", () => {
    const result = reduceNRR([completedInnings], ["team-a", "team-b"], {
      oversPerInnings: 20,
      playersPerTeam: 11,
    });

    expect(result.get("team-a")).toEqual({
      runsScored: 120,
      runsConceded: 0,
      oversFaced: 18.5,
      oversBowled: 0,
      netRunRate: 120 / 18.5,
    });
    expect(result.get("team-b")).toEqual({
      runsScored: 0,
      runsConceded: 120,
      oversFaced: 0,
      oversBowled: 18.5,
      netRunRate: -(120 / 18.5),
    });
  });

  it("uses the full allocation for an all-out batting innings, not for balls bowled", () => {
    const result = reduceNRR([{
      ...completedInnings,
      inningsStatusCode: 796280003,
      wickets: 10,
      legalBalls: 50,
    }], ["team-a", "team-b"], { oversPerInnings: 20, playersPerTeam: 11 });

    expect(result.get("team-a")?.oversFaced).toBe(20);
    expect(result.get("team-b")?.oversBowled).toBe(50 / 6);
  });

  it("excludes unfinished, abandoned, cancelled, and Super Over innings", () => {
    const ignored: NRRInningsScore[] = [
      { ...completedInnings, matchStatusCode: 796280007 },
      { ...completedInnings, matchStatusCode: 796280008 },
      { ...completedInnings, matchStatusCode: 796280002 },
      { ...completedInnings, inningsStatusCode: 796280001 },
      { ...completedInnings, isSuperOver: true },
      { ...completedInnings, inningsType: 796280001 },
    ];
    const result = reduceNRR(ignored, ["team-a", "team-b"], {
      oversPerInnings: 20,
      playersPerTeam: 11,
    });

    expect(result.get("team-a")).toEqual({
      runsScored: 0,
      runsConceded: 0,
      oversFaced: 0,
      oversBowled: 0,
      netRunRate: 0,
    });
    expect(result.get("team-b")).toEqual(result.get("team-a"));
  });
});