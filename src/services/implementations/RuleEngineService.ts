import type { CricketBallEvent } from "../../models/CricketBallEvent";
import type { CricketInnings } from "../../models/CricketInnings";
import type { CricketMatchPlayer } from "../../models/CricketMatchPlayer";
import type { CricketTournamentRule } from "../../models/CricketTournamentRule";
import type { IBallEventRepository } from "../../repositories/interfaces/IBallEventRepository";
import type { IInningsRepository } from "../../repositories/interfaces/IInningsRepository";
import type { IMatchPlayerRepository } from "../../repositories/interfaces/IMatchPlayerRepository";
import type { IMatchRepository } from "../../repositories/interfaces/IMatchRepository";
import type { ITournamentPlayerRepository } from "../../repositories/interfaces/ITournamentPlayerRepository";
import type { ITournamentRepository } from "../../repositories/interfaces/ITournamentRepository";
import type { ITournamentRuleRepository } from "../../repositories/interfaces/ITournamentRuleRepository";
import type { IRuleEngineService } from "../interfaces/IRuleEngineService";
import { maxLegalBalls, selectEffectiveEvents } from "./MatchStateReducer";
import { guardService, readAllPages, serviceFailure } from "./ServiceSupport";

type RuleKind = "maximumOversPerBowler" | "playersPerTeam" | "inningsOversLimit" | "minimumPlayers" | "superOver" | "unsupported";
type RuleConfiguration = Record<string, unknown>;

interface ParsedRule {
  rule: CricketTournamentRule;
  kind: RuleKind;
  configuration: RuleConfiguration;
}

interface RuleContext {
  tournamentId: string;
  teamA: string;
  teamB: string;
  playersPerTeam: number;
  oversPerInnings: number;
  rules: ParsedRule[];
}

const MAXIMUM_BOWLER_OVERS_CODES = ["maximumoversperbowler", "maxoversperbowler"] as const;
const PLAYERS_PER_TEAM_CODES = ["playersperteam", "playerperteamvalidation", "playersperteamvalidation"] as const;
const INNINGS_OVERS_CODES = ["inningsooverslimit", "inningsoverslimit", "maxoversperinnings"] as const;
const MINIMUM_PLAYERS_CODES = ["minimumplayersrequirement", "minimumplayers", "minplayers"] as const;
const SUPER_OVER_CODES = ["superover", "superoverrule", "superoverenabled"] as const;

function normalizeRuleCode(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function identifyRule(rule: CricketTournamentRule): RuleKind {
  const code = normalizeRuleCode(`${rule.promx_rulecode} ${rule.promx_rulename}`);
  if (MAXIMUM_BOWLER_OVERS_CODES.some((alias) => code.includes(alias))) return "maximumOversPerBowler";
  if (PLAYERS_PER_TEAM_CODES.some((alias) => code.includes(alias))) return "playersPerTeam";
  if (INNINGS_OVERS_CODES.some((alias) => code.includes(alias))) return "inningsOversLimit";
  if (MINIMUM_PLAYERS_CODES.some((alias) => code.includes(alias))) return "minimumPlayers";
  if (SUPER_OVER_CODES.some((alias) => code.includes(alias))) return "superOver";
  return "unsupported";
}

function parseRule(rule: CricketTournamentRule): Result<ParsedRule> {
  try {
    const parsed: unknown = JSON.parse(rule.promx_configurationjson);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return serviceFailure("Tournament rule configuration is invalid.", new Error(`Rule '${rule.promx_rulename}' must use a JSON object.`));
    }
    return {
      success: true,
      data: { rule, kind: identifyRule(rule), configuration: parsed as RuleConfiguration },
    };
  } catch {
    return serviceFailure("Tournament rule configuration is invalid.", new Error(`Rule '${rule.promx_rulename}' contains malformed JSON.`));
  }
}

function numericSetting(rule: ParsedRule, keys: readonly string[]): number | undefined {
  const normalizedKeys = new Set(keys.map(normalizeRuleCode));
  for (const [key, value] of Object.entries(rule.configuration)) {
    if (normalizedKeys.has(normalizeRuleCode(key)) && typeof value === "number") return value;
  }
  return undefined;
}

function validPositiveLimit(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value > 0;
}

function validPositiveInteger(value: number | undefined): value is number {
  return value !== undefined && Number.isInteger(value) && value > 0;
}

function validCricketOvers(value: number | undefined): value is number {
  if (!validPositiveLimit(value)) return false;
  const whole = Math.floor(value);
  const balls = Math.round((value - whole) * 10);
  return balls <= 5 && Math.abs(value - (whole + balls / 10)) < 0.000001;
}

