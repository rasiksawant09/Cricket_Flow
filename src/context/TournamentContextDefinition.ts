import { createContext } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { CricketTournament } from "../models/CricketTournament";
import type { CricketTournamentPlayer } from "../models/CricketTournamentPlayer";
import type { CricketTournamentRule } from "../models/CricketTournamentRule";
import type { CricketTournamentTeam } from "../models/CricketTournamentTeam";

export interface TournamentContextValue {
  tournaments: CricketTournament[];
  currentTournament: CricketTournament | null;
  tournamentTeams: CricketTournamentTeam[];
  tournamentPlayers: CricketTournamentPlayer[];
  setTournaments: Dispatch<SetStateAction<CricketTournament[]>>;
  setCurrentTournament: Dispatch<SetStateAction<CricketTournament | null>>;
  setTournamentTeams: Dispatch<SetStateAction<CricketTournamentTeam[]>>;
  setTournamentPlayers: Dispatch<SetStateAction<CricketTournamentPlayer[]>>;
  loadTournaments(): Promise<Result<CricketTournament[]>>;
  loadTournament(tournamentId: string): Promise<Result<CricketTournament>>;
  loadTournamentTeams(tournamentId: string): Promise<Result<CricketTournamentTeam[]>>;
  loadTournamentPlayers(tournamentId: string): Promise<Result<CricketTournamentPlayer[]>>;
  createTournament(tournament: CricketTournament): Promise<Result<CricketTournament>>;
  activateTournament(tournamentId: string): Promise<Result<CricketTournament>>;
  completeTournament(tournamentId: string): Promise<Result<CricketTournament>>;
  archiveTournament(tournamentId: string): Promise<Result<CricketTournament>>;
  createTournamentRule(rule: CricketTournamentRule): Promise<Result<CricketTournamentRule>>;
  updateTournamentRule(rule: CricketTournamentRule): Promise<Result<CricketTournamentRule>>;
  setTournamentRuleEnabled(ruleId: string, enabled: boolean): Promise<Result<CricketTournamentRule>>;
  registerTeam(team: CricketTournamentTeam): Promise<Result<CricketTournamentTeam>>;
  registerPlayer(player: CricketTournamentPlayer): Promise<Result<CricketTournamentPlayer>>;
  assignCaptain(player: CricketTournamentPlayer): Promise<Result<CricketTournamentPlayer>>;
  assignViceCaptain(player: CricketTournamentPlayer): Promise<Result<CricketTournamentPlayer>>;
}

export const TournamentContext = createContext<TournamentContextValue | undefined>(undefined);
