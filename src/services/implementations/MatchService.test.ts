import { describe, expect, it, vi } from "vitest";
import type { CricketMatch } from "../../models/CricketMatch";
import type { IMatchRepository } from "../../repositories/interfaces/IMatchRepository";
import type { ITournamentRepository } from "../../repositories/interfaces/ITournamentRepository";
import type { ITournamentTeamRepository } from "../../repositories/interfaces/ITournamentTeamRepository";
import { MatchService } from "./MatchService";

describe("MatchService edit validation", () => {
  it("rejects edits once a match is live", async () => {
    const liveMatch = {
      promx_cricketmatchid: "match",
      promx_tournament: "tournament",
      promx_teama: "team-a",
      promx_teamb: "team-b",
      statuscode: 796280002,
    } as CricketMatch;
    const update = vi.fn(async (match: CricketMatch) => ({ success: true as const, data: match }));
    const service = new MatchService(
      { getById: async () => ({ success: true as const, data: liveMatch }), update } as unknown as IMatchRepository,
      {} as ITournamentRepository,
      {} as ITournamentTeamRepository,
    );

    const result = await service.updateMatch(liveMatch);

    expect(result.success).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });
});