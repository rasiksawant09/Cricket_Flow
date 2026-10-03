import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import type { CricketTournament } from "../models/CricketTournament";
import type { CricketTournamentPlayer } from "../models/CricketTournamentPlayer";
import type { CricketTournamentRule } from "../models/CricketTournamentRule";
import type { CricketTournamentTeam } from "../models/CricketTournamentTeam";
import type { ITournamentRegistrationService } from "../services/interfaces/ITournamentRegistrationService";
import type { ITournamentService } from "../services/interfaces/ITournamentService";
import { TournamentContext } from "./TournamentContextDefinition";

interface TournamentProviderProps {
  children: ReactNode;
  tournamentService: ITournamentService;
  registrationService: ITournamentRegistrationService;
}

export function TournamentProvider({
  children,
  tournamentService,
  registrationService,
}: TournamentProviderProps) {
  const [tournaments, setTournaments] = useState<CricketTournament[]>([]);
  const [currentTournament, setCurrentTournament] = useState<CricketTournament | null>(null);
  const [tournamentTeams, setTournamentTeams] = useState<CricketTournamentTeam[]>([]);
  const [tournamentPlayers, setTournamentPlayers] = useState<CricketTournamentPlayer[]>([]);

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

  async function createTournament(tournament: CricketTournament): Promise<Result<CricketTournament>> {
    return storeTournament(await tournamentService.createTournament(tournament));
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
      setTournamentTeams((current) => [...current, result.data]);
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
        setTournaments,
        setCurrentTournament,
        setTournamentTeams,
        setTournamentPlayers,
        loadTournaments,
        loadTournament,
        loadTournamentTeams,
        loadTournamentPlayers,
        createTournament,
        activateTournament,
        completeTournament,
        archiveTournament,
        createTournamentRule,
        updateTournamentRule,
        setTournamentRuleEnabled,
        registerTeam,
        registerPlayer,
        assignCaptain,
        assignViceCaptain,
      }}
    >
      {children}
    </TournamentContext.Provider>
  );
}
