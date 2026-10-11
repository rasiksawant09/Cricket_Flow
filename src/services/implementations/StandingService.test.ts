import { describe, expect, it, vi } from "vitest";
import type { CricketBallEvent } from "../../models/CricketBallEvent";
import type { CricketInnings } from "../../models/CricketInnings";
import type { CricketMatch } from "../../models/CricketMatch";
import type { CricketTournament } from "../../models/CricketTournament";
import type { CricketTournamentStanding } from "../../models/CricketTournamentStanding";
import type { CricketTournamentTeam } from "../../models/CricketTournamentTeam";
import type { IBallEventRepository } from "../../repositories/interfaces/IBallEventRepository";
import type { IInningsRepository } from "../../repositories/interfaces/IInningsRepository";
import type { IMatchRepository } from "../../repositories/interfaces/IMatchRepository";
import type { ITournamentRepository } from "../../repositories/interfaces/ITournamentRepository";
import type { ITournamentStandingRepository } from "../../repositories/interfaces/ITournamentStandingRepository";
import type { ITournamentTeamRepository } from "../../repositories/interfaces/ITournamentTeamRepository";
import { StandingService } from "./StandingService";

const page = <T>(items: T[]) => ({ success: true as const, data: { items } });

describe("StandingService NRR rebuild", () => {
  it("persists run totals and allocated all-out overs with standings", async () => {
    const tournament = {
      promx_tournamentname: "Cup",
      promx_oversperinnings: 2.3,
      promx_playersperteam: 11,
    } as CricketTournament;
    const teams = ["team-a", "team-b"].map((id) => ({
      promx_crickettournamentteamid: id,
      promx_tournament: "tournament",
      promx_tournamentteamname: id,
    })) as CricketTournamentTeam[];
    const match = {
      promx_cricketmatchid: "match",
      promx_tournament: "tournament",
      promx_teama: "team-a",
      promx_teamb: "team-b",
      promx_resulttype: 796280001,
      statuscode: 2,
    } as CricketMatch;
    const innings = {
      promx_cricketinningsid: "innings",
      promx_match: "match",
      promx_battingteam: "team-a",
      promx_bowlingteam: "team-b",
      promx_inningsname: "Innings 1",
      promx_inningsnumber: 1,
      promx_inningstype: 796280000,
      promx_issuperover: false,
      statuscode: 796280003,
    } as CricketInnings;
    const event = {
      promx_balleventname: "Ball 1",
      promx_ballnumber: 1,
      promx_deliverysequencenumber: 1,
      promx_innings: "innings",
      promx_match: "match",
      promx_over: "over",
      promx_totalruns: 12,
      promx_islegaldelivery: true,
      statuscode: 1,
    } as CricketBallEvent;
    const upsert = vi.fn(async (standing: CricketTournamentStanding) => ({
      success: true as const,
      data: standing,
    }));

    const service = new StandingService(
      { getByTournament: async () => page([match]) } as unknown as IMatchRepository,
      { getByInnings: async () => page([event]) } as unknown as IBallEventRepository,
      { getByMatch: async () => page([innings]) } as unknown as IInningsRepository,
      { getByTournament: async () => page(teams) } as unknown as ITournamentTeamRepository,
      { getById: async () => ({ success: true as const, data: tournament }) } as unknown as ITournamentRepository,
      {
        getByTournament: async () => page([]),
        upsert,
      } as unknown as ITournamentStandingRepository,
    );

    const result = await service.updateStandings("tournament");

    expect(result.success).toBe(true);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      promx_tournamentteam: "team-a",
      promx_runsscored: 12,
      promx_runsconceded: 0,
      promx_oversfaced: 2.5,
      promx_oversbowled: 0,
      promx_netrunrate: 4.8,
    }));
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      promx_tournamentteam: "team-b",
      promx_runsscored: 0,
      promx_runsconceded: 12,
      promx_oversfaced: 0,
      promx_oversbowled: 1 / 6,
      promx_netrunrate: -72,
    }));
  });
});