function ballsByBowler(events: readonly CricketBallEvent[], bowlerId: string): number {
  return selectEffectiveEvents(events).filter((event) => event.promx_bowler === bowlerId && event.promx_islegaldelivery === true).length;
}

export class RuleEngineService implements IRuleEngineService {
  private readonly rules: ITournamentRuleRepository;
  private readonly matches: IMatchRepository;
  private readonly tournaments: ITournamentRepository;
  private readonly events: IBallEventRepository;
  private readonly innings: IInningsRepository;
  private readonly matchPlayers: IMatchPlayerRepository;
  private readonly tournamentPlayers: ITournamentPlayerRepository;

  constructor(
    rules: ITournamentRuleRepository,
    matches: IMatchRepository,
    tournaments: ITournamentRepository,
    events: IBallEventRepository,
    innings: IInningsRepository,
    matchPlayers: IMatchPlayerRepository,
    tournamentPlayers: ITournamentPlayerRepository,
  ) {
    this.rules = rules;
    this.matches = matches;
    this.tournaments = tournaments;
    this.events = events;
    this.innings = innings;
    this.matchPlayers = matchPlayers;
    this.tournamentPlayers = tournamentPlayers;
  }

  validateBall(ballEvent: CricketBallEvent): Promise<Result<void>> {
    return guardService("Rule validation failed.", async () => {
      const [context, innings, events] = await Promise.all([
        this.getRuleContext(ballEvent.promx_match),
        this.innings.getById(ballEvent.promx_innings),
        readAllPages("Could not retrieve Ball Events for rule validation.", (cursor) =>
          this.events.getByInnings(ballEvent.promx_innings, undefined, cursor),
        ),
      ]);
      if (!context.success) return context;
      if (!innings.success) return innings;
      if (innings.data.promx_match !== ballEvent.promx_match) {
        return serviceFailure("Rule validation failed.", new Error("The Ball Event innings does not belong to this match."));
      }
      if (!events.success) return events;
      const effectiveEvents = selectEffectiveEvents(events.data);
      const legalBalls = effectiveEvents.filter((event) => event.promx_islegaldelivery === true).length;

      let inningsOvers = context.data.oversPerInnings;
      for (const inningsRule of context.data.rules.filter((rule) => rule.kind === "inningsOversLimit")) {
        const inningsLimit = this.inningsLimit(inningsRule, context.data.oversPerInnings);
        if (!inningsLimit.success) return inningsLimit;
        inningsOvers = Math.min(inningsOvers, inningsLimit.data);
      }
      const inningsBallCap = maxLegalBalls(inningsOvers);
      if (legalBalls >= inningsBallCap) {
        return serviceFailure("Rule validation failed.", new Error(`The innings has reached its ${inningsOvers} over limit.`));
      }

      for (const bowlerRule of context.data.rules.filter((rule) => rule.kind === "maximumOversPerBowler")) {
        const maximumOvers = numericSetting(bowlerRule, ["maxOversPerBowler", "maximumOversPerBowler", "maxOvers", "overs", "limit"]);
        if (!validCricketOvers(maximumOvers)) {
          return this.invalidRuleLimit(bowlerRule, "maxOversPerBowler", "positive cricket overs in whole.balls notation");
        }
        const bowlerId = ballEvent.promx_bowler;
        if (bowlerId) {
          const bowlerBalls = ballsByBowler(effectiveEvents, bowlerId);
          const bowlerBallCap = maxLegalBalls(maximumOvers);
          if (bowlerBalls >= bowlerBallCap || (ballEvent.promx_islegaldelivery === true && bowlerBalls + 1 > bowlerBallCap)) {
            const overWord = maximumOvers === 1 ? "over" : "overs";
            return serviceFailure("Rule validation failed.", new Error(`This bowler has reached the maximum of ${maximumOvers} ${overWord} for the innings.`));
          }
        }
      }
      return { success: true, data: undefined };
    });
  }

  validateWicket(ballEvent: CricketBallEvent): Promise<Result<void>> {
    return guardService("Wicket validation failed.", async () => {
      const configured = await this.getRuleContext(ballEvent.promx_match);
      if (!configured.success) return configured;
      if (ballEvent.promx_iswicket && (!ballEvent.promx_dismissaltype || !ballEvent.promx_dismissedplayer)) {
        return serviceFailure("Wicket validation failed.", new Error("A wicket requires a dismissal type and dismissed player."));
      }
      return { success: true, data: undefined };
    });
  }

  validateBatter(batter: CricketMatchPlayer): Promise<Result<void>> {
    return this.validatePlayer(batter, "Batter");
  }

