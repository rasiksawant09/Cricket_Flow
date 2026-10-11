import { describe, expect, it, vi } from "vitest";
import type { CricketInnings } from "../../models/CricketInnings";
import type { CricketMatch } from "../../models/CricketMatch";
import type { IBallEventRepository } from "../../repositories/interfaces/IBallEventRepository";
import type { IInningsRepository } from "../../repositories/interfaces/IInningsRepository";
import type { IMatchRepository } from "../../repositories/interfaces/IMatchRepository";
import type { IMatchService } from "../interfaces/IMatchService";
import type { IMatchPlayerRepository } from "../../repositories/interfaces/IMatchPlayerRepository";
import type { ITournamentPlayerRepository } from "../../repositories/interfaces/ITournamentPlayerRepository";
import type { IOverRepository } from "../../repositories/interfaces/IOverRepository";
import type { IRuleEngineService } from "../interfaces/IRuleEngineService";
import type { IProjectionService } from "../interfaces/IProjectionService";
import { ScoringService } from "./ScoringService";

const SUPER_OVER_REQUIRED = 796280004;
const SUPER_OVER_LIVE = 796280005;
const COMPLETED = 2;
const NORMAL_INNINGS = 796280000;
const SUPER_OVER_INNINGS = 796280001;

function innings(number: number, batting: string, bowling: string, runs: number, isSuperOver = false): CricketInnings {
  return {
    promx_cricketinningsid: `innings-${number}`,
    promx_match: "match",
    promx_battingteam: batting,
    promx_bowlingteam: bowling,
    promx_inningsname: isSuperOver ? `Super Over ${number - 2}` : `Innings ${number}`,
    promx_inningsnumber: number,
    promx_runs: runs,
    promx_wickets: 0,
    promx_issuperover: isSuperOver,
    promx_inningstype: isSuperOver ? SUPER_OVER_INNINGS : NORMAL_INNINGS,
    statuscode: COMPLETED,
  };
}

function createService(matchStatus: number, matchInnings: CricketInnings[], superOverEnabled: boolean) {
  const match = {
    promx_cricketmatchid: "match",
    promx_tournament: "tournament",
    promx_teama: "team-a",
    promx_teamb: "team-b",
    statuscode: matchStatus,
  } as CricketMatch;
  const finalizedOutcomes: unknown[] = [];
  const requireSuperOver = vi.fn(async () => ({
    success: true as const,
    data: { ...match, statuscode: SUPER_OVER_REQUIRED },
  }));
  const finalizeMatch = vi.fn(async (_id: string, outcome: unknown) => {
    finalizedOutcomes.push(outcome);
    return { success: true as const, data: { ...match, statuscode: COMPLETED } };
  });
  const service = new ScoringService(
    {} as unknown as IBallEventRepository,
    {} as unknown as IOverRepository,
    { getByMatch: async () => ({ success: true as const, data: { items: matchInnings } }) } as unknown as IInningsRepository,
    { getById: async () => ({ success: true as const, data: match }) } as unknown as IMatchRepository,
    {} as unknown as IMatchPlayerRepository,
    {} as unknown as ITournamentPlayerRepository,
    { isSuperOverEnabled: async () => ({ success: true as const, data: superOverEnabled }) } as unknown as IRuleEngineService,
    {
      getMatchLimits: async () => ({ success: true as const, data: { playersPerTeam: 11, oversPerInnings: 20 } }),
      requireSuperOver,
      finalizeMatch,
    } as unknown as IMatchService,
    {} as IProjectionService,
  );
  return { service, requireSuperOver, finalizeMatch, finalizedOutcomes };
}

describe("ScoringService Super Over lifecycle", () => {
  it("moves a tied regulation match to Super Over Required when the rule is enabled", async () => {
    const first = innings(1, "team-a", "team-b", 40);
    const second = innings(2, "team-b", "team-a", 40);
    const { service, requireSuperOver, finalizeMatch } = createService(796280002, [first, second], true);

    const result = await service.completeMatch("match");

    expect(result.success).toBe(true);
    expect(requireSuperOver).toHaveBeenCalledOnce();
    expect(finalizeMatch).not.toHaveBeenCalled();
    if (result.success) expect(result.data.statuscode).toBe(SUPER_OVER_REQUIRED);
  });

  it("finalizes a higher Super Over score as Super Over Win", async () => {
    const matchInnings = [
      innings(1, "team-a", "team-b", 40),
      innings(2, "team-b", "team-a", 40),
      innings(3, "team-b", "team-a", 8, true),
      innings(4, "team-a", "team-b", 7, true),
    ];
    const { service, requireSuperOver, finalizeMatch, finalizedOutcomes } = createService(SUPER_OVER_LIVE, matchInnings, true);

    const result = await service.completeMatch("match");

    expect(result.success).toBe(true);
    expect(requireSuperOver).not.toHaveBeenCalled();
    expect(finalizeMatch).toHaveBeenCalledOnce();
    expect(finalizedOutcomes[0]).toMatchObject({
      winnerTeamId: "team-b",
      loserTeamId: "team-a",
      resultType: 796280004,
    });
  });

  it("finalizes equal Super Over scores as a Tie", async () => {
    const matchInnings = [
      innings(1, "team-a", "team-b", 40),
      innings(2, "team-b", "team-a", 40),
      innings(3, "team-b", "team-a", 8, true),
      innings(4, "team-a", "team-b", 8, true),
    ];
    const { service, requireSuperOver, finalizedOutcomes } = createService(SUPER_OVER_LIVE, matchInnings, true);

    const result = await service.completeMatch("match");

    expect(result.success).toBe(true);
    expect(requireSuperOver).not.toHaveBeenCalled();
    expect(finalizedOutcomes[0]).toMatchObject({ winnerTeamId: null, loserTeamId: null, resultType: 796280001 });
  });

  it("finalizes a regulation tie directly when Super Over is disabled", async () => {
    const { service, requireSuperOver, finalizedOutcomes } = createService(796280002, [
      innings(1, "team-a", "team-b", 40),
      innings(2, "team-b", "team-a", 40),
    ], false);

    const result = await service.completeMatch("match");

    expect(result.success).toBe(true);
    expect(requireSuperOver).not.toHaveBeenCalled();
    expect(finalizedOutcomes[0]).toMatchObject({ resultType: 796280001 });
  });
});