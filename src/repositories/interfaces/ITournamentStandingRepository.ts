import type { CricketTournamentStanding } from "../../models/CricketTournamentStanding";
import type { RepositoryPage } from "./RepositoryPage";

export interface ITournamentStandingRepository {
  getByTournament(tournamentId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketTournamentStanding>>>;
  getByTournamentTeam(tournamentTeamId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketTournamentStanding>>>;
  upsert(model: CricketTournamentStanding): Promise<Result<CricketTournamentStanding>>;
}
