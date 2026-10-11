import type { CricketTournamentPlayer } from "../../models/CricketTournamentPlayer";
import type { CricketPlayer } from "../../models/CricketPlayer";
import type { CricketTournamentTeam } from "../../models/CricketTournamentTeam";
import type { IPlayerRepository } from "../../repositories/interfaces/IPlayerRepository";
import type { ITeamRepository } from "../../repositories/interfaces/ITeamRepository";
import type { ITournamentRepository } from "../../repositories/interfaces/ITournamentRepository";
import type { ITournamentPlayerRepository } from "../../repositories/interfaces/ITournamentPlayerRepository";
import type { ITournamentTeamRepository } from "../../repositories/interfaces/ITournamentTeamRepository";
import type { BulkPlayerRegistrationFailure, BulkPlayerRegistrationOutcome, ITournamentRegistrationService, NewTournamentPlayerDetails } from "../interfaces/ITournamentRegistrationService";
import { guardService, readAllPages, serviceFailure } from "./ServiceSupport";

const GENDERS = [796280000, 796280001, 796280002];

function validatePlayerRegistrationDetails(details: {
  promx_jerseynumber?: number | null;
  promx_age?: number | null;
  promx_iscaptain?: boolean | null;
  promx_isvicecaptain?: boolean | null;
}): Result<void> {
  const { promx_jerseynumber: jersey, promx_age: age } = details;
  if (jersey != null && (!Number.isInteger(jersey) || jersey < 0)) {
    return serviceFailure("Player validation failed.", new Error("Jersey number must be a whole number of zero or more."));
  }
  if (age != null && (!Number.isInteger(age) || age <= 0)) {
    return serviceFailure("Player validation failed.", new Error("Age must be a positive whole number."));
  }
  if (details.promx_iscaptain === true && details.promx_isvicecaptain === true) {
    return serviceFailure("Player validation failed.", new Error("A player cannot be both captain and vice captain."));
  }
  return { success: true, data: undefined };
}

export class TournamentRegistrationService implements ITournamentRegistrationService {
  private readonly teams: ITournamentTeamRepository;
  private readonly players: ITournamentPlayerRepository;
  private readonly masterTeams: ITeamRepository;
  private readonly masterPlayers: IPlayerRepository;
  private readonly tournaments: ITournamentRepository;

  constructor(
    teams: ITournamentTeamRepository,
    players: ITournamentPlayerRepository,
    masterTeams: ITeamRepository,
    masterPlayers: IPlayerRepository,
    tournaments: ITournamentRepository,
  ) {
    this.teams = teams;
    this.players = players;
    this.masterTeams = masterTeams;
    this.masterPlayers = masterPlayers;
    this.tournaments = tournaments;
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
    return guardService("Could not register tournament team.", async () => {
      const tournament = await this.tournaments.getById(team.promx_tournament);
      if (!tournament.success) return tournament;
      const masterTeam = await this.masterTeams.getById(team.promx_team);
      if (!masterTeam.success) return masterTeam;
      if (masterTeam.data.statecode !== 0 || masterTeam.data.statuscode !== 1) {
        return serviceFailure("Could not register tournament team.", new Error("Only active teams can be registered."));
      }
      const registered = await this.getTournamentTeams(team.promx_tournament);
      if (!registered.success) return registered;
      if (registered.data.some((current) => current.promx_team === team.promx_team)) {
        return serviceFailure("Could not register tournament team.", new Error("This team is already registered in the tournament."));
      }
      return this.teams.create({ ...team, promx_tournamentteamname: masterTeam.data.promx_teamname });
    });
  }

