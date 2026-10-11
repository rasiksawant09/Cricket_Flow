import { describe, expect, it, vi } from "vitest";
import type { CricketMatch } from "../../models/CricketMatch";
import type { CricketMatchPlayer } from "../../models/CricketMatchPlayer";
import type { CricketTournamentPlayer } from "../../models/CricketTournamentPlayer";
import type { IMatchPlayerRepository } from "../../repositories/interfaces/IMatchPlayerRepository";
import type { IMatchRepository } from "../../repositories/interfaces/IMatchRepository";
import type { ITournamentPlayerRepository } from "../../repositories/interfaces/ITournamentPlayerRepository";
import type { ITournamentRepository } from "../../repositories/interfaces/ITournamentRepository";
import type { IMatchService } from "../interfaces/IMatchService";
import { PlayingXIService } from "./PlayingXIService";

const match = {
  promx_cricketmatchid: "match",
  promx_tournament: "tournament",
  promx_teama: "team-a",
  promx_teamb: "team-b",
  promx_tosswinner: "team-a",
  promx_tossdecision: 796280000,
  statuscode: 796280001,
} as CricketMatch;

function snapshot(id: string, teamSnapshot: string): CricketMatchPlayer {
  return {
    promx_cricketmatchplayerid: `match-${id}`,
    promx_match: "match",
    promx_tournamentplayer: id,
    promx_playernamesnapshot: id,
    promx_teamsnapshot: teamSnapshot,
    promx_isplaying: true,
  };
}

function createService(selected: CricketMatchPlayer[]) {
  const registrations = new Map<string, CricketTournamentPlayer>([
    ["player-a", { promx_crickettournamentplayerid: "player-a", promx_tournament: "tournament", promx_tournamentteam: "team-a", promx_player: "a", promx_tournamentplayername: "A" }],
    ["player-b", { promx_crickettournamentplayerid: "player-b", promx_tournament: "tournament", promx_tournamentteam: "team-b", promx_player: "b", promx_tournamentplayername: "B" }],
  ]);
  const startMatch = vi.fn(async () => ({ success: true as const, data: match }));
  const service = new PlayingXIService(
    {
      getByMatch: async () => ({ success: true as const, data: { items: selected } }),
      getById: async (id: string) => ({ success: true as const, data: selected.find((player) => player.promx_cricketmatchplayerid === id)! }),
    } as unknown as IMatchPlayerRepository,
    {
      getById: async (id: string) => ({ success: true as const, data: registrations.get(id)! }),
    } as unknown as ITournamentPlayerRepository,
    { getById: async () => ({ success: true as const, data: match }) } as unknown as IMatchRepository,
    { getById: async () => ({ success: true as const, data: { promx_playersperteam: 1 } }) } as unknown as ITournamentRepository,
    { startMatch } as unknown as IMatchService,
    { validatePlayingXI: async () => ({ success: true as const, data: undefined }) } as never,
  );
  return { service, startMatch };
}

describe("PlayingXIService locking", () => {
  it("does not start a match when either team has fewer than the required players", async () => {
    const { service, startMatch } = createService([snapshot("player-a", "Team A")]);

    const result = await service.lockPlayingXI("match");

    expect(result.success).toBe(false);
    expect(startMatch).not.toHaveBeenCalled();
  });

  it("starts only after both teams have exactly the configured number", async () => {
    const { service, startMatch } = createService([
      snapshot("player-a", "Team A"),
      snapshot("player-b", "Team B"),
    ]);

    const result = await service.lockPlayingXI("match");

    expect(result.success).toBe(true);
    expect(startMatch).toHaveBeenCalledOnce();
  });
});