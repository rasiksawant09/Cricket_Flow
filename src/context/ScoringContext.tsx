import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import type { CricketBallEvent } from "../models/CricketBallEvent";
import type { CricketInnings } from "../models/CricketInnings";
import type { CricketMatch } from "../models/CricketMatch";
import type { CricketMatchState } from "../models/CricketMatchState";
import type { CricketOver } from "../models/CricketOver";
import type { IProjectionService } from "../services/interfaces/IProjectionService";
import type { IScoringService, DeliveryInput, DeliveryOutcome, LiveScoringSnapshot } from "../services/interfaces/IScoringService";
import type { IUndoService } from "../services/interfaces/IUndoService";
import { ScoringContext } from "./ScoringContextDefinition";

interface ScoringProviderProps {
  children: ReactNode;
  scoringService: IScoringService;
  projectionService: IProjectionService;
  undoService: IUndoService;
}

export function ScoringProvider({ children, scoringService, projectionService, undoService }: ScoringProviderProps) {
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);
  const [currentMatchState, setCurrentMatchState] = useState<CricketMatchState[]>([]);
  const [liveScoring, setLiveScoring] = useState<LiveScoringSnapshot | null>(null);

  const loadLiveScoring = useCallback(async (matchId: string): Promise<Result<LiveScoringSnapshot>> => {
    const result = await scoringService.getLiveScoringSnapshot(matchId);
    if (result.success) {
      setCurrentMatchId(matchId);
      setLiveScoring(result.data);
    }
    return result;
  }, [scoringService]);

  const loadMatchInnings = useCallback((matchId: string) => scoringService.getMatchInnings(matchId), [scoringService]);
  const loadMatchStates = useCallback(async (matchId: string): Promise<Result<CricketMatchState[]>> => {
    const result = await projectionService.getMatchState(matchId);
    if (result.success) {
      setCurrentMatchId(matchId);
      setCurrentMatchState(result.data);
    }
    return result;
  }, [projectionService]);
  const loadMatchEvents = useCallback((matchId: string) => scoringService.getMatchEvents(matchId), [scoringService]);

  const recordDelivery = useCallback((input: DeliveryInput): Promise<Result<DeliveryOutcome>> => {
    return scoringService.recordDelivery(input);
  }, [scoringService]);

  const startInnings = useCallback((matchId: string): Promise<Result<CricketInnings>> => {
    return scoringService.startInnings(matchId);
  }, [scoringService]);

  async function processBall(ballEvent: CricketBallEvent): Promise<Result<CricketBallEvent>> {
    return scoringService.processBall(ballEvent);
  }

  async function processWide(ballEvent: CricketBallEvent): Promise<Result<CricketBallEvent>> {
    return scoringService.processWide(ballEvent);
  }

  async function processNoBall(ballEvent: CricketBallEvent): Promise<Result<CricketBallEvent>> {
    return scoringService.processNoBall(ballEvent);
  }

  async function processWicket(ballEvent: CricketBallEvent): Promise<Result<CricketBallEvent>> {
    return scoringService.processWicket(ballEvent);
  }

  async function endOver(over: CricketOver): Promise<Result<CricketOver>> {
    return scoringService.endOver(over);
  }

  async function endInnings(innings: CricketInnings): Promise<Result<CricketInnings>> {
    return scoringService.endInnings(innings);
  }

  async function completeMatch(matchId: string): Promise<Result<CricketMatch>> {
    return scoringService.completeMatch(matchId);
  }

  async function rebuildMatchState(matchId: string): Promise<Result<CricketMatchState[]>> {
    const result = await projectionService.rebuildMatchState(matchId);
    if (result.success) {
      setCurrentMatchId(matchId);
      setCurrentMatchState(result.data);
    }
    return result;
  }

  async function reverseBall(ballEvent: CricketBallEvent, reversalReason: string): Promise<Result<CricketBallEvent>> {
    return undoService.reverseBall(ballEvent, reversalReason);
  }

  async function correctBall(originalEvent: CricketBallEvent, correctionEvent: CricketBallEvent): Promise<Result<CricketBallEvent>> {
    return undoService.correctBall(originalEvent, correctionEvent);
  }

  async function rebuildAfterCorrection(matchId: string): Promise<Result<void>> {
    return undoService.rebuildAfterCorrection(matchId);
  }

  return (
    <ScoringContext.Provider
      value={{
        currentMatchId,
        currentMatchState,
        liveScoring,
        setCurrentMatchId,
        setCurrentMatchState,
        loadLiveScoring,
        loadMatchInnings,
        loadMatchStates,
        loadMatchEvents,
        startInnings,
        recordDelivery,
        processBall,
        processWide,
        processNoBall,
        processWicket,
        endOver,
        endInnings,
        completeMatch,
        rebuildMatchState,
        reverseBall,
        correctBall,
        rebuildAfterCorrection,
      }}
    >
      {children}
    </ScoringContext.Provider>
  );
}