  createAndRegisterTeam(
    tournamentId: string,
    team: import("../../models/CricketTeam").CricketTeam,
    groupName?: string | null,
    seedNumber?: number | null,
  ): Promise<Result<CricketTournamentTeam>> {
    return guardService("Could not add a team to the tournament.", async () => {
      if (!team.promx_teamname.trim() || !team.promx_teamshortname.trim()) {
        return serviceFailure("Could not add a team to the tournament.", new Error("Team name and short name are required."));
      }
      const tournament = await this.tournaments.getById(tournamentId);
      if (!tournament.success) return tournament;
      const registrations = await this.getTournamentTeams(tournamentId);
      if (!registrations.success) return registrations;
      if (registrations.data.some((registration) =>
        registration.promx_tournamentteamname.trim().toLocaleLowerCase() === team.promx_teamname.trim().toLocaleLowerCase(),
      )) {
        return serviceFailure("Could not add a team to the tournament.", new Error("A team with this name is already registered in the tournament."));
      }

      const master = await this.masterTeams.create({
        ...team,
        promx_teamname: team.promx_teamname.trim(),
        promx_teamshortname: team.promx_teamshortname.trim(),
      });
      if (!master.success) return master;
      if (!master.data.promx_cricketteamid) {
        return serviceFailure("Could not add a team to the tournament.", new Error("The team was created, but Dataverse did not return its team ID. Register it from the existing team list."));
      }

      const registration = await this.registerTeam({
        promx_tournament: tournamentId,
        promx_team: master.data.promx_cricketteamid,
        promx_tournamentteamname: team.promx_teamname.trim(),
        promx_groupname: groupName?.trim() || null,
        promx_seednumber: seedNumber ?? null,
      });
      if (!registration.success) {
        return serviceFailure(
          "The team master was saved, but its tournament registration failed.",
          new Error(`The team was saved to Cricket Flow, but could not be registered in this tournament: ${registration.error.message} You can register it from the existing team list.`),
        );
      }
      return registration;
    });
  }

  updateTournamentTeam(
    team: import("../../models/CricketTeam").CricketTeam,
    registration: CricketTournamentTeam,
  ): Promise<Result<CricketTournamentTeam>> {
    return guardService("Could not update tournament team.", async () => {
      const registrationId = registration.promx_crickettournamentteamid;
      const teamId = team.promx_cricketteamid;
      if (!registrationId || !teamId || registration.promx_team !== teamId) {
        return serviceFailure("Could not update tournament team.", new Error("Team and tournament registration IDs are required and must match."));
      }
      if (!team.promx_teamname.trim() || !team.promx_teamshortname.trim()) {
        return serviceFailure("Could not update tournament team.", new Error("Team name and short name are required."));
      }
      const updatedTeam = await this.masterTeams.update({
        ...team,
        promx_teamname: team.promx_teamname.trim(),
        promx_teamshortname: team.promx_teamshortname.trim(),
      });
      if (!updatedTeam.success) return updatedTeam;

      return this.teams.update({
        ...registration,
        promx_tournamentteamname: updatedTeam.data.promx_teamname,
      });
    });
  }

  removeTournamentTeam(registrationId: string): Promise<Result<void>> {
    return guardService("Could not remove team from tournament.", async () => {
      if (!registrationId) {
        return serviceFailure("Could not remove team from tournament.", new Error("A tournament team registration ID is required."));
      }
      return this.teams.delete(registrationId);
    });
  }

  registerPlayer(player: CricketTournamentPlayer): Promise<Result<CricketTournamentPlayer>> {
    return guardService("Could not register tournament player.", async () => {
      const [team, masterPlayer, tournamentPlayers] = await Promise.all([
        this.teams.getById(player.promx_tournamentteam),
        this.masterPlayers.getById(player.promx_player),
        this.getTournamentPlayers(player.promx_tournament),
      ]);
      if (!team.success) return team;
      if (!masterPlayer.success) return masterPlayer;
      if (!tournamentPlayers.success) return tournamentPlayers;
      if (team.data.promx_tournament !== player.promx_tournament) {
        return serviceFailure("Could not register tournament player.", new Error("Selected team does not belong to this tournament."));
      }
      if (team.data.statecode !== 0 || team.data.statuscode !== 1) {
        return serviceFailure("Could not register tournament player.", new Error("Players can only be registered to an active tournament team."));
      }
      if (masterPlayer.data.statecode !== 0 || masterPlayer.data.statuscode !== 1) {
        return serviceFailure("Could not register tournament player.", new Error("Only active players can be registered."));
      }
      if (tournamentPlayers.data.some((current) => current.promx_player === player.promx_player)) {
        return serviceFailure("Could not register tournament player.", new Error("This player is already registered in the tournament."));
      }
      return this.players.create({
        ...player,
        promx_tournamentplayername: masterPlayer.data.promx_cricketplayer1,
      });
    });
  }

