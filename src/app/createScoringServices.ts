import type { DataClient } from "@microsoft/power-apps/data";
import { BallEventRepository } from "../repositories/implementations/BallEventRepository";
import { BatterStatisticRepository } from "../repositories/implementations/BatterStatisticRepository";
import { BowlerStatisticRepository } from "../repositories/implementations/BowlerStatisticRepository";
import { InningsRepository } from "../repositories/implementations/InningsRepository";
import { MatchPlayerRepository } from "../repositories/implementations/MatchPlayerRepository";
import { MatchRepository } from "../repositories/implementations/MatchRepository";
import { MatchStateRepository } from "../repositories/implementations/MatchStateRepository";
import { OverRepository } from "../repositories/implementations/OverRepository";
import { TournamentRepository } from "../repositories/implementations/TournamentRepository";
import { TournamentRuleRepository } from "../repositories/implementations/TournamentRuleRepository";
import { TournamentStandingRepository } from "../repositories/implementations/TournamentStandingRepository";
import { TournamentTeamRepository } from "../repositories/implementations/TournamentTeamRepository";
import { TournamentPlayerRepository } from "../repositories/implementations/TournamentPlayerRepository";
import { MatchService } from "../services/implementations/MatchService";
import { ProjectionService } from "../services/implementations/ProjectionService";
import { RuleEngineService } from "../services/implementations/RuleEngineService";
import { ScoringService } from "../services/implementations/ScoringService";
import { StandingService } from "../services/implementations/StandingService";
import { StatisticsService } from "../services/implementations/StatisticsService";
import { UndoService } from "../services/implementations/UndoService";

export function createScoringServices(client: DataClient) {
  const matches = new MatchRepository(client);
  const tournaments = new TournamentRepository(client);
  const tournamentTeams = new TournamentTeamRepository(client);
  const rules = new TournamentRuleRepository(client);
  const events = new BallEventRepository(client);
  const overs = new OverRepository(client);
  const innings = new InningsRepository(client);
  const matchPlayers = new MatchPlayerRepository(client);
  const tournamentPlayers = new TournamentPlayerRepository(client);

  const matchService = new MatchService(matches, tournaments, tournamentTeams);
  const ruleEngine = new RuleEngineService(rules, matches, tournaments, events, innings, matchPlayers, tournamentPlayers);
  const statistics = new StatisticsService(
    events,
    new BatterStatisticRepository(client),
    new BowlerStatisticRepository(client),
    matchPlayers,
    matches,
    innings,
  );
  const standings = new StandingService(
    matches,
    events,
    innings,
    tournamentTeams,
    tournaments,
    new TournamentStandingRepository(client),
  );
  const projectionService = new ProjectionService(
    events,
    matches,
    tournaments,
    new MatchStateRepository(client),
    statistics,
    standings,
  );

  return {
    scoringService: new ScoringService(events, overs, innings, matches, matchPlayers, tournamentPlayers, ruleEngine, matchService, projectionService),
    projectionService,
    undoService: new UndoService(events, projectionService),
    statisticsService: statistics,
    standingService: standings,
  };
}
