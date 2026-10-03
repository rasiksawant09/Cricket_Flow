import type { CricketMatch } from "../../models/CricketMatch";
import type { CricketMatchPlayer } from "../../models/CricketMatchPlayer";
import type { CricketTournamentPlayer } from "../../models/CricketTournamentPlayer";
import type { IMatchPlayerRepository } from "../../repositories/interfaces/IMatchPlayerRepository";
import type { IMatchRepository } from "../../repositories/interfaces/IMatchRepository";
import type { ITournamentPlayerRepository } from "../../repositories/interfaces/ITournamentPlayerRepository";
import type { ITournamentRepository } from "../../repositories/interfaces/ITournamentRepository";
import type { IMatchService } from "../interfaces/IMatchService";
import type { IPlayingXIService } from "../interfaces/IPlayingXIService";
import { guardService, readAllPages, serviceFailure } from "./ServiceSupport";

export class PlayingXIService implements IPlayingXIService {
  private readonly matchPlayers: IMatchPlayerRepository;
  private readonly tournamentPlayers: ITournamentPlayerRepository;
  private readonly matches: IMatchRepository;
  private readonly tournaments: ITournamentRepository;
  private readonly matchService: IMatchService;

  constructor(
    matchPlayers: IMatchPlayerRepository,
    tournamentPlayers: ITournamentPlayerRepository,
    matches: IMatchRepository,
    tournaments: ITournamentRepository,
    matchService: IMatchService,
  ) {
    this.matchPlayers = matchPlayers;
    this.tournamentPlayers = tournamentPlayers;
    this.matches = matches;
    this.tournaments = tournaments;
    this.matchService = matchService;
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

      const selectedPlayers = new Set<string>();
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
      }

      return { success: true, data: undefined };
    });
  }

  createPlayingXI(matchId: string, players: CricketMatchPlayer[]): Promise<Result<CricketMatchPlayer[]>> {
    return guardService("Could not create Playing XI snapshots.", async () => {
      const match = await this.getEditableMatch(matchId);
      if (!match.success) return match;
      const seen = new Set<string>();
      const created: CricketMatchPlayer[] = [];
      for (const player of players) {
        const validation = await this.validateRosterPlayer(match.data, matchId, player);
        if (!validation.success) return validation;
        const tournamentPlayerId = player.promx_tournamentplayer;
        if (seen.has(tournamentPlayerId)) {
          return serviceFailure("Could not create Playing XI snapshots.", new Error("The Playing XI contains a duplicate tournament player."));
        }
        seen.add(tournamentPlayerId);
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
      const players = await this.matchPlayers.getByMatch(matchId);
      if (!players.success) return players;
      const playing = players.data.items.filter((player) => player.promx_isplaying === true);
      if (playing.length === 0) {
        return serviceFailure("Could not lock Playing XI.", new Error("Select at least one player before locking the Playing XI."));
      }
      const started = await this.matchService.startMatch(matchId);
      if (!started.success) return started;
      return { success: true, data: playing };
    });
  }

  private async getEditableMatch(matchId: string): Promise<Result<CricketMatch>> {
    const match = await this.matches.getById(matchId);
    if (!match.success) return match;
    if (match.data.statuscode === 796280002 || match.data.statuscode === 796280005 || match.data.statuscode === 2) {
      return serviceFailure("Match player snapshots are locked after match start.", new Error("The match is already live or complete."));
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