  registerPlayers(
    tournamentId: string,
    teamId: string,
    playerIds: readonly string[],
  ): Promise<Result<BulkPlayerRegistrationOutcome>> {
    return guardService("Could not bulk register tournament players.", async () => {
      const selectedIds = [...new Set(playerIds.filter(Boolean))];
      if (!tournamentId || !teamId || selectedIds.length === 0) {
        return serviceFailure("Could not bulk register tournament players.", new Error("Select a team and at least one player."));
      }

      const [team, tournamentPlayers] = await Promise.all([
        this.teams.getById(teamId),
        this.getTournamentPlayers(tournamentId),
      ]);
      if (!team.success) return team;
      if (!tournamentPlayers.success) return tournamentPlayers;
      if (team.data.promx_tournament !== tournamentId) {
        return serviceFailure("Could not bulk register tournament players.", new Error("Selected team does not belong to this tournament."));
      }
      if (team.data.statecode !== 0 || team.data.statuscode !== 1) {
        return serviceFailure("Could not bulk register tournament players.", new Error("Players can only be registered to an active tournament team."));
      }

      const registeredIds = new Set(tournamentPlayers.data.map((player) => player.promx_player));
      const failed: BulkPlayerRegistrationFailure[] = [];
      const validPlayers: CricketPlayer[] = [];
      const validations: Array<{ playerId: string; result: CricketPlayer | null; message: string | null }> = [];
      for (let offset = 0; offset < selectedIds.length; offset += 5) {
        const batch = selectedIds.slice(offset, offset + 5);
        validations.push(...await Promise.all(batch.map(async (playerId) => {
          if (registeredIds.has(playerId)) {
            return { playerId, result: null, message: "This player is already registered in the tournament." };
          }
          const result = await this.masterPlayers.getById(playerId);
          if (!result.success) {
            return { playerId, result: null, message: result.error.message };
          }
          if (result.data.statecode !== 0 || result.data.statuscode !== 1) {
            return { playerId, result: null, message: "Only active players can be registered." };
          }
          return { playerId, result: result.data, message: null };
        })));
      }

      for (const validation of validations) {
        if (validation.result) {
          validPlayers.push(validation.result);
        } else {
          failed.push({
            playerId: validation.playerId,
            playerName: validation.playerId,
            message: validation.message ?? "Player validation failed.",
          });
        }
      }

      const registered: CricketTournamentPlayer[] = [];
      for (let offset = 0; offset < validPlayers.length; offset += 5) {
        const batch = validPlayers.slice(offset, offset + 5);
        const results = await Promise.all(batch.map(async (player) => {
          const playerId = player.promx_cricketplayerid!;
          const registration: CricketTournamentPlayer = {
            promx_tournament: tournamentId,
            promx_tournamentteam: teamId,
            promx_player: playerId,
            promx_tournamentplayername: player.promx_cricketplayer1,
            promx_playercategory: null,
            promx_jerseynumber: null,
            promx_age: null,
          };
          try {
            return { player, result: await this.players.create(registration) };
          } catch (error) {
            return {
              player,
              result: serviceFailure<CricketTournamentPlayer>("Could not register tournament player.", error instanceof Error ? error : new Error("Registration failed.")),
            };
          }
        }));

        for (const { player, result } of results) {
          if (result.success) {
            registered.push(result.data);
          } else {
            failed.push({
              playerId: player.promx_cricketplayerid ?? "",
              playerName: player.promx_cricketplayer1,
              message: result.error.message,
            });
          }
        }
      }

      return { success: true, data: { registered, failed } };
    });
  }

