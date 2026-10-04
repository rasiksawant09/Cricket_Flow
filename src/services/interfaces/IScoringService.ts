import type { CricketBallEvent } from "../../models/CricketBallEvent";
import type { CricketInnings } from "../../models/CricketInnings";
import type { CricketMatch } from "../../models/CricketMatch";
import type { CricketMatchState } from "../../models/CricketMatchState";
import type { CricketOver } from "../../models/CricketOver";

export type DeliveryKind = "runs" | "wide" | "noBall" | "bye" | "legBye" | "wicket";

export interface DeliveryInput {
  matchId: string;
  kind: DeliveryKind;
  runs: number;
  dismissalType?: NonNullable<CricketBallEvent["promx_dismissaltype"]>;
  dismissedBatter?: "striker" | "nonStriker";
}

export interface DeliveryOutcome {
  event: CricketBallEvent;
  projectionError?: Error;
}

export interface LiveScoringSnapshot {
  matchId: string;
  innings: CricketInnings | null;
  matchState: CricketMatchState | null;
  currentOver: CricketOver | null;
  currentOverEvents: CricketBallEvent[];
  recentEvents: CricketBallEvent[];
}

export interface IScoringService {
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
