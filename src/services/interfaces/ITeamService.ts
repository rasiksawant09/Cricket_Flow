import type { CricketTeam } from "../../models/CricketTeam";

export interface ITeamService {
  createTeam(team: CricketTeam): Promise<Result<CricketTeam>>;
  updateTeam(team: CricketTeam): Promise<Result<CricketTeam>>;
  activateTeam(teamId: string): Promise<Result<CricketTeam>>;
  deactivateTeam(teamId: string): Promise<Result<CricketTeam>>;
}
