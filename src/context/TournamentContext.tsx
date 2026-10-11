import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import type { CricketTournament } from "../models/CricketTournament";
import type { CricketTournamentPlayer } from "../models/CricketTournamentPlayer";
import type { CricketTournamentRule } from "../models/CricketTournamentRule";
import type { CricketTournamentTeam } from "../models/CricketTournamentTeam";
import type { CricketTeam } from "../models/CricketTeam";
import type { CricketPlayer } from "../models/CricketPlayer";
import type { IStandingService } from "../services/interfaces/IStandingService";
import type { IStatisticsService } from "../services/interfaces/IStatisticsService";
import type { ITeamService } from "../services/interfaces/ITeamService";
import type { IPlayerService } from "../services/interfaces/IPlayerService";
import type { ITournamentRegistrationService } from "../services/interfaces/ITournamentRegistrationService";
import type { ITournamentService } from "../services/interfaces/ITournamentService";
import type { NewTournamentPlayerDetails } from "../services/interfaces/ITournamentRegistrationService";
import { TournamentContext } from "./TournamentContextDefinition";

interface TournamentProviderProps {
  children: ReactNode;
  tournamentService: ITournamentService;
  registrationService: ITournamentRegistrationService;
  standingService: IStandingService;
  statisticsService: IStatisticsService;
  teamService: ITeamService;
  playerService: IPlayerService;
}

