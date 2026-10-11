import { describe, expect, it, vi } from "vitest";
import type { CricketInnings } from "../../models/CricketInnings";
import type { CricketMatch } from "../../models/CricketMatch";
import type { CricketMatchPlayer } from "../../models/CricketMatchPlayer";
import type { CricketTournamentPlayer } from "../../models/CricketTournamentPlayer";
import type { IBallEventRepository } from "../../repositories/interfaces/IBallEventRepository";
import type { IInningsRepository } from "../../repositories/interfaces/IInningsRepository";
import type { IMatchPlayerRepository } from "../../repositories/interfaces/IMatchPlayerRepository";
import type { IMatchRepository } from "../../repositories/interfaces/IMatchRepository";
import type { ITournamentPlayerRepository } from "../../repositories/interfaces/ITournamentPlayerRepository";
import type { IProjectionService } from "../interfaces/IProjectionService";
import type { IRuleEngineService } from "../interfaces/IRuleEngineService";
import type { IMatchService } from "../interfaces/IMatchService";
import { ScoringService } from "./ScoringService";

const match = {
  promx_cricketmatchid: "match",
  promx_tournament: "tournament",
  statuscode: 796280002,
} as CricketMatch;
const innings = {
  promx_cricketinningsid: "innings",
  promx_match: "match",
  promx_battingteam: "team-a",
  promx_bowlingteam: "team-b",
  promx_inningsname: "Innings 1",
  promx_inningsnumber: 1,
} as CricketInnings;

function player(id: string): CricketMatchPlayer {
  return {
    promx_cricketmatchplayerid: id,
    promx_match: "match",
    promx_tournamentplayer: `registration-${id}`,
    promx_playernamesnapshot: id,
    promx_teamsnapshot: "Team",
    promx_isplaying: true,
  };
}

function createService(bowlerTeam: string) {
  const createEvent = vi.fn(async (event: never) => ({ success: true as const, data: event }));
  const registrations = new Map<string, CricketTournamentPlayer>([
    ["registration-striker", { promx_crickettournamentplayerid: "registration-striker", promx_tournament: "tournament", promx_tournamentteam: "team-a", promx_player: "striker", promx_tournamentplayername: "Striker" }],
    ["registration-non-striker", { promx_crickettournamentplayerid: "registration-non-striker", promx_tournament: "tournament", promx_tournamentteam: "team-a", promx_player: "non-striker", promx_tournamentplayername: "Non-striker" }],
    ["registration-bowler", { promx_crickettournamentplayerid: "registration-bowler", promx_tournament: "tournament", promx_tournamentteam: bowlerTeam, promx_player: "bowler", promx_tournamentplayername: "Bowler" }],
  ]);
  const service = new ScoringService(
    { createEvent } as unknown as IBallEventRepository,
    {} as never,
    { getById: async () => ({ success: true as const, data: innings }) } as unknown as IInningsRepository,
    { getById: async () => ({ success: true as const, data: match }) } as unknown as IMatchRepository,
    { getById: async (id: string) => ({ success: true as const, data: id === "striker" ? player(id) : id === "non-striker" ? player(id) : player(id) }) } as unknown as IMatchPlayerRepository,
    { getById: async (id: string) => ({ success: true as const, data: registrations.get(id)! }) } as unknown as ITournamentPlayerRepository,
    { validateBall: async () => ({ success: true as const, data: undefined }) } as unknown as IRuleEngineService,
    {} as IMatchService,
    { refreshAfterEvent: async () => ({ success: true as const, data: undefined }) } as unknown as IProjectionService,
  );
  return { service, createEvent };
}

function event() {
  return {
    promx_balleventname: "Ball 1",
    promx_ballnumber: 1,
    promx_deliverysequencenumber: 1,
    promx_match: "match",
    promx_innings: "innings",
    promx_over: "over",
    promx_strikerbeforeball: "striker",
    promx_nonstrikerbeforeball: "non-striker",
    promx_bowler: "bowler",
    promx_iswicket: false,
  } as never;
}

