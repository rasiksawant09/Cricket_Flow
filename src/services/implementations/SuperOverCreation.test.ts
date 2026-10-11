import { describe, expect, it, vi } from "vitest";
import type { CricketInnings } from "../../models/CricketInnings";
import type { CricketMatch } from "../../models/CricketMatch";
import type { CricketOver } from "../../models/CricketOver";
import type { IBallEventRepository } from "../../repositories/interfaces/IBallEventRepository";
import type { IInningsRepository } from "../../repositories/interfaces/IInningsRepository";
import type { IMatchRepository } from "../../repositories/interfaces/IMatchRepository";
import type { IMatchPlayerRepository } from "../../repositories/interfaces/IMatchPlayerRepository";
import type { ITournamentPlayerRepository } from "../../repositories/interfaces/ITournamentPlayerRepository";
import type { IOverRepository } from "../../repositories/interfaces/IOverRepository";
import type { IRuleEngineService } from "../interfaces/IRuleEngineService";
import type { IMatchService } from "../interfaces/IMatchService";
import type { IProjectionService } from "../interfaces/IProjectionService";
import type { DeliveryInput } from "../interfaces/IScoringService";
import { ScoringService } from "./ScoringService";

const SUPER_OVER_INNINGS = 796280001;
const TIED = [
  {
    promx_cricketinningsid: "reg-1",
    promx_match: "match",
    promx_battingteam: "team-a",
    promx_bowlingteam: "team-b",
    promx_inningsname: "Innings 1",
    promx_inningsnumber: 1,
    promx_runs: 20,
    promx_issuperover: false,
    promx_inningstype: 796280000,
    statuscode: 2,
  },
  {
    promx_cricketinningsid: "reg-2",
    promx_match: "match",
    promx_battingteam: "team-b",
    promx_bowlingteam: "team-a",
    promx_inningsname: "Innings 2",
    promx_inningsnumber: 2,
    promx_runs: 20,
    promx_issuperover: false,
    promx_inningstype: 796280000,
    statuscode: 2,
  },
] as CricketInnings[];

function createService(matchStatus: number, existingInnings: CricketInnings[]) {
  const match = {
    promx_cricketmatchid: "match",
    promx_tournament: "tournament",
    promx_teama: "team-a",
    promx_teamb: "team-b",
    statuscode: matchStatus,
  } as CricketMatch;
  const create = vi.fn(async (model: CricketInnings) => ({
    success: true as const,
    data: { ...model, promx_cricketinningsid: "new-innings" },
  }));
  const startSuperOver = vi.fn(async () => ({ success: true as const, data: { ...match, statuscode: 796280005 } }));
  const service = new ScoringService(
    {} as unknown as IBallEventRepository,
    {} as unknown as IOverRepository,
    {
      getByMatch: async () => ({ success: true as const, data: { items: existingInnings } }),
      create,
    } as unknown as IInningsRepository,
    { getById: async () => ({ success: true as const, data: match }) } as unknown as IMatchRepository,
    {} as unknown as IMatchPlayerRepository,
    {} as unknown as ITournamentPlayerRepository,
    { validateInningsStart: async () => ({ success: true as const, data: undefined }) } as unknown as IRuleEngineService,
    { startSuperOver } as unknown as IMatchService,
    { syncInningsState: async () => ({ success: true as const, data: {} }) } as unknown as IProjectionService,
  );
  return { service, create, startSuperOver };
}

