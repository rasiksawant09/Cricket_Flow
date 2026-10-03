import type { CricketTournamentPlayer } from "../../models/CricketTournamentPlayer";
import type { CricketTournamentTeam } from "../../models/CricketTournamentTeam";

export interface ITournamentRegistrationService {
  getTournamentTeams(tournamentId: string): Promise<Result<CricketTournamentTeam[]>>;
  getTournamentPlayers(tournamentId: string): Promise<Result<CricketTournamentPlayer[]>>;
  registerTeam(team: CricketTournamentTeam): Promise<Result<CricketTournamentTeam>>;
  registerPlayer(player: CricketTournamentPlayer): Promise<Result<CricketTournamentPlayer>>;
  assignCaptain(player: CricketTournamentPlayer): Promise<Result<CricketTournamentPlayer>>;
  assignViceCaptain(player: CricketTournamentPlayer): Promise<Result<CricketTournamentPlayer>>;
}
