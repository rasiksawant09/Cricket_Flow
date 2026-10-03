import type { DataClient } from "@microsoft/power-apps/data";
import { MatchPlayerRepository } from "../repositories/implementations/MatchPlayerRepository";
import { MatchRepository } from "../repositories/implementations/MatchRepository";
import { TournamentPlayerRepository } from "../repositories/implementations/TournamentPlayerRepository";
import { TournamentRepository } from "../repositories/implementations/TournamentRepository";
import { TournamentTeamRepository } from "../repositories/implementations/TournamentTeamRepository";
import { MatchService } from "../services/implementations/MatchService";
import { PlayingXIService } from "../services/implementations/PlayingXIService";
import { TossService } from "../services/implementations/TossService";

export function createMatchServices(client: DataClient) {
  const matches = new MatchRepository(client);
  const tournaments = new TournamentRepository(client);
  const tournamentTeams = new TournamentTeamRepository(client);
  const matchService = new MatchService(matches, tournaments, tournamentTeams);

  return {
    matchService,
    playingXIService: new PlayingXIService(
      new MatchPlayerRepository(client),
      new TournamentPlayerRepository(client),
      matches,
      tournaments,
      matchService,
    ),
    tossService: new TossService(matches),
  };
}