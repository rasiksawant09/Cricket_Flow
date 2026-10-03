import type { CricketTeam } from "../../models/CricketTeam";
import type { ITeamRepository } from "../../repositories/interfaces/ITeamRepository";
import type { ITeamService } from "../interfaces/ITeamService";
import { guardService } from "./ServiceSupport";

export class TeamService implements ITeamService {
  private readonly teams: ITeamRepository;

  constructor(teams: ITeamRepository) {
    this.teams = teams;
  }

  createTeam(team: CricketTeam): Promise<Result<CricketTeam>> {
    return guardService("Could not create team.", () => this.teams.create(team));
  }

  updateTeam(team: CricketTeam): Promise<Result<CricketTeam>> {
    return guardService("Could not update team.", () => this.teams.update(team));
  }

  activateTeam(teamId: string): Promise<Result<CricketTeam>> {
    return guardService("Could not activate team.", () => this.teams.updateStatus(teamId, 1));
  }

  deactivateTeam(teamId: string): Promise<Result<CricketTeam>> {
    return guardService("Could not deactivate team.", () => this.teams.updateStatus(teamId, 2));
  }
}
