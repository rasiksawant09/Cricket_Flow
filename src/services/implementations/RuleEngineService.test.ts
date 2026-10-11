import { describe, expect, it } from "vitest";
import type { CricketMatch } from "../../models/CricketMatch";
import type { CricketBallEvent } from "../../models/CricketBallEvent";
import type { CricketMatchPlayer } from "../../models/CricketMatchPlayer";
import type { CricketTournamentRule } from "../../models/CricketTournamentRule";
import type { IMatchRepository } from "../../repositories/interfaces/IMatchRepository";
import type { ITournamentRuleRepository } from "../../repositories/interfaces/ITournamentRuleRepository";
import { RuleEngineService } from "./RuleEngineService";

interface RuleTestSetup {
  rules?: CricketTournamentRule[];
  events?: CricketBallEvent[];
  selectedPlayers?: CricketMatchPlayer[];
  playersPerTeam?: number;
  oversPerInnings?: number;
}

function createService(setup: RuleTestSetup = {}) {
  const rulesToReturn = setup.rules ?? [];
  const rules = {
    getEnabledRules: async () => ({ success: true as const, data: { items: rulesToReturn } }),
  } as unknown as ITournamentRuleRepository;
  const match = {
    promx_tournament: "tournament",
    promx_teama: "team-a",
    promx_teamb: "team-b",
  } as CricketMatch;
  const matches = {
    getById: async () => ({ success: true as const, data: match }),
  } as unknown as IMatchRepository;
  const players = new Map<string, { promx_tournament: string; promx_tournamentteam: string }>();
  for (let index = 0; index < (setup.selectedPlayers ?? []).length; index += 1) {
    const selected = setup.selectedPlayers![index]!;
    players.set(selected.promx_tournamentplayer, {
      promx_tournament: "tournament",
      promx_tournamentteam: index < (setup.selectedPlayers?.length ?? 0) / 2 ? "team-a" : "team-b",
    });
  }
  return new RuleEngineService(
    rules,
    matches,
    { getById: async () => ({ success: true as const, data: {
      promx_playersperteam: setup.playersPerTeam ?? 11,
      promx_oversperinnings: setup.oversPerInnings ?? 20,
    } }) } as never,
    { getByInnings: async () => ({ success: true as const, data: { items: setup.events ?? [] } }) } as never,
    { getById: async () => ({ success: true as const, data: { promx_match: "match" } }) } as never,
    { getByMatch: async () => ({ success: true as const, data: { items: setup.selectedPlayers ?? [] } }) } as never,
    { getById: async (id: string) => ({ success: true as const, data: players.get(id)! }) } as never,
  );
}

function configuredRule(rulecode: string, configuration: Record<string, unknown>): CricketTournamentRule {
  return {
    promx_rulecode: rulecode,
    promx_rulename: rulecode,
    promx_configurationjson: JSON.stringify(configuration),
    promx_tournament: "tournament",
    promx_enabled: true,
  };
}

function delivery(isLegal = true, bowler = "bowler"): CricketBallEvent {
  return {
    promx_balleventname: "Historical ball",
    promx_ballnumber: 1,
    promx_deliverysequencenumber: 1,
    promx_match: "match",
    promx_innings: "innings",
    promx_over: "over",
    promx_bowler: bowler,
    promx_islegaldelivery: isLegal,
    statuscode: 1,
  };
}

function selectedPlayer(id: string): CricketMatchPlayer {
  return {
    promx_cricketmatchplayerid: id,
    promx_match: "match",
    promx_tournamentplayer: id,
    promx_playernamesnapshot: id,
    promx_teamsnapshot: id,
    promx_isplaying: true,
  };
}

describe("RuleEngineService MVP evaluators", () => {
  it("blocks a bowler from exceeding the configured legal-ball overs cap", async () => {
    const service = createService({
      rules: [configuredRule("MaximumOversPerBowler", { maxOversPerBowler: 1 })],
      events: Array.from({ length: 6 }, () => delivery(true, "bowler")),
    });
    const result = await service.validateBall(delivery(true, "bowler"));

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.message).toContain("maximum of 1 over");
  });

  it("allows the next bowler delivery below the configured cap", async () => {
    const service = createService({
      rules: [configuredRule("MAX_OVERS_PER_BOWLER", { maxOvers: 1 })],
      events: Array.from({ length: 5 }, () => delivery(true, "bowler")),
    });
    const result = await service.validateBall(delivery(true, "bowler"));

    expect(result.success).toBe(true);
  });

  it("blocks deliveries after the configured innings overs cap", async () => {
    const service = createService({
      rules: [configuredRule("InningsOversLimit", { inningsOversLimit: 1 })],
      events: Array.from({ length: 6 }, () => delivery(true)),
    });
    const result = await service.validateBall(delivery(false));

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.message).toContain("reached its 1 over limit");
  });

  it("returns the strictest configured innings overs limit", async () => {
    const service = createService({
      rules: [
        configuredRule("InningsOversLimit", { inningsOversLimit: 2.5 }),
        configuredRule("MaxOversPerInnings", { maxOvers: 3 }),
      ],
    });

    const result = await service.getInningsOversLimit("match", 20);

    expect(result).toEqual({ success: true, data: 2.5 });
  });

  it("validates exact players-per-team counts before XI lock", async () => {
    const service = createService({
      rules: [configuredRule("PlayersPerTeamValidation", { playersPerTeam: 2 })],
      selectedPlayers: [selectedPlayer("a1"), selectedPlayer("b1")],
      playersPerTeam: 2,
    });
    const result = await service.validatePlayingXI("match");

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.message).toContain("requires exactly 2 players per team");
  });

  it("validates minimum players per team", async () => {
    const service = createService({
      rules: [configuredRule("MinimumPlayersRequirement", { minimumPlayers: 2 })],
      selectedPlayers: [selectedPlayer("a1"), selectedPlayer("a2"), selectedPlayer("b1")],
    });
    const result = await service.validatePlayingXI("match");

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.message).toContain("requires at least 2 players per team");
  });

  it("rejects a players-per-team rule that conflicts with the tournament roster size", async () => {
    const result = await createService({
      rules: [configuredRule("PlayersPerTeamValidation", { playersPerTeam: 9 })],
      playersPerTeam: 11,
    }).validatePlayingXI("match");

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.message).toContain("must match the tournament setting");
  });

  it("allows valid JSON for currently unsupported tournament rules", async () => {
    const result = await createService({
      rules: [configuredRule("FemaleBatterRule", { canBatAlone: true })],
    }).validateBall({ ...delivery(), promx_match: "match" });

    expect(result.success).toBe(true);
  });

  it("detects an enabled Super Over rule by its rule code", async () => {
    const result = await createService({
      rules: [configuredRule("SuperOverRule", { enabled: true })],
    }).isSuperOverEnabled("match");

    expect(result).toEqual({ success: true, data: true });
  });

  it("rejects malformed enabled rule JSON with a friendly message", async () => {
    const malformed = { ...configuredRule("InningsOversLimit", {}), promx_configurationjson: "{" };
    const result = await createService({ rules: [malformed] }).validateBall(delivery());

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.message).toContain("malformed JSON");
  });
});