export function TournamentProvider({
  children,
  tournamentService,
  registrationService,
  standingService,
  statisticsService,
  teamService,
  playerService,
}: TournamentProviderProps) {
  const [tournaments, setTournaments] = useState<CricketTournament[]>([]);
  const [currentTournament, setCurrentTournament] = useState<CricketTournament | null>(null);
  const [tournamentTeams, setTournamentTeams] = useState<CricketTournamentTeam[]>([]);
  const [tournamentPlayers, setTournamentPlayers] = useState<CricketTournamentPlayer[]>([]);
  const [masterTeams, setMasterTeams] = useState<CricketTeam[]>([]);
  const [masterPlayers, setMasterPlayers] = useState<CricketPlayer[]>([]);

  function storeTournament(result: Result<CricketTournament>): Result<CricketTournament> {
    if (!result.success) return result;
    setTournaments((current) => {
      const id = result.data.promx_crickettournamentid;
      if (!id) return [...current, result.data];
      return [...current.filter((item) => item.promx_crickettournamentid !== id), result.data];
    });
    setCurrentTournament(result.data);
    return result;
  }

  const loadTournaments = useCallback(async (): Promise<Result<CricketTournament[]>> => {
    const result = await tournamentService.getTournaments();
    if (result.success) {
      setTournaments(result.data);
    }
    return result;
  }, [tournamentService]);

  const loadTournament = useCallback(async (tournamentId: string): Promise<Result<CricketTournament>> => {
    return storeTournament(await tournamentService.getTournament(tournamentId));
  }, [tournamentService]);

  const loadTournamentTeams = useCallback(async (tournamentId: string): Promise<Result<CricketTournamentTeam[]>> => {
    const result = await registrationService.getTournamentTeams(tournamentId);
    if (result.success) {
      setTournamentTeams((current) => [
        ...current.filter((team) => team.promx_tournament !== tournamentId),
        ...result.data,
      ]);
    }
    return result;
  }, [registrationService]);

  const loadTournamentPlayers = useCallback(async (tournamentId: string): Promise<Result<CricketTournamentPlayer[]>> => {
    const [playersResult, teamsResult] = await Promise.all([
      registrationService.getTournamentPlayers(tournamentId),
      registrationService.getTournamentTeams(tournamentId),
    ]);
    if (!playersResult.success) {
      return playersResult;
    }
    if (!teamsResult.success) {
      return teamsResult;
    }
    setTournamentPlayers(playersResult.data);
    setTournamentTeams((current) => [
      ...current.filter((team) => team.promx_tournament !== tournamentId),
      ...teamsResult.data,
    ]);
    return playersResult;
  }, [registrationService]);

  const loadMasterTeams = useCallback(async (): Promise<Result<CricketTeam[]>> => {
    const result = await teamService.getTeams();
    if (result.success) setMasterTeams(result.data);
    return result;
  }, [teamService]);

  const loadMasterPlayers = useCallback(async (): Promise<Result<CricketPlayer[]>> => {
    const result = await playerService.getPlayers();
    if (result.success) setMasterPlayers(result.data);
    return result;
  }, [playerService]);

  const loadTournamentStandings = useCallback((tournamentId: string) => standingService.getStandings(tournamentId), [standingService]);
  const loadTournamentLeaderboards = useCallback((tournamentId: string) => statisticsService.getTournamentLeaderboards(tournamentId), [statisticsService]);

  async function createTournament(tournament: CricketTournament): Promise<Result<CricketTournament>> {
    return storeTournament(await tournamentService.createTournament(tournament));
  }

  async function updateTournament(tournament: CricketTournament): Promise<Result<CricketTournament>> {
    return storeTournament(await tournamentService.updateTournament(tournament));
  }

  async function setTournamentStatus(
    tournamentId: string,
    statusCode: NonNullable<CricketTournament["statuscode"]>,
  ): Promise<Result<CricketTournament>> {
    return storeTournament(await tournamentService.setTournamentStatus(tournamentId, statusCode));
  }

  async function activateTournament(tournamentId: string): Promise<Result<CricketTournament>> {
    return storeTournament(await tournamentService.activateTournament(tournamentId));
  }

  async function completeTournament(tournamentId: string): Promise<Result<CricketTournament>> {
    return storeTournament(await tournamentService.completeTournament(tournamentId));
  }

  async function archiveTournament(tournamentId: string): Promise<Result<CricketTournament>> {
    return storeTournament(await tournamentService.archiveTournament(tournamentId));
  }

  async function createTournamentRule(rule: CricketTournamentRule): Promise<Result<CricketTournamentRule>> {
    return tournamentService.createTournamentRule(rule);
  }

  async function updateTournamentRule(rule: CricketTournamentRule): Promise<Result<CricketTournamentRule>> {
    return tournamentService.updateTournamentRule(rule);
  }

  async function setTournamentRuleEnabled(ruleId: string, enabled: boolean): Promise<Result<CricketTournamentRule>> {
    return tournamentService.setTournamentRuleEnabled(ruleId, enabled);
  }

  async function registerTeam(team: CricketTournamentTeam): Promise<Result<CricketTournamentTeam>> {
    const result = await registrationService.registerTeam(team);
    if (result.success) {
      const id = result.data.promx_crickettournamentteamid;
      setTournamentTeams((current) => id
        ? [...current.filter((item) => item.promx_crickettournamentteamid !== id), result.data]
        : [...current, result.data]);
    }
    return result;
  }

  async function createAndRegisterTeam(
    tournamentId: string,
    team: CricketTeam,
    groupName?: string | null,
    seedNumber?: number | null,
  ): Promise<Result<CricketTournamentTeam>> {
    const result = await registrationService.createAndRegisterTeam(tournamentId, team, groupName, seedNumber);
    const master = await teamService.getTeams();
    if (master.success) setMasterTeams(master.data);
    if (!result.success) return result;
    const id = result.data.promx_crickettournamentteamid;
    setTournamentTeams((current) => id
      ? [...current.filter((item) => item.promx_crickettournamentteamid !== id), result.data]
      : [...current, result.data]);
    return result;
  }

  async function updateTournamentTeam(
    team: CricketTeam,
    registration: CricketTournamentTeam,
  ): Promise<Result<CricketTournamentTeam>> {
    const result = await registrationService.updateTournamentTeam(team, registration);
    if (!result.success) return result;
    const id = result.data.promx_crickettournamentteamid;
    setTournamentTeams((current) => id
      ? [...current.filter((item) => item.promx_crickettournamentteamid !== id), result.data]
      : current);
    const master = await teamService.getTeams();
    if (master.success) setMasterTeams(master.data);
    return result;
  }

  async function removeTournamentTeam(registrationId: string): Promise<Result<void>> {
    const result = await registrationService.removeTournamentTeam(registrationId);
    if (result.success) {
      setTournamentTeams((current) => current.filter((item) => item.promx_crickettournamentteamid !== registrationId));
      setTournamentPlayers((current) => current.filter((player) => player.promx_tournamentteam !== registrationId));
    }
    return result;
  }

  async function refreshMasterTeams() {
    const result = await teamService.getTeams();
    if (result.success) setMasterTeams(result.data);
  }

  async function refreshMasterPlayers() {
    const result = await playerService.getPlayers();
    if (result.success) setMasterPlayers(result.data);
  }

  async function createMasterTeam(team: CricketTeam): Promise<Result<CricketTeam>> {
    const result = await teamService.createTeam(team);
    if (result.success) await refreshMasterTeams();
    return result;
  }

  async function updateMasterTeam(team: CricketTeam): Promise<Result<CricketTeam>> {
    const result = await teamService.updateTeam(team);
    if (result.success) await refreshMasterTeams();
    return result;
  }

  async function deleteMasterTeam(teamId: string): Promise<Result<void>> {
    const result = await teamService.deleteTeam(teamId);
    if (result.success) await refreshMasterTeams();
    return result;
  }

  async function createMasterPlayer(player: CricketPlayer): Promise<Result<CricketPlayer>> {
    const result = await playerService.createPlayer(player);
    if (result.success) await refreshMasterPlayers();
    return result;
  }

  async function updateMasterPlayer(player: CricketPlayer): Promise<Result<CricketPlayer>> {
    const result = await playerService.updatePlayer(player);
    if (result.success) await refreshMasterPlayers();
    return result;
  }

  async function deleteMasterPlayer(playerId: string): Promise<Result<void>> {
    const result = await playerService.deletePlayer(playerId);
    if (result.success) await refreshMasterPlayers();
    return result;
  }

  async function createAndRegisterPlayer(
    player: CricketPlayer,
    details: NewTournamentPlayerDetails,
  ): Promise<Result<CricketTournamentPlayer>> {
    const result = await registrationService.createAndRegisterPlayer(player, details);
    await refreshMasterPlayers();
    if (result.success) setTournamentPlayers((current) => [...current, result.data]);
    return result;
  }

  async function updateTournamentPlayer(player: CricketTournamentPlayer): Promise<Result<CricketTournamentPlayer>> {
    const result = await registrationService.updateTournamentPlayer(player);
    if (!result.success) return result;
    const refreshed = await registrationService.getTournamentPlayers(result.data.promx_tournament);
    if (refreshed.success) setTournamentPlayers(refreshed.data);
    else storeTournamentPlayer(result);
    return result;
  }

  async function removeTournamentPlayer(registrationId: string): Promise<Result<void>> {
    const result = await registrationService.removeTournamentPlayer(registrationId);
    if (result.success) {
      setTournamentPlayers((current) => current.filter((item) => item.promx_crickettournamentplayerid !== registrationId));
    }
    return result;
  }

  async function registerPlayer(player: CricketTournamentPlayer): Promise<Result<CricketTournamentPlayer>> {
    const result = await registrationService.registerPlayer(player);
    if (result.success) {
      setTournamentPlayers((current) => [...current, result.data]);
    }
    return result;
  }

  async function registerPlayers(tournamentId: string, teamId: string, playerIds: readonly string[]) {
    const result = await registrationService.registerPlayers(tournamentId, teamId, playerIds);
    if (result.success && result.data.registered.length > 0) {
      const registeredPlayerIds = new Set(result.data.registered.map((player) => player.promx_player));
      setTournamentPlayers((current) => [
        ...current.filter((player) => !registeredPlayerIds.has(player.promx_player)),
        ...result.data.registered,
      ]);
    }
    return result;
  }

  async function assignCaptain(player: CricketTournamentPlayer): Promise<Result<CricketTournamentPlayer>> {
    return storeTournamentPlayer(await registrationService.assignCaptain(player));
  }

  async function assignViceCaptain(player: CricketTournamentPlayer): Promise<Result<CricketTournamentPlayer>> {
    return storeTournamentPlayer(await registrationService.assignViceCaptain(player));
  }

  function storeTournamentPlayer(result: Result<CricketTournamentPlayer>): Result<CricketTournamentPlayer> {
    if (!result.success) return result;
    const id = result.data.promx_crickettournamentplayerid;
    setTournamentPlayers((current) => {
      if (!id) return [...current, result.data];
      return [...current.filter((item) => item.promx_crickettournamentplayerid !== id), result.data];
    });
    return result;
  }

  return (
    <TournamentContext.Provider
      value={{
        tournaments,
        currentTournament,
        tournamentTeams,
        tournamentPlayers,
        masterTeams,
        masterPlayers,
        setTournaments,
        setCurrentTournament,
        setTournamentTeams,
        setTournamentPlayers,
        loadTournaments,
        loadTournament,
        loadTournamentTeams,
        loadTournamentPlayers,
        loadMasterTeams,
        loadMasterPlayers,
        loadTournamentStandings,
        loadTournamentLeaderboards,
        createTournament,
        updateTournament,
        setTournamentStatus,
        activateTournament,
        completeTournament,
        archiveTournament,
        createTournamentRule,
        updateTournamentRule,
        setTournamentRuleEnabled,
        registerTeam,
        createAndRegisterTeam,
        updateTournamentTeam,
        removeTournamentTeam,
        createMasterTeam,
        updateMasterTeam,
        deleteMasterTeam,
        createMasterPlayer,
        updateMasterPlayer,
        deleteMasterPlayer,
        createAndRegisterPlayer,
        updateTournamentPlayer,
        removeTournamentPlayer,
        registerPlayer,
        registerPlayers,
        assignCaptain,
        assignViceCaptain,
      }}
    >
      {children}
    </TournamentContext.Provider>
  );
}
