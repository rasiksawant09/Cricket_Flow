import type { CricketMatch } from "../../models/CricketMatch";
import type { CricketMatchPlayer } from "../../models/CricketMatchPlayer";
import type { CricketTournamentPlayer } from "../../models/CricketTournamentPlayer";
import type { IMatchPlayerRepository } from "../../repositories/interfaces/IMatchPlayerRepository";
import type { IMatchRepository } from "../../repositories/interfaces/IMatchRepository";
import type { ITournamentPlayerRepository } from "../../repositories/interfaces/ITournamentPlayerRepository";
import type { ITournamentRepository } from "../../repositories/interfaces/ITournamentRepository";
import type { IMatchService } from "../interfaces/IMatchService";
import type { IPlayingXIService } from "../interfaces/IPlayingXIService";
import type { IRuleEngineService } from "../interfaces/IRuleEngineService";
import { guardService, readAllPages, serviceFailure } from "./ServiceSupport";

export class PlayingXIService implements IPlayingXIService {
  private readonly matchPlayers: IMatchPlayerRepository;
  private readonly tournamentPlayers: ITournamentPlayerRepository;
  private readonly matches: IMatchRepository;
  private readonly tournaments: ITournamentRepository;
  private readonly matchService: IMatchService;
  private readonly rules: IRuleEngineService;

  constructor(
    matchPlayers: IMatchPlayerRepository,
    tournamentPlayers: ITournamentPlayerRepository,
    matches: IMatchRepository,
    tournaments: ITournamentRepository,
    matchService: IMatchService,
    rules: IRuleEngineService,
  ) {
    this.matchPlayers = matchPlayers;
    this.tournamentPlayers = tournamentPlayers;
    this.matches = matches;
    this.tournaments = tournaments;
    this.matchService = matchService;
    this.rules = rules;
  }

  getPlayingXI(matchId: string): Promise<Result<CricketMatchPlayer[]>> {
    return guardService("Could not retrieve Playing XI.", async () => {
      const players = await readAllPages("Could not retrieve match-player snapshots.", (cursor) =>
        this.matchPlayers.getByMatch(matchId, undefined, cursor),
      );
      if (!players.success) {
        return players;
      }
      return { success: true, data: players.data.filter((player) => player.promx_isplaying === true) };
    });
  }

  validatePlayingXI(matchId: string): Promise<Result<void>> {
    return guardService("Could not validate Playing XI.", async () => {
      const match = await this.matches.getById(matchId);
      if (!match.success) {
        return match;
      }

      const snapshots = await readAllPages("Could not retrieve match-player snapshots.", (cursor) =>
        this.matchPlayers.getByMatch(matchId, undefined, cursor),
      );
      if (!snapshots.success) {
        return snapshots;
      }

      const selected = snapshots.data.filter((player) => player.promx_isplaying === true);
      if (selected.length === 0) {
        return serviceFailure("Could not validate Playing XI.", new Error("Select at least one player before locking the Playing XI."));
      }

      const tournament = await this.tournaments.getById(match.data.promx_tournament);
      if (!tournament.success) return tournament;
      const playersPerTeam = tournament.data.promx_playersperteam;
      if (!Number.isInteger(playersPerTeam) || playersPerTeam < 1) {
        return serviceFailure("Could not validate Playing XI.", new Error("Tournament players per team must be a positive whole number."));
      }

      const selectedPlayers = new Set<string>();
      const selectedByTeam = new Map<string, number>([[match.data.promx_teama, 0], [match.data.promx_teamb, 0]]);
      for (const player of selected) {
        const tournamentPlayerId = player.promx_tournamentplayer;
        if (selectedPlayers.has(tournamentPlayerId)) {
          return serviceFailure("Could not validate Playing XI.", new Error("The Playing XI contains a duplicate tournament player."));
        }
        selectedPlayers.add(tournamentPlayerId);

        const validation = await this.validateRosterPlayer(match.data, matchId, player);
        if (!validation.success) {
          return { success: false, error: validation.error };
        }
        const teamId = validation.data.promx_tournamentteam;
        selectedByTeam.set(teamId, (selectedByTeam.get(teamId) ?? 0) + 1);
      }

      for (const teamId of [match.data.promx_teama, match.data.promx_teamb]) {
        const count = selectedByTeam.get(teamId) ?? 0;
        if (count !== playersPerTeam) {
          return serviceFailure(
            "Could not validate Playing XI.",
            new Error(`Each team must select exactly ${playersPerTeam} players. This team has ${count}.`),
          );
        }
      }

      return { success: true, data: undefined };
    });
  }

