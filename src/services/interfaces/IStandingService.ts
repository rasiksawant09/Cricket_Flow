import type { CricketTournamentStanding } from "../../models/CricketTournamentStanding";

export interface IStandingService {
  updateStandings(tournamentId: string): Promise<Result<CricketTournamentStanding[]>>;
  calculateNRR(tournamentId: string, tournamentTeamId: string): Promise<Result<number>>;
  rebuildTournamentTable(tournamentId: string): Promise<Result<CricketTournamentStanding[]>>;
}
