import { describe, expect, it, vi } from "vitest";
import type { CricketBatterStatistic } from "../../models/CricketBatterStatistic";
import type { CricketBowlerStatistic } from "../../models/CricketBowlerStatistic";
import type { CricketBallEvent } from "../../models/CricketBallEvent";
import type { CricketInnings } from "../../models/CricketInnings";
import type { CricketMatch } from "../../models/CricketMatch";
import type { CricketMatchPlayer } from "../../models/CricketMatchPlayer";
import type { IBatterStatisticRepository } from "../../repositories/interfaces/IBatterStatisticRepository";
import type { IBowlerStatisticRepository } from "../../repositories/interfaces/IBowlerStatisticRepository";
import type { IMatchPlayerRepository } from "../../repositories/interfaces/IMatchPlayerRepository";
import type { IMatchRepository } from "../../repositories/interfaces/IMatchRepository";
import type { IInningsRepository } from "../../repositories/interfaces/IInningsRepository";
import { StatisticsService } from "./StatisticsService";

const page = <T>(items: T[]) => ({ success: true as const, data: { items } });

describe("StatisticsService tournament leaderboards", () => {
  it("aggregates persisted match statistics by tournament player and converts overs", async () => {
    const matches = ["match-1", "match-2"].map((matchId) => ({
      promx_cricketmatchid: matchId,
      promx_tournament: "tournament",
      promx_teama: "team-a",
      promx_teamb: "team-b",
    })) as CricketMatch[];
    const batterRows = matches.map((match, index) => ({
      promx_batterstatisticsname: `Batter ${index + 1}`,
      promx_match: match.promx_cricketmatchid,
      promx_player: `batter-${index + 1}`,
      promx_runs: index === 0 ? 60 : 40,
      promx_ballsfaced: index === 0 ? 30 : 20,
      promx_fours: index === 0 ? 6 : 4,
      promx_sixes: 1,
      promx_isdismissed: index === 1,
    })) as CricketBatterStatistic[];
    const bowlerRows = matches.map((match, index) => ({
      promx_bowlerstatisticsname: `Bowler ${index + 1}`,
      promx_match: match.promx_cricketmatchid,
      promx_player: `bowler-${index + 1}`,
      promx_overs: index === 0 ? 1.2 : 2.3,
      promx_runsconceded: index === 0 ? 10 : 20,
      promx_wickets: index === 0 ? 1 : 3,
    })) as CricketBowlerStatistic[];
    const matchPlayers = matches.flatMap((match, index) => [
      {
        promx_cricketmatchplayerid: `batter-${index + 1}`,
        promx_match: match.promx_cricketmatchid,
        promx_playernamesnapshot: "A. Batter",
        promx_teamsnapshot: "Falcons",
        promx_tournamentplayer: "tournament-batter",
      },
      {
        promx_cricketmatchplayerid: `bowler-${index + 1}`,
        promx_match: match.promx_cricketmatchid,
        promx_playernamesnapshot: "B. Bowler",
        promx_teamsnapshot: "Comets",
        promx_tournamentplayer: "tournament-bowler",
      },
    ]) as CricketMatchPlayer[];

    const service = new StatisticsService(
      {} as never,
      { getByMatch: async (matchId: string) => page(batterRows.filter((row) => row.promx_match === matchId)) } as unknown as IBatterStatisticRepository,
      { getByMatch: async (matchId: string) => page(bowlerRows.filter((row) => row.promx_match === matchId)) } as unknown as IBowlerStatisticRepository,
      { getByMatch: async (matchId: string) => page(matchPlayers.filter((player) => player.promx_match === matchId)) } as unknown as IMatchPlayerRepository,
      { getByTournament: async () => page(matches) } as unknown as IMatchRepository,
      { getByMatch: async () => page([]) } as never,
    );

    const result = await service.getTournamentLeaderboards("tournament");

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.topRunScorers[0]).toMatchObject({
      playerId: "tournament-batter",
      playerName: "A. Batter",
      teamName: "Falcons",
      runs: 100,
      ballsFaced: 50,
      outs: 1,
      strikeRate: 200,
    });
    expect(result.data.topWicketTakers[0]).toMatchObject({
      playerId: "tournament-bowler",
      playerName: "B. Bowler",
      teamName: "Comets",
      overs: 3.5,
      runsConceded: 30,
      wickets: 4,
      economy: 7.83,
    });
  });

  it("excludes Super Over deliveries from match batting and bowling projections", async () => {
    const events = [
      {
        promx_balleventname: "Regular four",
        promx_ballnumber: 1,
        promx_deliverysequencenumber: 1,
        promx_match: "match",
        promx_innings: "regular-innings",
        promx_over: "regular-over",
        promx_striker: "regular-batter",
        promx_bowler: "regular-bowler",
        promx_batterruns: 4,
        promx_extraruns: 0,
        promx_totalruns: 4,
        promx_islegaldelivery: true,
        promx_isboundary: true,
        promx_boundarytype: 796280000,
        promx_iswicket: false,
        statuscode: 1,
      },
      {
        promx_balleventname: "Super Over six",
        promx_ballnumber: 1,
        promx_deliverysequencenumber: 2,
        promx_match: "match",
        promx_innings: "super-innings",
        promx_over: "super-over",
        promx_striker: "super-batter",
        promx_bowler: "super-bowler",
        promx_batterruns: 6,
        promx_extraruns: 0,
        promx_totalruns: 6,
        promx_islegaldelivery: true,
        promx_isboundary: true,
        promx_boundarytype: 796280001,
        promx_iswicket: false,
        statuscode: 1,
      },
    ] as CricketBallEvent[];
    const innings = [
      {
        promx_cricketinningsid: "regular-innings",
        promx_match: "match",
        promx_battingteam: "team-a",
        promx_bowlingteam: "team-b",
        promx_inningsname: "Innings 1",
        promx_inningsnumber: 1,
        promx_issuperover: false,
        promx_inningstype: 796280000,
      },
      {
        promx_cricketinningsid: "super-innings",
        promx_match: "match",
        promx_battingteam: "team-a",
        promx_bowlingteam: "team-b",
        promx_inningsname: "Super Over 1",
        promx_inningsnumber: 3,
        promx_issuperover: true,
        promx_inningstype: 796280001,
      },
    ] as CricketInnings[];
    const matchPlayers = ["regular-batter", "regular-bowler", "super-batter", "super-bowler"].map((id) => ({
      promx_cricketmatchplayerid: id,
      promx_match: "match",
      promx_playernamesnapshot: id,
      promx_teamsnapshot: "Team",
      promx_tournamentplayer: id,
    })) as CricketMatchPlayer[];
    const service = new StatisticsService(
      { getByMatch: async () => page(events) } as never,
      {} as never,
      {} as never,
      { getByMatch: async () => page(matchPlayers) } as unknown as IMatchPlayerRepository,
      {} as IMatchRepository,
      { getByMatch: async () => page(innings) } as never,
    );

    const batting = await service.calculateBattingStats("match");
    const bowling = await service.calculateBowlingStats("match");
    const scorecards = await service.getInningsScorecard("match");

    expect(batting.success).toBe(true);
    expect(bowling.success).toBe(true);
    expect(scorecards.success).toBe(true);
    if (batting.success) expect(batting.data.map((row) => row.promx_player)).toEqual(["regular-batter"]);
    if (bowling.success) expect(bowling.data.map((row) => row.promx_player)).toEqual(["regular-bowler"]);
    if (scorecards.success) {
      expect(scorecards.data).toHaveLength(2);
      expect(scorecards.data.find((scorecard) => scorecard.inningsId === "regular-innings")).toMatchObject({
        runs: 4,
        batting: [{ playerId: "regular-batter", runs: 4 }],
        bowling: [{ playerId: "regular-bowler", runsConceded: 4 }],
      });
      expect(scorecards.data.find((scorecard) => scorecard.inningsId === "super-innings")).toMatchObject({
        runs: 6,
        batting: [{ playerId: "super-batter", runs: 6 }],
        bowling: [{ playerId: "super-bowler", runsConceded: 6 }],
      });
    }
  });
});

