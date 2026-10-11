import type { DataClient } from "@microsoft/power-apps/data";
import { TournamentPlayerRepository } from "../repositories/implementations/TournamentPlayerRepository";
import { TournamentRepository } from "../repositories/implementations/TournamentRepository";
import { TournamentRuleRepository } from "../repositories/implementations/TournamentRuleRepository";
import { TournamentTeamRepository } from "../repositories/implementations/TournamentTeamRepository";
import { TournamentRegistrationService } from "../services/implementations/TournamentRegistrationService";
import { TournamentService } from "../services/implementations/TournamentService";
import { TeamService } from "../services/implementations/TeamService";
import { PlayerService } from "../services/implementations/PlayerService";
import { TeamRepository } from "../repositories/implementations/TeamRepository";
import { PlayerRepository } from "../repositories/implementations/PlayerRepository";
import { AuctionRepository } from "../repositories/implementations/AuctionRepository";
import { AuctionImportService } from "../services/implementations/AuctionImportService";

export function createTournamentServices(client: DataClient) {
  const masterTeams = new TeamRepository(client);
  const masterPlayers = new PlayerRepository(client);
  const tournamentTeams = new TournamentTeamRepository(client);
  const tournamentPlayers = new TournamentPlayerRepository(client);
  const tournaments = new TournamentRepository(client);
  const auction = new AuctionRepository(client);

  return {
    tournamentService: new TournamentService(
      tournaments,
      new TournamentRuleRepository(client),
    ),
    registrationService: new TournamentRegistrationService(
      tournamentTeams,
      tournamentPlayers,
      masterTeams,
      masterPlayers,
      tournaments,
    ),
    teamService: new TeamService(masterTeams),
    playerService: new PlayerService(masterPlayers),
    auctionImportService: new AuctionImportService(auction, masterTeams, masterPlayers),
  };
}