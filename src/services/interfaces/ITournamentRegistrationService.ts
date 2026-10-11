import type { CricketTournamentPlayer } from "../../models/CricketTournamentPlayer";
import type { CricketTournamentTeam } from "../../models/CricketTournamentTeam";
import type { CricketTeam } from "../../models/CricketTeam";
import type { CricketPlayer } from "../../models/CricketPlayer";

export type NewTournamentPlayerDetails = Pick<CricketTournamentPlayer, "promx_tournament" | "promx_tournamentteam">
  & Partial<Pick<CricketTournamentPlayer, "promx_playercategory" | "promx_jerseynumber" | "promx_age">>;

export interface BulkPlayerRegistrationFailure {
  playerId: string;
  playerName: string;
  message: string;
}

export interface BulkPlayerRegistrationOutcome {
  registered: CricketTournamentPlayer[];
  failed: BulkPlayerRegistrationFailure[];
}

export interface ITournamentRegistrationService {
  getTournamentTeams(tournamentId: string): Promise<Result<CricketTournamentTeam[]>>;
  getTournamentPlayers(tournamentId: string): Promise<Result<CricketTournamentPlayer[]>>;
  registerTeam(team: CricketTournamentTeam): Promise<Result<CricketTournamentTeam>>;
  createAndRegisterTeam(tournamentId: string, team: CricketTeam, groupName?: string | null, seedNumber?: number | null): Promise<Result<CricketTournamentTeam>>;
  updateTournamentTeam(team: CricketTeam, registration: CricketTournamentTeam): Promise<Result<CricketTournamentTeam>>;
  removeTournamentTeam(registrationId: string): Promise<Result<void>>;
  registerPlayer(player: CricketTournamentPlayer): Promise<Result<CricketTournamentPlayer>>;
  registerPlayers(tournamentId: string, teamId: string, playerIds: readonly string[]): Promise<Result<BulkPlayerRegistrationOutcome>>;
  createAndRegisterPlayer(player: CricketPlayer, details: NewTournamentPlayerDetails): Promise<Result<CricketTournamentPlayer>>;
  updateTournamentPlayer(player: CricketTournamentPlayer): Promise<Result<CricketTournamentPlayer>>;
  removeTournamentPlayer(registrationId: string): Promise<Result<void>>;
  assignCaptain(player: CricketTournamentPlayer): Promise<Result<CricketTournamentPlayer>>;
  assignViceCaptain(player: CricketTournamentPlayer): Promise<Result<CricketTournamentPlayer>>;
}