  validateBowler(bowler: CricketMatchPlayer): Promise<Result<void>> {
    return this.validatePlayer(bowler, "Bowler");
  }

  validateInningsTransition(innings: CricketInnings): Promise<Result<void>> {
    return guardService("Innings transition validation failed.", async () => {
      const configured = await this.getRuleContext(innings.promx_match);
      if (!configured.success) return configured;
      if (innings.promx_battingteam === innings.promx_bowlingteam) {
        return serviceFailure("Innings transition validation failed.", new Error("Batting and bowling teams must be different."));
      }
      return { success: true, data: undefined };
    });
  }

  validateInningsStart(innings: CricketInnings): Promise<Result<void>> {
    return guardService("Could not start innings.", async () => {
      const context = await this.getRuleContext(innings.promx_match);
      if (!context.success) return context;
      return this.validatePlayerCounts(innings.promx_match, context.data);
    });
  }

  validatePlayingXI(matchId: string): Promise<Result<void>> {
    return guardService("Could not validate Playing XI rules.", async () => {
      const context = await this.getRuleContext(matchId);
      if (!context.success) return context;
      return this.validatePlayerCounts(matchId, context.data);
    });
  }

  isSuperOverEnabled(matchId: string): Promise<Result<boolean>> {
    return guardService("Could not check Super Over rule.", async () => {
      const context = await this.getRuleContext(matchId);
      if (!context.success) return context;
      return { success: true, data: context.data.rules.some((rule) => rule.kind === "superOver") };
    });
  }

  getInningsOversLimit(matchId: string, defaultOvers: number): Promise<Result<number>> {
    return guardService("Could not retrieve innings overs limit.", async () => {
      const context = await this.getRuleContext(matchId);
      if (!context.success) return context;
      if (!validCricketOvers(defaultOvers)) {
        return serviceFailure("Could not retrieve innings overs limit.", new Error("Tournament overs per innings must be positive and use whole.balls notation."));
      }
      let limit = defaultOvers;
      for (const rule of context.data.rules.filter((item) => item.kind === "inningsOversLimit")) {
        const ruleLimit = this.inningsLimit(rule, defaultOvers);
        if (!ruleLimit.success) return ruleLimit;
        limit = Math.min(limit, ruleLimit.data);
      }
      return { success: true, data: limit };
    });
  }

  private validatePlayer(player: CricketMatchPlayer, role: string): Promise<Result<void>> {
    return guardService(`${role} validation failed.`, async () => {
      const configured = await this.getRuleContext(player.promx_match);
      if (!configured.success) return configured;
      if (player.promx_isplaying !== true) {
        return serviceFailure(`${role} validation failed.`, new Error(`${role} must be selected as playing.`));
      }
      return { success: true, data: undefined };
    });
  }

  private async getRuleContext(matchId: string): Promise<Result<RuleContext>> {
    const match = await this.matches.getById(matchId);
    if (!match.success) return match;
    const [tournament, enabledRules] = await Promise.all([
      this.tournaments.getById(match.data.promx_tournament),
      readAllPages("Could not retrieve enabled tournament rules.", (cursor) =>
        this.rules.getEnabledRules(match.data.promx_tournament, undefined, cursor),
      ),
    ]);
    if (!tournament.success) return tournament;
    if (!enabledRules.success) return enabledRules;
    const rules: ParsedRule[] = [];
    for (const rule of enabledRules.data) {
      const parsed = parseRule(rule);
      if (!parsed.success) return parsed;
      rules.push(parsed.data);
    }
    const configurationValidation = this.validateRuleConfigurations(
      rules,
      tournament.data.promx_playersperteam,
      tournament.data.promx_oversperinnings,
    );
    if (!configurationValidation.success) return configurationValidation;
    return {
      success: true,
      data: {
        tournamentId: match.data.promx_tournament,
        teamA: match.data.promx_teama,
        teamB: match.data.promx_teamb,
        playersPerTeam: tournament.data.promx_playersperteam,
        oversPerInnings: tournament.data.promx_oversperinnings,
        rules,
      },
    };
  }