describe("StatisticsService Super Over exclusion", () => {
  it("excludes Super Over events when calculating match batting and bowling rows", async () => {
    const events = [
      {
        promx_balleventname: "Regular four",
        promx_ballnumber: 1,
        promx_deliverysequencenumber: 1,
        promx_match: "match",
        promx_innings: "regular-innings",
        promx_over: "regular-over",
        promx_striker: "regular-player",
        promx_bowler: "regular-bowler",
        promx_batterruns: 4,
        promx_totalruns: 4,
        promx_islegaldelivery: true,
        promx_isboundary: true,
        promx_boundarytype: 796280000,
        statuscode: 1,
      },
      {
        promx_balleventname: "Super Over six",
        promx_ballnumber: 1,
        promx_deliverysequencenumber: 2,
        promx_match: "match",
        promx_innings: "super-innings",
        promx_over: "super-over",
        promx_striker: "super-player",
        promx_bowler: "super-bowler",
        promx_batterruns: 6,
        promx_totalruns: 6,
        promx_islegaldelivery: true,
        promx_isboundary: true,
        promx_boundarytype: 796280001,
        statuscode: 1,
      },
    ] as CricketBallEvent[];
    const innings = [
      {
        promx_cricketinningsid: "regular-innings",
        promx_match: "match",
        promx_battingteam: "team-a",
        promx_bowlingteam: "team-b",
        promx_inningsname: "Innings 1",
        promx_inningsnumber: 1,
        promx_issuperover: false,
        promx_inningstype: 796280000,
      },
      {
        promx_cricketinningsid: "super-innings",
        promx_match: "match",
        promx_battingteam: "team-a",
        promx_bowlingteam: "team-b",
        promx_inningsname: "Super Over 1",
        promx_inningsnumber: 3,
        promx_issuperover: true,
        promx_inningstype: 796280001,
      },
    ] as CricketInnings[];
    const matchPlayers = ["regular-player", "regular-bowler", "super-player", "super-bowler"].map((id) => ({
      promx_cricketmatchplayerid: id,
      promx_match: "match",
      promx_playernamesnapshot: id,
      promx_teamsnapshot: "Team",
      promx_tournamentplayer: id,
    })) as CricketMatchPlayer[];
    const service = new StatisticsService(
      { getByMatch: async () => page(events) } as never,
      {} as never,
      {} as never,
      { getByMatch: async () => page(matchPlayers) } as unknown as IMatchPlayerRepository,
      {} as IMatchRepository,
      { getByMatch: async () => page(innings) } as unknown as IInningsRepository,
    );

    const batting = await service.calculateBattingStats("match");
    const bowling = await service.calculateBowlingStats("match");

    expect(batting.success).toBe(true);
    expect(bowling.success).toBe(true);
    if (batting.success) expect(batting.data.map((row) => row.promx_player)).toEqual(["regular-player"]);
    if (bowling.success) expect(bowling.data.map((row) => row.promx_player)).toEqual(["regular-bowler"]);
  });
});
describe("StatisticsService incremental rebuild", () => {
  const events = [{
    promx_balleventname: "Four", promx_ballnumber: 1, promx_deliverysequencenumber: 1, promx_match: "match", promx_innings: "innings",
    promx_over: "over", promx_striker: "batter", promx_bowler: "bowler", promx_batterruns: 4, promx_extraruns: 0, promx_totalruns: 4,
    promx_islegaldelivery: true, promx_isboundary: true, promx_boundarytype: 796280000, promx_iswicket: false, statuscode: 1,
  }] as CricketBallEvent[];
  const players = ["batter", "bowler"].map((id) => ({ promx_cricketmatchplayerid: id, promx_match: "match", promx_playernamesnapshot: id, promx_teamsnapshot: "Team", promx_tournamentplayer: id })) as CricketMatchPlayer[];
  const currentRow = { promx_cricketbatterstatisticid: "row", promx_batterstatisticsname: "batter - batting", promx_match: "match", promx_player: "batter", promx_runs: 4, promx_ballsfaced: 1, promx_fours: 1, promx_sixes: 0, promx_strikerate: 400, promx_isdismissed: false } as CricketBatterStatistic;

  function create(existing: CricketBatterStatistic[]) {
    const upsert = vi.fn(async (row: CricketBatterStatistic) => ({ success: true as const, data: row }));
    const service = new StatisticsService(
      { getByMatch: async () => page(events) } as never,
      { getByMatch: async () => page(existing), upsert } as unknown as IBatterStatisticRepository,
      { getByMatch: async () => page([]), upsert: vi.fn(async (row: CricketBowlerStatistic) => ({ success: true as const, data: row })) } as unknown as IBowlerStatisticRepository,
      { getByMatch: async () => page(players) } as unknown as IMatchPlayerRepository,
      {} as IMatchRepository,
      { getByMatch: async () => page([{ promx_cricketinningsid: "innings", promx_match: "match" }]) } as never,
    );
    return { service, upsert };
  }

  it("does not write a statistics row whose values are unchanged", async () => {
    const { service, upsert } = create([currentRow]);

    const result = await service.rebuildBattingStatistics("match");

    expect(result.success).toBe(true);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("updates a changed row in place using its existing ID", async () => {
    const { service, upsert } = create([{ ...currentRow, promx_runs: 0, promx_ballsfaced: 0, promx_fours: 0, promx_strikerate: 0 }]);

    const result = await service.rebuildBattingStatistics("match");

    expect(result.success).toBe(true);
    expect(upsert).toHaveBeenCalledOnce();
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ promx_cricketbatterstatisticid: "row", promx_runs: 4, promx_fours: 1 }));
  });

  it("zeroes a stale row for a player with no remaining events", async () => {
    const stale = { ...currentRow, promx_cricketbatterstatisticid: "stale", promx_player: "gone", promx_runs: 9 } as CricketBatterStatistic;
    const { service, upsert } = create([currentRow, stale]);

    await service.rebuildBattingStatistics("match");

    expect(upsert).toHaveBeenCalledOnce();
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ promx_cricketbatterstatisticid: "stale", promx_runs: 0 }));
  });
});

