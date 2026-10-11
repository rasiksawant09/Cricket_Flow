import type { CricketTeam } from "../../models/CricketTeam";
import type { ITeamRepository } from "../../repositories/interfaces/ITeamRepository";
import type { ITeamService } from "../interfaces/ITeamService";
import { guardService, readAllPages, serviceFailure } from "./ServiceSupport";

function validateTeam(team: CricketTeam): Result<void> {
  if (!team.promx_teamname.trim()) {
    return serviceFailure("Team validation failed.", new Error("Team name is required."));
  }
  if (!team.promx_teamshortname.trim()) {
    return serviceFailure("Team validation failed.", new Error("Team short name is required."));
  }
  return { success: true, data: undefined };
}

function normalizeTeam(team: CricketTeam): CricketTeam {
  return {
    ...team,
    promx_teamname: team.promx_teamname.trim(),
    promx_teamshortname: team.promx_teamshortname.trim(),
  };
}

export class TeamService implements ITeamService {
  private readonly teams: ITeamRepository;

  constructor(teams: ITeamRepository) {
    this.teams = teams;
  }

  getTeams(): Promise<Result<CricketTeam[]>> {
    return guardService("Could not retrieve teams.", async () => {
      const result = await readAllPages("Could not retrieve teams.", (cursor) => this.teams.getAll(undefined, cursor));
      if (!result.success) return result;
      return { success: true, data: result.data.filter((team) => team.statecode === 0 && team.statuscode === 1) };
    });
  }

  createTeam(team: CricketTeam): Promise<Result<CricketTeam>> {
    return guardService("Could not create team.", async () => {
      const validation = validateTeam(team);
      if (!validation.success) return validation;
      return this.teams.create({ ...normalizeTeam(team), promx_source: team.promx_source ?? 796280000 });
    });
  }

  updateTeam(team: CricketTeam): Promise<Result<CricketTeam>> {
    return guardService("Could not update team.", async () => {
      const validation = validateTeam(team);
      if (!validation.success) return validation;
      return this.teams.update(normalizeTeam(team));
    });
  }

  activateTeam(teamId: string): Promise<Result<CricketTeam>> {
    return guardService("Could not activate team.", () => this.teams.updateStatus(teamId, 1));
  }

  deactivateTeam(teamId: string): Promise<Result<CricketTeam>> {
    return guardService("Could not deactivate team.", () => this.teams.updateStatus(teamId, 2));
  }

  deleteTeam(teamId: string): Promise<Result<void>> {
    return guardService("Could not delete team.", async () => {
      if (!teamId) {
        return serviceFailure("Could not delete team.", new Error("A team ID is required."));
      }
      return this.teams.delete(teamId);
    });
  }
}