  createPlayingXI(matchId: string, players: CricketMatchPlayer[]): Promise<Result<CricketMatchPlayer[]>> {
    return guardService("Could not create Playing XI snapshots.", async () => {
      const match = await this.getEditableMatch(matchId);
      if (!match.success) return match;
      const current = await readAllPages("Could not retrieve match-player snapshots.", (cursor) =>
        this.matchPlayers.getByMatch(matchId, undefined, cursor),
      );
      if (!current.success) return current;
      const seen = new Set<string>();
      const counts = new Map<string, number>([[match.data.promx_teama, 0], [match.data.promx_teamb, 0]]);
      for (const snapshot of current.data.filter((player) => player.promx_isplaying === true)) {
        seen.add(snapshot.promx_tournamentplayer);
        const registration = await this.tournamentPlayers.getById(snapshot.promx_tournamentplayer);
        if (!registration.success) return registration;
        counts.set(registration.data.promx_tournamentteam, (counts.get(registration.data.promx_tournamentteam) ?? 0) + 1);
      }
      const tournament = await this.tournaments.getById(match.data.promx_tournament);
      if (!tournament.success) return tournament;
      const limit = tournament.data.promx_playersperteam;
      if (!Number.isInteger(limit) || limit < 1) {
        return serviceFailure("Could not create Playing XI snapshots.", new Error("Tournament players per team must be a positive whole number."));
      }
      const created: CricketMatchPlayer[] = [];
      for (const player of players) {
        const validation = await this.validateRosterPlayer(match.data, matchId, player);
        if (!validation.success) return validation;
        const tournamentPlayerId = player.promx_tournamentplayer;
        if (seen.has(tournamentPlayerId)) {
          return serviceFailure("Could not create Playing XI snapshots.", new Error("The Playing XI contains a duplicate tournament player."));
        }
        const teamId = validation.data.promx_tournamentteam;
        const count = counts.get(teamId) ?? 0;
        if (count >= limit) {
          return serviceFailure("Could not create Playing XI snapshots.", new Error(`A team cannot select more than ${limit} players.`));
        }
        seen.add(tournamentPlayerId);
        counts.set(teamId, count + 1);
        const result = await this.matchPlayers.create({ ...player, promx_match: matchId, promx_isplaying: true });
        if (!result.success) return result;
        created.push(result.data);
      }
      return { success: true, data: created };
    });
  }