describe("ScoringService Super Over creation", () => {
  it("creates innings 3 as a Super Over and transitions Required to Live", async () => {
    const { service, create, startSuperOver } = createService(796280004, TIED);

    const result = await service.startInnings("match");

    expect(result.success).toBe(true);
    expect(startSuperOver).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      promx_inningsnumber: 3,
      promx_battingteam: "team-b",
      promx_bowlingteam: "team-a",
      promx_issuperover: true,
      promx_inningstype: 796280001,
      promx_target: null,
    }));
  });

  it("creates innings 4 for the other team with target set to the first Super Over total plus one", async () => {
    const firstSuperOver: CricketInnings = {
      ...TIED[1]!,
      promx_cricketinningsid: "super-1",
      promx_inningsname: "Super Over 1",
      promx_inningsnumber: 3,
      promx_runs: 7,
      promx_target: null,
      promx_issuperover: true,
      promx_inningstype: 796280001,
    };
    const { service, create, startSuperOver } = createService(796280005, [...TIED, firstSuperOver]);

    const result = await service.startInnings("match");

    expect(result.success).toBe(true);
    expect(startSuperOver).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      promx_inningsnumber: 4,
      promx_battingteam: "team-a",
      promx_bowlingteam: "team-b",
      promx_issuperover: true,
      promx_inningstype: 796280001,
      promx_target: 8,
    }));
  });

  it("ends a Super Over after six legal deliveries despite a longer tournament allocation", async () => {
    const liveSuperOver: CricketInnings = {
      ...TIED[0]!,
      promx_cricketinningsid: "super-live",
      promx_inningsname: "Super Over 1",
      promx_inningsnumber: 3,
      promx_runs: 0,
      promx_issuperover: true,
      promx_inningstype: SUPER_OVER_INNINGS,
      statuscode: 796280001,
    };
    const currentOver = {
      promx_cricketoverid: "super-over",
      promx_innings: "super-live",
      promx_overname: "Over 1",
      promx_overnumber: 1,
      statuscode: 796280001,
    } as CricketOver;
    const events = Array.from({ length: 6 }, (_, index) => ({
      promx_cricketballeventid: `event-${index + 1}`,
      promx_balleventname: `Ball ${index + 1}`,
      promx_ballnumber: index + 1,
      promx_deliverysequencenumber: index + 1,
      promx_match: "match",
      promx_innings: "super-live",
      promx_over: "super-over",
      promx_totalruns: 0,
      promx_batterruns: 0,
      promx_extraruns: 0,
      promx_islegaldelivery: true,
      promx_iswicket: false,
      statuscode: 1,
    }));
    const createEvent = vi.fn();
    const updateInnings = vi.fn(async (model: CricketInnings) => ({ success: true as const, data: model }));
    const createInnings = vi.fn(async (model: CricketInnings) => ({
      success: true as const,
      data: { ...model, promx_cricketinningsid: "super-two" },
    }));
    const tournamentMatch = {
      promx_cricketmatchid: "match",
      promx_tournament: "tournament",
      promx_teama: "team-a",
      promx_teamb: "team-b",
      statuscode: 796280005,
    } as CricketMatch;
    const service = new ScoringService(
      { getByInnings: async () => ({ success: true as const, data: { items: events } }), createEvent } as never,
      {
        getByInnings: async () => ({ success: true as const, data: { items: [currentOver] } }),
        update: async (model: CricketOver) => ({ success: true as const, data: model }),
        create: async (model: CricketOver) => ({ success: true as const, data: model }),
      } as never,
      {
        getByMatch: async () => ({ success: true as const, data: { items: [liveSuperOver] } }),
        getById: async () => ({ success: true as const, data: liveSuperOver }),
        update: updateInnings,
        create: createInnings,
      } as never,
      { getById: async () => ({ success: true as const, data: tournamentMatch }) } as never,
      {} as never,
      {} as never,
      {
        getInningsOversLimit: async (_matchId: string, defaultOvers: number) => ({ success: true as const, data: defaultOvers }),
        validateInningsStart: async () => ({ success: true as const, data: undefined }),
      } as never,
      {
        getMatchLimits: async () => ({ success: true as const, data: { oversPerInnings: 20, playersPerTeam: 11 } }),
      } as never,
      {
        syncInningsState: async () => ({ success: true as const, data: {} }),
        refreshAfterEvent: async () => ({ success: true as const, data: undefined }),
      } as never,
    );

    const result = await service.recordDelivery({ matchId: "match", kind: "runs", runs: 0 } satisfies DeliveryInput);

    expect(result.success).toBe(false);
    expect(updateInnings).toHaveBeenCalledWith(expect.objectContaining({ statuscode: 2, promx_balls: 6, promx_overs: 1 }));
    expect(createInnings).toHaveBeenCalledWith(expect.objectContaining({
      promx_inningsnumber: 4,
      promx_issuperover: true,
      promx_target: 1,
    }));
    expect(createEvent).not.toHaveBeenCalled();
  });
});