  private async validatePlayerCounts(matchId: string, context: RuleContext): Promise<Result<void>> {
    const playerRules = context.rules.filter((rule) => rule.kind === "playersPerTeam" || rule.kind === "minimumPlayers");
    if (playerRules.length === 0) return { success: true, data: undefined };
    const selectedPlayers = await readAllPages("Could not retrieve Playing XI for rule validation.", (cursor) =>
      this.matchPlayers.getByMatch(matchId, undefined, cursor),
    );
    if (!selectedPlayers.success) return selectedPlayers;

    const counts = new Map<string, number>([[context.teamA, 0], [context.teamB, 0]]);
    for (const matchPlayer of selectedPlayers.data.filter((player) => player.promx_isplaying === true)) {
      const registration = await this.tournamentPlayers.getById(matchPlayer.promx_tournamentplayer);
      if (!registration.success) return registration;
      const teamId = registration.data.promx_tournamentteam;
      if (registration.data.promx_tournament !== context.tournamentId || !counts.has(teamId)) {
        return serviceFailure("Could not validate Playing XI rules.", new Error("Selected players must belong to one of the current match teams."));
      }
      counts.set(teamId, (counts.get(teamId) ?? 0) + 1);
    }

    for (const rule of playerRules) {
      if (rule.kind === "playersPerTeam") {
        const required = numericSetting(rule, ["playersPerTeam", "requiredPlayersPerTeam", "count", "limit"])
          ?? context.playersPerTeam;
        if (!validPositiveInteger(required)) return this.invalidRuleLimit(rule, "playersPerTeam", "a positive whole number");
        for (const count of counts.values()) {
          if (count !== required) {
            return serviceFailure("Could not validate Playing XI rules.", new Error(`Rule '${rule.rule.promx_rulename}' requires exactly ${required} players per team; one team has ${count}.`));
          }
        }
      } else {
        const minimum = numericSetting(rule, ["minimumPlayers", "minimumPlayersRequired", "minimumPlayersPerTeam", "minPlayers", "minPlayersPerTeam", "limit"]);
        if (!validPositiveInteger(minimum)) return this.invalidRuleLimit(rule, "minimumPlayers", "a positive whole number");
        for (const count of counts.values()) {
          if (count < minimum) {
            return serviceFailure("Could not validate Playing XI rules.", new Error(`Rule '${rule.rule.promx_rulename}' requires at least ${minimum} players per team; one team has ${count}.`));
          }
        }
      }
    }
    return { success: true, data: undefined };
  }

  private validateRuleConfigurations(
    rules: readonly ParsedRule[],
    playersPerTeam: number,
    oversPerInnings: number,
  ): Result<void> {
    for (const rule of rules) {
      if (rule.kind === "maximumOversPerBowler") {
        const value = numericSetting(rule, ["maxOversPerBowler", "maximumOversPerBowler", "maxOvers", "overs", "limit"]);
        if (!validCricketOvers(value)) return this.invalidRuleLimit(rule, "maxOversPerBowler", "positive cricket overs in whole.balls notation");
      } else if (rule.kind === "playersPerTeam") {
        const value = numericSetting(rule, ["playersPerTeam", "requiredPlayersPerTeam", "count", "limit"]) ?? playersPerTeam;
        if (!validPositiveInteger(value)) return this.invalidRuleLimit(rule, "playersPerTeam", "a positive whole number");
        if (value !== playersPerTeam) {
          return serviceFailure("Tournament rule configuration is invalid.", new Error(`Rule '${rule.rule.promx_rulename}' must match the tournament setting of ${playersPerTeam} players per team.`));
        }
      } else if (rule.kind === "minimumPlayers") {
        const value = numericSetting(rule, ["minimumPlayers", "minimumPlayersRequired", "minimumPlayersPerTeam", "minPlayers", "minPlayersPerTeam", "limit"]);
        if (!validPositiveInteger(value)) return this.invalidRuleLimit(rule, "minimumPlayers", "a positive whole number");
        if (value > playersPerTeam) {
          return serviceFailure("Tournament rule configuration is invalid.", new Error(`Rule '${rule.rule.promx_rulename}' requires more players than the tournament allows per team.`));
        }
      } else if (rule.kind === "inningsOversLimit") {
        const value = this.inningsLimit(rule, oversPerInnings);
        if (!value.success) return value;
      }
    }
    return { success: true, data: undefined };
  }

  private inningsLimit(rule: ParsedRule | undefined, fallback: number): Result<number> {
    if (!rule) return { success: true, data: fallback };
    const value = numericSetting(rule, ["inningsOversLimit", "maxOversPerInnings", "oversPerInnings", "maxOvers", "overs", "limit"]);
    if (!validCricketOvers(value)) return this.invalidRuleLimit(rule, "inningsOversLimit", "positive cricket overs in whole.balls notation");
    return { success: true, data: Math.min(fallback, value) };
  }

  private invalidRuleLimit<T>(rule: ParsedRule, setting: string, expected: string): Result<T> {
    return serviceFailure("Tournament rule configuration is invalid.", new Error(`Rule '${rule.rule.promx_rulename}' requires '${setting}' to be ${expected}.`));
  }
}