describe("ScoringService participant membership", () => {
  it("rejects a bowler registered to the batting side before event persistence", async () => {
    const { service, createEvent } = createService("team-a");

    const result = await service.processBall(event());

    expect(result.success).toBe(false);
    expect(createEvent).not.toHaveBeenCalled();
  });

  it("accepts batters and bowler from the correct innings sides", async () => {
    const { service, createEvent } = createService("team-b");

    const result = await service.processBall(event());

    expect(result.success).toBe(true);
    expect(createEvent).toHaveBeenCalledOnce();
  });
});
function createLiveService(existingEvents: unknown[] = []) {
  const createEvent = vi.fn(async (event: never) => ({ success: true as const, data: event }));
  const validateWicket = vi.fn(async () => ({ success: true as const, data: undefined }));
  const registrations = new Map<string, CricketTournamentPlayer>([
    ["registration-striker", { promx_crickettournamentplayerid: "registration-striker", promx_tournament: "tournament", promx_tournamentteam: "team-a", promx_player: "striker", promx_tournamentplayername: "Striker" }],
    ["registration-non-striker", { promx_crickettournamentplayerid: "registration-non-striker", promx_tournament: "tournament", promx_tournamentteam: "team-a", promx_player: "non-striker", promx_tournamentplayername: "Non-striker" }],
    ["registration-bowler", { promx_crickettournamentplayerid: "registration-bowler", promx_tournament: "tournament", promx_tournamentteam: "team-b", promx_player: "bowler", promx_tournamentplayername: "Bowler" }],
  ]);
  const liveInnings = { ...innings, statuscode: 796280001 } as CricketInnings;
  const openOver = { promx_cricketoverid: "over", promx_innings: "innings", promx_overname: "Over 1", promx_overnumber: 1, statuscode: 796280001 };
  const service = new ScoringService(
    { createEvent, getByInnings: async () => ({ success: true as const, data: { items: existingEvents } }) } as unknown as IBallEventRepository,
    { getByInnings: async () => ({ success: true as const, data: { items: [openOver] } }), update: async () => ({ success: true as const, data: openOver }) } as never,
    {
      getByMatch: async () => ({ success: true as const, data: { items: [liveInnings] } }),
      getById: async () => ({ success: true as const, data: liveInnings }),
    } as unknown as IInningsRepository,
    { getById: async () => ({ success: true as const, data: match }) } as unknown as IMatchRepository,
    { getById: async (id: string) => ({ success: true as const, data: player(id) }) } as unknown as IMatchPlayerRepository,
    { getById: async (id: string) => ({ success: true as const, data: registrations.get(id)! }) } as unknown as ITournamentPlayerRepository,
    {
      validateBall: async () => ({ success: true as const, data: undefined }),
      validateWicket,
      getInningsOversLimit: async (_matchId: string, overs: number) => ({ success: true as const, data: overs }),
    } as unknown as IRuleEngineService,
    { getMatchLimits: async () => ({ success: true as const, data: { oversPerInnings: 20, playersPerTeam: 11 } }) } as unknown as IMatchService,
    { refreshAfterEvent: async () => ({ success: true as const, data: undefined }), getMatchState: async () => ({ success: true as const, data: [] }) } as unknown as IProjectionService,
  );
  return { service, createEvent, validateWicket };
}

const crease = { strikerId: "striker", nonStrikerId: "non-striker", bowlerId: "bowler" };

describe("ScoringService Retired Hurt", () => {
  it("records Retired Hurt without a ball, a wicket, or runs, and removes the batter from the crease", async () => {
    const { service, createEvent, validateWicket } = createLiveService();

    const result = await service.recordDelivery({ matchId: "match", kind: "wicket", runs: 0, dismissalType: 796280007, dismissedBatter: "striker", ...crease });

    expect(result.success).toBe(true);
    expect(validateWicket).not.toHaveBeenCalled();
    expect(createEvent).toHaveBeenCalledWith(expect.objectContaining({
      promx_islegaldelivery: false,
      promx_iswicket: false,
      promx_dismissalvalid: false,
      promx_totalruns: 0,
      promx_dismissedplayer: "striker",
      promx_strikerafterball: null,
      promx_nonstrikerafterball: "non-striker",
    }));
  });

  it("still records a normal dismissal as a legal delivery and a wicket", async () => {
    const { service, createEvent } = createLiveService();

    const result = await service.recordDelivery({ matchId: "match", kind: "wicket", runs: 0, dismissalType: 796280000, dismissedBatter: "striker", ...crease });

    expect(result.success).toBe(true);
    expect(createEvent).toHaveBeenCalledWith(expect.objectContaining({ promx_islegaldelivery: true, promx_iswicket: true }));
  });
});

describe("ScoringService undo availability", () => {
  const eventInOpenOver = { promx_cricketballeventid: "event", promx_over: "over", promx_innings: "innings", promx_deliverysequencenumber: 1, promx_islegaldelivery: true, promx_totalruns: 1, statuscode: 1 };

  it("allows undoing the latest ball of the open over", async () => {
    const { service } = createLiveService([eventInOpenOver]);

    const snapshot = await service.getLiveScoringSnapshot("match");

    expect(snapshot.success && snapshot.data.canUndo).toBe(true);
  });

  it("does not allow undo when nothing has been scored", async () => {
    const { service } = createLiveService([]);

    const snapshot = await service.getLiveScoringSnapshot("match");

    expect(snapshot.success && snapshot.data.canUndo).toBe(false);
  });

  it("does not allow undoing a ball from an over that is already closed", async () => {
    const { service } = createLiveService([{ ...eventInOpenOver, promx_over: "closed-over" }]);

    const snapshot = await service.getLiveScoringSnapshot("match");

    expect(snapshot.success && snapshot.data.canUndo).toBe(false);
  });
});
