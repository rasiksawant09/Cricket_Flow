import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import type { CricketMatch } from "../models/CricketMatch";
import type { CricketMatchPlayer } from "../models/CricketMatchPlayer";
import type { IStatisticsService } from "../services/interfaces/IStatisticsService";
import type { IMatchService } from "../services/interfaces/IMatchService";
import type { IPlayingXIService } from "../services/interfaces/IPlayingXIService";
import type { ITossService } from "../services/interfaces/ITossService";
import { MatchContext } from "./MatchContextDefinition";
import type { PlayingXIValidationState } from "./MatchContextDefinition";

interface MatchProviderProps {
  children: ReactNode;
  matchService: IMatchService;
  playingXIService: IPlayingXIService;
  tossService: ITossService;
  statisticsService: IStatisticsService;
}

export function MatchProvider({ children, matchService, playingXIService, tossService, statisticsService }: MatchProviderProps) {
  const [matches, setMatches] = useState<CricketMatch[]>([]);
  const [currentMatch, setCurrentMatch] = useState<CricketMatch | null>(null);
  const [playingXI, setPlayingXI] = useState<CricketMatchPlayer[]>([]);
  const [playingXIValidation, setPlayingXIValidation] = useState<PlayingXIValidationState | null>(null);

  function storeMatch(result: Result<CricketMatch>): Result<CricketMatch> {
    if (!result.success) return result;
    const id = result.data.promx_cricketmatchid;
    setMatches((current) => {
      if (!id) return [...current, result.data];
      return [...current.filter((item) => item.promx_cricketmatchid !== id), result.data];
    });
    setCurrentMatch(result.data);
    return result;
  }

  const loadMatches = useCallback(async (): Promise<Result<CricketMatch[]>> => {
    const result = await matchService.getMatches();
    if (result.success) {
      setMatches(result.data);
    }
    return result;
  }, [matchService]);

  const loadMatch = useCallback(async (matchId: string): Promise<Result<CricketMatch>> => {
    return storeMatch(await matchService.getMatch(matchId));
  }, [matchService]);

  const validateMatchSetup = useCallback((match: CricketMatch): Promise<Result<void>> => {
    return matchService.validateMatchSetup(match);
  }, [matchService]);

  const loadPlayingXI = useCallback(async (matchId: string): Promise<Result<CricketMatchPlayer[]>> => {
    const result = await playingXIService.getPlayingXI(matchId);
    if (result.success) {
      setPlayingXI((current) => [
        ...current.filter((player) => player.promx_match !== matchId),
        ...result.data,
      ]);
      setPlayingXIValidation(null);
    }
    return result;
  }, [playingXIService]);

  const validatePlayingXI = useCallback(async (matchId: string): Promise<Result<void>> => {
    const result = await playingXIService.validatePlayingXI(matchId);
    setPlayingXIValidation({ matchId, result });
    return result;
  }, [playingXIService]);

  const loadBattingStatistics = useCallback((matchId: string) => statisticsService.getBattingStatistics(matchId), [statisticsService]);
  const loadBowlingStatistics = useCallback((matchId: string) => statisticsService.getBowlingStatistics(matchId), [statisticsService]);
  const loadInningsScorecard = useCallback((matchId: string) => statisticsService.getInningsScorecard(matchId), [statisticsService]);

  async function createMatch(match: CricketMatch): Promise<Result<CricketMatch>> {
    return storeMatch(await matchService.createMatch(match));
  }

  async function updateMatch(match: CricketMatch): Promise<Result<CricketMatch>> {
    return storeMatch(await matchService.updateMatch(match));
  }

  async function abandonMatch(matchId: string): Promise<Result<CricketMatch>> {
    return storeMatch(await matchService.abandonMatch(matchId));
  }

  async function cancelMatch(matchId: string): Promise<Result<CricketMatch>> {
    return storeMatch(await matchService.cancelMatch(matchId));
  }

  async function createPlayingXI(matchId: string, players: CricketMatchPlayer[]): Promise<Result<CricketMatchPlayer[]>> {
    const result = await playingXIService.createPlayingXI(matchId, players);
    if (result.success) setPlayingXI(result.data);
    return result;
  }

  async function addPlayer(matchId: string, player: CricketMatchPlayer): Promise<Result<CricketMatchPlayer>> {
    const result = await playingXIService.addPlayer(matchId, player);
    if (result.success) setPlayingXI((current) => [...current, result.data]);
    return result;
  }

  async function removePlayer(matchPlayerId: string): Promise<Result<void>> {
    const result = await playingXIService.removePlayer(matchPlayerId);
    if (result.success) {
      setPlayingXI((current) => current.filter((player) => player.promx_cricketmatchplayerid !== matchPlayerId));
    }
    return result;
  }

  async function lockPlayingXI(matchId: string): Promise<Result<CricketMatchPlayer[]>> {
    const result = await playingXIService.lockPlayingXI(matchId);
    if (result.success) setPlayingXI(result.data);
    return result;
  }

  async function recordToss(
    matchId: string,
    tossWinnerId: string,
    tossDecision: NonNullable<CricketMatch["promx_tossdecision"]>,
  ): Promise<Result<CricketMatch>> {
    return storeMatch(await tossService.recordToss(matchId, tossWinnerId, tossDecision));
  }

  async function updateToss(
    matchId: string,
    tossWinnerId: string,
    tossDecision: NonNullable<CricketMatch["promx_tossdecision"]>,
  ): Promise<Result<CricketMatch>> {
    return storeMatch(await tossService.updateToss(matchId, tossWinnerId, tossDecision));
  }

  return (
    <MatchContext.Provider
      value={{
        matches,
        currentMatch,
        playingXI,
        playingXIValidation,
        setMatches,
        setCurrentMatch,
        setPlayingXI,
        loadMatches,
        loadMatch,
        loadPlayingXI,
        loadBattingStatistics,
        loadBowlingStatistics,
        loadInningsScorecard,
        validatePlayingXI,
        validateMatchSetup,
        createMatch,
        updateMatch,
        abandonMatch,
        cancelMatch,
        createPlayingXI,
        addPlayer,
        removePlayer,
        lockPlayingXI,
        recordToss,
        updateToss,
      }}
    >
      {children}
    </MatchContext.Provider>
  );
}
