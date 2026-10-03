import type { DataClient } from "@microsoft/power-apps/data";
import { TournamentPlayerRepository } from "../repositories/implementations/TournamentPlayerRepository";
import { TournamentRepository } from "../repositories/implementations/TournamentRepository";
import { TournamentRuleRepository } from "../repositories/implementations/TournamentRuleRepository";
import { TournamentTeamRepository } from "../repositories/implementations/TournamentTeamRepository";
import { TournamentRegistrationService } from "../services/implementations/TournamentRegistrationService";
import { TournamentService } from "../services/implementations/TournamentService";

export function createTournamentServices(client: DataClient) {
  return {
    tournamentService: new TournamentService(
      new TournamentRepository(client),
      new TournamentRuleRepository(client),
    ),
    registrationService: new TournamentRegistrationService(
      new TournamentTeamRepository(client),
      new TournamentPlayerRepository(client),
    ),
  };
}