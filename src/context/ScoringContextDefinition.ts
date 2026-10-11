import { createContext } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { CricketBallEvent } from "../models/CricketBallEvent";
import type { CricketInnings } from "../models/CricketInnings";
import type { CricketMatch } from "../models/CricketMatch";
import type { CricketMatchState } from "../models/CricketMatchState";
import type { CricketOver } from "../models/CricketOver";
import type { DeliveryInput, DeliveryOutcome, LiveScoringSnapshot } from "../services/interfaces/IScoringService";

export interface ScoringContextValue {
  currentMatchId: string | null;
  currentMatchState: CricketMatchState[];
  liveScoring: LiveScoringSnapshot | null;
  setCurrentMatchId: Dispatch<SetStateAction<string | null>>;
  setCurrentMatchState: Dispatch<SetStateAction<CricketMatchState[]>>;
  loadLiveScoring(matchId: string): Promise<Result<LiveScoringSnapshot>>;
  loadMatchInnings(matchId: string): Promise<Result<CricketInnings[]>>;
  loadMatchStates(matchId: string): Promise<Result<CricketMatchState[]>>;
  loadMatchEvents(matchId: string): Promise<Result<CricketBallEvent[]>>;
  startInnings(matchId: string): Promise<Result<CricketInnings>>;
  recordDelivery(input: DeliveryInput): Promise<Result<DeliveryOutcome>>;
  processBall(ballEvent: CricketBallEvent): Promise<Result<CricketBallEvent>>;
  processWide(ballEvent: CricketBallEvent): Promise<Result<CricketBallEvent>>;
  processNoBall(ballEvent: CricketBallEvent): Promise<Result<CricketBallEvent>>;
  processWicket(ballEvent: CricketBallEvent): Promise<Result<CricketBallEvent>>;
  endOver(over: CricketOver): Promise<Result<CricketOver>>;
  endInnings(innings: CricketInnings): Promise<Result<CricketInnings>>;
  completeMatch(matchId: string): Promise<Result<CricketMatch>>;
  rebuildMatchState(matchId: string): Promise<Result<CricketMatchState[]>>;
  reverseBall(ballEvent: CricketBallEvent, reversalReason: string): Promise<Result<CricketBallEvent>>;
  correctBall(originalEvent: CricketBallEvent, correctionEvent: CricketBallEvent): Promise<Result<CricketBallEvent>>;
  rebuildAfterCorrection(matchId: string): Promise<Result<void>>;
}

export const ScoringContext = createContext<ScoringContextValue | undefined>(undefined);