  createAndRegisterPlayer(
    player: CricketPlayer,
    details: NewTournamentPlayerDetails,
  ): Promise<Result<CricketTournamentPlayer>> {
    return guardService("Could not add a player to the tournament.", async () => {
      const name = player.promx_cricketplayer1.trim();
      if (!name) {
        return serviceFailure("Could not add a player to the tournament.", new Error("Player name is required."));
      }
      if (!GENDERS.includes(player.promx_gender)) {
        return serviceFailure("Could not add a player to the tournament.", new Error("Select a valid gender."));
      }
      const validation = validatePlayerRegistrationDetails(details);
      if (!validation.success) return validation;
      const [tournament, team] = await Promise.all([
        this.tournaments.getById(details.promx_tournament),
        this.teams.getById(details.promx_tournamentteam),
      ]);
      if (!tournament.success) return tournament;
      if (!team.success) return team;
      if (team.data.promx_tournament !== details.promx_tournament) {
        return serviceFailure("Could not add a player to the tournament.", new Error("Selected team does not belong to this tournament."));
      }
      if (team.data.statecode !== 0 || team.data.statuscode !== 1) {
        return serviceFailure("Could not add a player to the tournament.", new Error("Players can only be registered to an active tournament team."));
      }

      const master = await this.masterPlayers.create({
        ...player,
        promx_cricketplayer1: name,
        promx_emailaddress: player.promx_emailaddress?.trim() || null,
        promx_employeeid: player.promx_employeeid?.trim() || null,
        promx_source: player.promx_source ?? 796280000,
      });
      if (!master.success) return master;
      const masterId = master.data.promx_cricketplayerid;
      if (!masterId) {
        return serviceFailure("Could not add a player to the tournament.", new Error("The player was created, but Dataverse did not return its player ID. Register it from the existing player list."));
      }

      const registration = await this.registerPlayer({
        ...details,
        promx_player: masterId,
        promx_tournamentplayername: name,
      });
      if (!registration.success) {
        return serviceFailure(
          "The player master was saved, but its tournament registration failed.",
          new Error(`The player was saved to Cricket Flow, but could not be registered in this tournament: ${registration.error.message} You can register it from the existing player list.`),
        );
      }
      return registration;
    });
  }

  updateTournamentPlayer(player: CricketTournamentPlayer): Promise<Result<CricketTournamentPlayer>> {
    return guardService("Could not update tournament player.", async () => {
      const id = player.promx_crickettournamentplayerid;
      if (!id) {
        return serviceFailure("Could not update tournament player.", new Error("A registered tournament player ID is required."));
      }
      const name = player.promx_tournamentplayername.trim();
      if (!name) {
        return serviceFailure("Could not update tournament player.", new Error("Tournament player name is required."));
      }
      const validation = validatePlayerRegistrationDetails(player);
      if (!validation.success) return validation;

      const [current, team] = await Promise.all([
        this.players.getById(id),
        this.teams.getById(player.promx_tournamentteam),
      ]);
      if (!current.success) return current;
      if (!team.success) return team;
      if (team.data.promx_tournament !== current.data.promx_tournament) {
        return serviceFailure("Could not update tournament player.", new Error("Selected team does not belong to this tournament."));
      }
      if (team.data.statecode !== 0 || team.data.statuscode !== 1) {
        return serviceFailure("Could not update tournament player.", new Error("Players can only be registered to an active tournament team."));
      }

      const roster = await readAllPages("Could not retrieve the tournament team roster.", (cursor) =>
        this.players.getByTournamentTeam(player.promx_tournamentteam, undefined, cursor),
      );
      if (!roster.success) return roster;
      for (const role of ["promx_iscaptain", "promx_isvicecaptain"] as const) {
        if (player[role] !== true) continue;
        for (const teammate of roster.data) {
          if (teammate.promx_crickettournamentplayerid !== id && teammate[role] === true) {
            const cleared = await this.players.update({ ...teammate, [role]: false });
            if (!cleared.success) return cleared;
          }
        }
      }

      return this.players.update({
        ...current.data,
        promx_tournamentplayername: name,
        promx_tournamentteam: player.promx_tournamentteam,
        promx_playercategory: player.promx_playercategory ?? null,
        promx_jerseynumber: player.promx_jerseynumber ?? null,
        promx_age: player.promx_age ?? null,
        promx_iscaptain: player.promx_iscaptain ?? false,
        promx_isvicecaptain: player.promx_isvicecaptain ?? false,
      });
    });
  }

  removeTournamentPlayer(registrationId: string): Promise<Result<void>> {
    return guardService("Could not remove player from tournament.", async () => {
      if (!registrationId) {
        return serviceFailure("Could not remove player from tournament.", new Error("A tournament player registration ID is required."));
      }
      return this.players.delete(registrationId);
    });
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