  addPlayer(matchId: string, player: CricketMatchPlayer): Promise<Result<CricketMatchPlayer>> {
    return guardService("Could not add player to Playing XI.", async () => {
      const match = await this.getEditableMatch(matchId);
      if (!match.success) return match;
      const validation = await this.validateRosterPlayer(match.data, matchId, player);
      if (!validation.success) return validation;
      const tournament = await this.tournaments.getById(match.data.promx_tournament);
      if (!tournament.success) return tournament;
      const limit = tournament.data.promx_playersperteam;
      if (!Number.isInteger(limit) || limit < 1) {
        return serviceFailure("Could not add player to Playing XI.", new Error("Tournament players per team must be a positive whole number."));
      }
      const players = await readAllPages("Could not retrieve match-player snapshots.", (cursor) =>
        this.matchPlayers.getByMatch(matchId, undefined, cursor),
      );
      if (!players.success) return players;
      const selected = players.data.filter((item) => item.promx_isplaying === true);
      if (selected.some((item) => item.promx_tournamentplayer === player.promx_tournamentplayer)) {
        return serviceFailure("Could not add player to Playing XI.", new Error("This player is already selected."));
      }
      let teamCount = 0;
      for (const item of selected) {
        const registration = await this.tournamentPlayers.getById(item.promx_tournamentplayer);
        if (!registration.success) return registration;
        if (registration.data.promx_tournamentteam === validation.data.promx_tournamentteam) teamCount += 1;
      }
      if (teamCount >= limit) {
        return serviceFailure("Could not add player to Playing XI.", new Error(`A team cannot select more than ${limit} players.`));
      }
      return this.matchPlayers.create({ ...player, promx_match: matchId, promx_isplaying: true });
    });
  }

  removePlayer(matchPlayerId: string): Promise<Result<void>> {
    return guardService("Could not remove player from Playing XI.", async () => {
      const player = await this.matchPlayers.getById(matchPlayerId);
      if (!player.success) return player;
      const match = await this.getEditableMatch(player.data.promx_match);
      if (!match.success) return match;
      const updated = await this.matchPlayers.update({ ...player.data, promx_isplaying: false });
      if (!updated.success) return updated;
      return { success: true, data: undefined };
    });
  }

  lockPlayingXI(matchId: string): Promise<Result<CricketMatchPlayer[]>> {
    return guardService("Could not lock Playing XI.", async () => {
      const match = await this.getEditableMatch(matchId);
      if (!match.success) return match;
      if (!match.data.promx_tosswinner || match.data.promx_tossdecision == null) {
        return serviceFailure("Could not lock Playing XI.", new Error("Record the toss before locking the Playing XI."));
      }
      const validation = await this.validatePlayingXI(matchId);
      if (!validation.success) return validation;
      const ruleValidation = await this.rules.validatePlayingXI(matchId);
      if (!ruleValidation.success) return ruleValidation;
      const players = await readAllPages("Could not retrieve match-player snapshots.", (cursor) =>
        this.matchPlayers.getByMatch(matchId, undefined, cursor),
      );
      if (!players.success) return players;
      const playing = players.data.filter((player) => player.promx_isplaying === true);
      const started = await this.matchService.startMatch(matchId);
      if (!started.success) return started;
      return { success: true, data: playing };
    });
  }

  private async getEditableMatch(matchId: string): Promise<Result<CricketMatch>> {
    const match = await this.matches.getById(matchId);
    if (!match.success) return match;
    if (match.data.statuscode !== 1 && match.data.statuscode !== 796280001) {
      return serviceFailure("Match player snapshots are locked after match start.", new Error("Playing XI changes are only allowed for draft or ready matches."));
    }
    return match;
  }

  private async validateRosterPlayer(
    match: CricketMatch,
    matchId: string,
    snapshot: CricketMatchPlayer,
  ): Promise<Result<CricketTournamentPlayer>> {
    if (snapshot.promx_match !== matchId) {
      return serviceFailure("Could not validate match player snapshot.", new Error("Snapshot Match lookup does not match the target match."));
    }
    const registration = await this.tournamentPlayers.getById(snapshot.promx_tournamentplayer);
    if (!registration.success) return registration;
    if (registration.data.promx_tournament !== match.promx_tournament) {
      return serviceFailure("Could not validate match player snapshot.", new Error("Tournament Player does not belong to the match tournament."));
    }
    if (registration.data.promx_tournamentteam !== match.promx_teama && registration.data.promx_tournamentteam !== match.promx_teamb) {
      return serviceFailure("Could not validate match player snapshot.", new Error("Tournament Player is not registered to either match side."));
    }
    const tournament = await this.tournaments.getById(match.promx_tournament);
    if (!tournament.success) return tournament;
    return registration;
  }
}
