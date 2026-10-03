import type { CricketTournamentPlayer } from "../../models/CricketTournamentPlayer";
import type { CricketTournamentTeam } from "../../models/CricketTournamentTeam";
import type { ITournamentPlayerRepository } from "../../repositories/interfaces/ITournamentPlayerRepository";
import type { ITournamentTeamRepository } from "../../repositories/interfaces/ITournamentTeamRepository";
import type { ITournamentRegistrationService } from "../interfaces/ITournamentRegistrationService";
import { guardService, readAllPages, serviceFailure } from "./ServiceSupport";

export class TournamentRegistrationService implements ITournamentRegistrationService {
  private readonly teams: ITournamentTeamRepository;
  private readonly players: ITournamentPlayerRepository;

  constructor(teams: ITournamentTeamRepository, players: ITournamentPlayerRepository) {
    this.teams = teams;
    this.players = players;
  }

  getTournamentTeams(tournamentId: string): Promise<Result<CricketTournamentTeam[]>> {
    return readAllPages("Could not retrieve tournament teams.", (cursor) =>
      this.teams.getByTournament(tournamentId, undefined, cursor),
    );
  }

  getTournamentPlayers(tournamentId: string): Promise<Result<CricketTournamentPlayer[]>> {
    return readAllPages("Could not retrieve tournament players.", (cursor) =>
      this.players.getByTournament(tournamentId, undefined, cursor),
    );
  }

  registerTeam(team: CricketTournamentTeam): Promise<Result<CricketTournamentTeam>> {
    return guardService("Could not register tournament team.", () => this.teams.create(team));
  }

  registerPlayer(player: CricketTournamentPlayer): Promise<Result<CricketTournamentPlayer>> {
    return guardService("Could not register tournament player.", () => this.players.create(player));
  }

  assignCaptain(player: CricketTournamentPlayer): Promise<Result<CricketTournamentPlayer>> {
    return this.assignRole(player, "promx_iscaptain");
  }

  assignViceCaptain(player: CricketTournamentPlayer): Promise<Result<CricketTournamentPlayer>> {
    return this.assignRole(player, "promx_isvicecaptain");
  }

  private assignRole(
    player: CricketTournamentPlayer,
    role: "promx_iscaptain" | "promx_isvicecaptain",
  ): Promise<Result<CricketTournamentPlayer>> {
    return guardService("Could not assign tournament player role.", async () => {
      const id = player.promx_crickettournamentplayerid;
      if (!id) {
        return serviceFailure("Could not assign tournament player role.", new Error("A registered tournament player ID is required."));
      }
      const roster = await this.players.getByTournamentTeam(player.promx_tournamentteam);
      if (!roster.success) {
        return roster;
      }
      const target = roster.data.items.find((candidate) => candidate.promx_crickettournamentplayerid === id);
      if (!target) {
        return serviceFailure("Could not assign tournament player role.", new Error("The player is not in the supplied tournament team roster."));
      }
      for (const teammate of roster.data.items) {
        if (teammate.promx_crickettournamentplayerid !== id && teammate[role] === true) {
          const cleared = await this.players.update({ ...teammate, [role]: false });
          if (!cleared.success) {
            return cleared;
          }
        }
      }
      return this.players.update({ ...target, [role]: true });
    });
  }
}
