import type { CricketBallEvent } from "../../models/CricketBallEvent";
import type { CricketInnings } from "../../models/CricketInnings";
import type { CricketMatch } from "../../models/CricketMatch";
import type { CricketMatchState } from "../../models/CricketMatchState";
import type { CricketOver } from "../../models/CricketOver";

export type DeliveryKind = "runs" | "wide" | "noBall" | "bye" | "legBye" | "wicket";
export type InningsEndReason = "allOut" | "oversExhausted" | "targetReached";

export interface DeliveryInput {
  matchId: string;
  kind: DeliveryKind;
  runs: number;
  dismissalType?: NonNullable<CricketBallEvent["promx_dismissaltype"]>;
  dismissedBatter?: "striker" | "nonStriker";
  strikerId?: string;
  nonStrikerId?: string;
  bowlerId?: string;
}

export interface DeliveryOutcome {
  event: CricketBallEvent;
  overCompleted: boolean;
  inningsEnded?: InningsEndReason;
  nextInningsOpened: boolean;
  matchCompleted: boolean;
  superOverRequired?: boolean;
  overError?: Error;
  lifecycleError?: Error;
  projectionError?: Error;
}

export interface PendingSelections {
  striker: boolean;
  nonStriker: boolean;
  bowler: boolean;
}

export interface LiveScoringSnapshot {
  matchId: string;
  innings: CricketInnings | null;
  matchState: CricketMatchState | null;
  currentOver: CricketOver | null;
  currentOverEvents: CricketBallEvent[];
  recentEvents: CricketBallEvent[];
  pending: PendingSelections;
  dismissedPlayerIds: string[];
  matchCompleted: boolean;
  superOverRequired: boolean;
  canStartInnings: boolean;
  canUndo: boolean;
}

export interface MatchResultSummary {
  kind: "wonByRuns" | "wonByWickets" | "superOverWin" | "tie";
  winnerTeamId: string | null;
  loserTeamId: string | null;
  margin: number | null;
}

export interface IScoringService {
  getMatchInnings(matchId: string): Promise<Result<CricketInnings[]>>;
  getMatchEvents(matchId: string): Promise<Result<CricketBallEvent[]>>;
  getMatchResult(matchId: string): Promise<Result<MatchResultSummary | null>>;
  startInnings(matchId: string): Promise<Result<CricketInnings>>;
  getLiveScoringSnapshot(matchId: string): Promise<Result<LiveScoringSnapshot>>;
  recordDelivery(input: DeliveryInput): Promise<Result<DeliveryOutcome>>;
  processBall(ballEvent: CricketBallEvent): Promise<Result<CricketBallEvent>>;
  processWide(ballEvent: CricketBallEvent): Promise<Result<CricketBallEvent>>;
  processNoBall(ballEvent: CricketBallEvent): Promise<Result<CricketBallEvent>>;
  processWicket(ballEvent: CricketBallEvent): Promise<Result<CricketBallEvent>>;
  endOver(over: CricketOver): Promise<Result<CricketOver>>;
  endInnings(innings: CricketInnings): Promise<Result<CricketInnings>>;
  completeMatch(matchId: string): Promise<Result<CricketMatch>>;
}
