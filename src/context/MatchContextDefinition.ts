import { createContext } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { CricketMatch } from "../models/CricketMatch";
import type { CricketMatchPlayer } from "../models/CricketMatchPlayer";

export interface PlayingXIValidationState {
  matchId: string;
  result: Result<void>;
}

export interface MatchContextValue {
  matches: CricketMatch[];
  currentMatch: CricketMatch | null;
  playingXI: CricketMatchPlayer[];
  playingXIValidation: PlayingXIValidationState | null;
  setMatches: Dispatch<SetStateAction<CricketMatch[]>>;
  setCurrentMatch: Dispatch<SetStateAction<CricketMatch | null>>;
  setPlayingXI: Dispatch<SetStateAction<CricketMatchPlayer[]>>;
  loadMatches(): Promise<Result<CricketMatch[]>>;
  loadMatch(matchId: string): Promise<Result<CricketMatch>>;
  loadPlayingXI(matchId: string): Promise<Result<CricketMatchPlayer[]>>;
  validatePlayingXI(matchId: string): Promise<Result<void>>;
  validateMatchSetup(match: CricketMatch): Promise<Result<void>>;
  createMatch(match: CricketMatch): Promise<Result<CricketMatch>>;
  updateMatch(match: CricketMatch): Promise<Result<CricketMatch>>;
  startMatch(matchId: string): Promise<Result<CricketMatch>>;
  completeMatch(matchId: string): Promise<Result<CricketMatch>>;
  abandonMatch(matchId: string): Promise<Result<CricketMatch>>;
  cancelMatch(matchId: string): Promise<Result<CricketMatch>>;
  createPlayingXI(matchId: string, players: CricketMatchPlayer[]): Promise<Result<CricketMatchPlayer[]>>;
  addPlayer(matchId: string, player: CricketMatchPlayer): Promise<Result<CricketMatchPlayer>>;
  removePlayer(matchPlayerId: string): Promise<Result<void>>;
  lockPlayingXI(matchId: string): Promise<Result<CricketMatchPlayer[]>>;
  recordToss(matchId: string, tossWinnerId: string, tossDecision: NonNullable<CricketMatch["promx_tossdecision"]>): Promise<Result<CricketMatch>>;
  updateToss(matchId: string, tossWinnerId: string, tossDecision: NonNullable<CricketMatch["promx_tossdecision"]>): Promise<Result<CricketMatch>>;
}

export const MatchContext = createContext<MatchContextValue | undefined>(undefined);
