import type { DataClient } from "@microsoft/power-apps/data";
import { MatchPlayerRepository } from "../repositories/implementations/MatchPlayerRepository";
import { MatchRepository } from "../repositories/implementations/MatchRepository";
import { BallEventRepository } from "../repositories/implementations/BallEventRepository";
import { InningsRepository } from "../repositories/implementations/InningsRepository";
import { TournamentPlayerRepository } from "../repositories/implementations/TournamentPlayerRepository";
import { TournamentRuleRepository } from "../repositories/implementations/TournamentRuleRepository";
import { TournamentRepository } from "../repositories/implementations/TournamentRepository";
import { TournamentTeamRepository } from "../repositories/implementations/TournamentTeamRepository";
import { MatchService } from "../services/implementations/MatchService";
import { PlayingXIService } from "../services/implementations/PlayingXIService";
import { TossService } from "../services/implementations/TossService";
import { RuleEngineService } from "../services/implementations/RuleEngineService";

export function createMatchServices(client: DataClient) {
  const matches = new MatchRepository(client);
  const tournaments = new TournamentRepository(client);
  const tournamentTeams = new TournamentTeamRepository(client);
  const matchPlayers = new MatchPlayerRepository(client);
  const tournamentPlayers = new TournamentPlayerRepository(client);
  const matchService = new MatchService(matches, tournaments, tournamentTeams);
  const rules = new RuleEngineService(
    new TournamentRuleRepository(client),
    matches,
    tournaments,
    new BallEventRepository(client),
    new InningsRepository(client),
    matchPlayers,
    tournamentPlayers,
  );

  return {
    matchService,
    playingXIService: new PlayingXIService(
      matchPlayers,
      tournamentPlayers,
      matches,
      tournaments,
      matchService,
      rules,
    ),
    tossService: new TossService(matches),
  };
}