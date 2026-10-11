import { describe, expect, it, vi } from "vitest";
import type { CricketTournament } from "../../models/CricketTournament";
import type { ITournamentRepository } from "../../repositories/interfaces/ITournamentRepository";
import type { ITournamentRuleRepository } from "../../repositories/interfaces/ITournamentRuleRepository";
import { TournamentService } from "./TournamentService";

const validTournament = {
  promx_tournamentname: "Office Cup",
  promx_oversperinnings: 20,
  promx_playersperteam: 11,
} as CricketTournament;

describe("TournamentService validation", () => {
  it("rejects blank name, non-positive overs/player count, and negative points", async () => {
    const create = vi.fn(async (tournament: CricketTournament) => ({ success: true as const, data: tournament }));
    const service = new TournamentService({ create } as unknown as ITournamentRepository, {} as ITournamentRuleRepository);

    for (const tournament of [
      { ...validTournament, promx_tournamentname: "   " },
      { ...validTournament, promx_oversperinnings: 0 },
      { ...validTournament, promx_oversperinnings: 3.6 },
      { ...validTournament, promx_playersperteam: 0 },
      { ...validTournament, promx_pointsforwin: -1 },
      { ...validTournament, promx_pointsfortie: -1 },
      { ...validTournament, promx_pointsforloss: -1 },
    ]) {
      const result = await service.createTournament(tournament);
      expect(result.success).toBe(false);
    }
    expect(create).not.toHaveBeenCalled();
  });

  it("creates a valid tournament with default zero point values", async () => {
    const create = vi.fn(async (tournament: CricketTournament) => ({ success: true as const, data: tournament }));
    const service = new TournamentService({ create } as unknown as ITournamentRepository, {} as ITournamentRuleRepository);

    const result = await service.createTournament(validTournament);

    expect(result.success).toBe(true);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      promx_tournamentname: "Office Cup",
      promx_pointsforwin: 0,
      promx_pointsfortie: 0,
      promx_pointsforloss: 0,
    }));
  });

  it("updates supported tournament statuses and rejects unsupported values", async () => {
    const updateStatus = vi.fn(async (_id: string, statusCode: number) => ({
      success: true as const,
      data: { ...validTournament, promx_crickettournamentid: "tournament-1", statuscode: statusCode as 1 },
    }));
    const service = new TournamentService({ updateStatus } as unknown as ITournamentRepository, {} as ITournamentRuleRepository);

    const updated = await service.setTournamentStatus("tournament-1", 1);
    const rejected = await service.setTournamentStatus("tournament-1", 3 as 1);

    expect(updated.success).toBe(true);
    expect(updateStatus).toHaveBeenCalledOnce();
    expect(updateStatus).toHaveBeenCalledWith("tournament-1", 1);
    expect(rejected.success).toBe(false);
  });
});