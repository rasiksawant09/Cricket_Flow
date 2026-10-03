import type { CricketBallEvent } from "../../models/CricketBallEvent";
import type { CricketInnings } from "../../models/CricketInnings";
import type { CricketMatchPlayer } from "../../models/CricketMatchPlayer";
import type { IMatchRepository } from "../../repositories/interfaces/IMatchRepository";
import type { ITournamentRuleRepository } from "../../repositories/interfaces/ITournamentRuleRepository";
import type { IRuleEngineService } from "../interfaces/IRuleEngineService";
import { guardService, serviceFailure } from "./ServiceSupport";

export class RuleEngineService implements IRuleEngineService {
  private readonly rules: ITournamentRuleRepository;
  private readonly matches: IMatchRepository;

  constructor(rules: ITournamentRuleRepository, matches: IMatchRepository) {
    this.rules = rules;
    this.matches = matches;
  }

  validateBall(ballEvent: CricketBallEvent): Promise<Result<void>> {
    return this.validateConfiguredRules(ballEvent.promx_match);
  }

  validateWicket(ballEvent: CricketBallEvent): Promise<Result<void>> {
    return guardService("Wicket validation failed.", async () => {
      const configured = await this.validateConfiguredRules(ballEvent.promx_match);
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
      const configured = await this.validateConfiguredRules(innings.promx_match);
      if (!configured.success) return configured;
      if (innings.promx_battingteam === innings.promx_bowlingteam) {
        return serviceFailure("Innings transition validation failed.", new Error("Batting and bowling teams must be different."));
      }
      return { success: true, data: undefined };
    });
  }

  private validatePlayer(player: CricketMatchPlayer, role: string): Promise<Result<void>> {
    return guardService(`${role} validation failed.`, async () => {
      const configured = await this.validateConfiguredRules(player.promx_match);
      if (!configured.success) return configured;
      if (player.promx_isplaying !== true) {
        return serviceFailure(`${role} validation failed.`, new Error(`${role} must be selected as playing.`));
      }
      return { success: true, data: undefined };
    });
  }

  private validateConfiguredRules(matchId: string): Promise<Result<void>> {
    return guardService("Rule validation failed.", async () => {
      const match = await this.matches.getById(matchId);
      if (!match.success) return match;
      const enabledRules = await this.rules.getEnabledRules(match.data.promx_tournament);
      if (!enabledRules.success) return enabledRules;
      for (const rule of enabledRules.data.items) {
        try {
          JSON.parse(rule.promx_configurationjson) as unknown;
        } catch (error) {
          return serviceFailure("Rule validation failed.", error);
        }
        return serviceFailure(
          "Rule validation failed.",
          new Error(`No evaluator is defined for enabled tournament rule '${rule.promx_rulecode}'.`),
        );
      }
      return { success: true, data: undefined };
    });
  }
}
