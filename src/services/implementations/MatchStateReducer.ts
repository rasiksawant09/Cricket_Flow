import type { CricketBallEvent } from "../../models/CricketBallEvent";
import { CRICKET_BALL_EVENT_STATUS } from "../../models/CricketBallEvent";
import type { MatchLimits } from "../interfaces/IMatchService";
import type { InningsEndReason } from "../interfaces/IScoringService";

// Overs notation (whole.balls) and over completion need a balls-per-over value; none is persisted in the schema.
export const BALLS_PER_OVER = 6;

export interface ReducedInningsState {
  inningsId: string;
  runs: number;
  wickets: number;
  legalBalls: number;
  overs: number;
  striker: string | null;
  nonStriker: string | null;
  bowler: string | null;
  dismissedPlayerIds: string[];
}

function isActive(event: CricketBallEvent): boolean {
  return event.statuscode === undefined || event.statuscode === null || event.statuscode === CRICKET_BALL_EVENT_STATUS.active;
}

function compareEvents(a: CricketBallEvent, b: CricketBallEvent): number {
  const bySequence = a.promx_deliverysequencenumber - b.promx_deliverysequencenumber;
  if (bySequence !== 0) {
    return bySequence;
  }
  return (a.promx_cricketballeventid ?? "").localeCompare(b.promx_cricketballeventid ?? "");
}

// Active events not superseded by an active correction that names them as parent.
export function selectEffectiveEvents(events: readonly CricketBallEvent[]): CricketBallEvent[] {
  const byId = new Map(events.flatMap((event) => event.promx_cricketballeventid
    ? [[event.promx_cricketballeventid, event] as const]
    : []));
  const amendments = new Map<string, CricketBallEvent[]>();

  for (const event of events) {
    if (!event.promx_parentballevent) continue;
    if (!isActive(event)
      && event.statuscode !== CRICKET_BALL_EVENT_STATUS.corrected
      && event.statuscode !== CRICKET_BALL_EVENT_STATUS.reversed) continue;
    const originalId = resolveOriginalBallEventId(event, byId);
    const group = amendments.get(originalId) ?? [];
    group.push(event);
    amendments.set(originalId, group);
  }

  const effective: CricketBallEvent[] = [];
  for (const event of events) {
    if (event.promx_parentballevent || !isActive(event)) continue;
    if (!event.promx_cricketballeventid) {
      effective.push(event);
      continue;
    }
    const amendment = latestAmendment(amendments.get(event.promx_cricketballeventid) ?? []);
    if (!amendment) {
      effective.push(event);
    } else if (amendment.statuscode !== CRICKET_BALL_EVENT_STATUS.reversed) {
      effective.push(amendment);
    }
  }

  return effective.sort(compareEvents);
}

export function resolveOriginalBallEventId(
  event: CricketBallEvent,
  events: ReadonlyMap<string, CricketBallEvent>,
): string {
  let current = event;
  const visited = new Set<string>();
  while (current.promx_parentballevent && !visited.has(current.promx_parentballevent)) {
    visited.add(current.promx_parentballevent);
    const parent = events.get(current.promx_parentballevent);
    if (!parent) return current.promx_parentballevent;
    current = parent;
  }
  return current.promx_cricketballeventid ?? current.promx_parentballevent ?? "";
}

function latestAmendment(events: readonly CricketBallEvent[]): CricketBallEvent | undefined {
  return [...events].sort((left, right) =>
    (right.createdon ?? "").localeCompare(left.createdon ?? "")
    || right.promx_deliverysequencenumber - left.promx_deliverysequencenumber
    || (right.promx_cricketballeventid ?? "").localeCompare(left.promx_cricketballeventid ?? ""),
  )[0];
}

export function formatOvers(legalBalls: number): number {
  const whole = Math.floor(legalBalls / BALLS_PER_OVER);
  const remainder = legalBalls % BALLS_PER_OVER;
  return Number((whole + remainder / 10).toFixed(1));
}

function eventRuns(event: CricketBallEvent): number {
  return event.promx_totalruns ?? (event.promx_batterruns ?? 0) + (event.promx_extraruns ?? 0);
}

function isValidWicket(event: CricketBallEvent): boolean {
  return event.promx_iswicket === true && event.promx_dismissalvalid !== false;
}

// Legal deliveries per over, ignoring wides and no-balls.
export function countLegalByOver(events: readonly CricketBallEvent[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const event of selectEffectiveEvents(events)) {
    if (event.promx_islegaldelivery === true) {
      counts.set(event.promx_over, (counts.get(event.promx_over) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * Events carrying an after-ball striker or non-striker are authoritative for both slots, where an
 * empty slot means a batter is awaiting replacement. Events without after-ball values fall back to
 * clearing the dismissed batter. Before-ball values name replacements and override the running state.
 */
export function reduceInnings(inningsId: string, events: readonly CricketBallEvent[]): ReducedInningsState {
  let runs = 0;
  let wickets = 0;
  let legalBalls = 0;
  let striker: string | null = null;
  let nonStriker: string | null = null;
  let bowler: string | null = null;
  const dismissedPlayerIds: string[] = [];
  const legalByOver = new Map<string, number>();

  for (const event of selectEffectiveEvents(events)) {
    runs += eventRuns(event);
    const legal = event.promx_islegaldelivery === true;
    if (legal) {
      legalBalls += 1;
      legalByOver.set(event.promx_over, (legalByOver.get(event.promx_over) ?? 0) + 1);
    }

    striker = event.promx_strikerbeforeball ?? event.promx_striker ?? striker;
    nonStriker = event.promx_nonstrikerbeforeball ?? event.promx_nonstriker ?? nonStriker;
    bowler = event.promx_bowler ?? bowler;

    const dismissed = isValidWicket(event) ? event.promx_dismissedplayer ?? null : null;
    if (isValidWicket(event)) {
      wickets += 1;
      if (dismissed) {
        dismissedPlayerIds.push(dismissed);
      }
    }

    if (event.promx_strikerafterball || event.promx_nonstrikerafterball) {
      striker = event.promx_strikerafterball ?? null;
      nonStriker = event.promx_nonstrikerafterball ?? null;
    }
    if (dismissed && dismissed === striker) {
      striker = null;
    }
    if (dismissed && dismissed === nonStriker) {
      nonStriker = null;
    }

    if (legal && (legalByOver.get(event.promx_over) ?? 0) >= BALLS_PER_OVER) {
      bowler = null;
    }
  }

  return {
    inningsId,
    runs,
    wickets,
    legalBalls,
    overs: formatOvers(legalBalls),
    striker,
    nonStriker,
    bowler,
    dismissedPlayerIds,
  };
}

// Tournament overs use whole.balls notation, e.g. 2.3 means 2 overs and 3 balls.
export function maxLegalBalls(oversPerInnings: number): number {
  const whole = Math.floor(oversPerInnings);
  const balls = Math.round((oversPerInnings - whole) * 10);
  return whole * BALLS_PER_OVER + balls;
}

export function evaluateInningsEnd(
  state: ReducedInningsState,
  limits: MatchLimits,
  target: number | null | undefined,
): InningsEndReason | null {
  if (target != null && state.runs >= target) {
    return "targetReached";
  }
  if (state.wickets >= limits.playersPerTeam - 1) {
    return "allOut";
  }
  if (state.legalBalls >= maxLegalBalls(limits.oversPerInnings)) {
    return "oversExhausted";
  }
  return null;
}

export function reduceMatchStates(events: readonly CricketBallEvent[]): ReducedInningsState[] {
  const byInnings = new Map<string, CricketBallEvent[]>();
  for (const event of events) {
    const group = byInnings.get(event.promx_innings);
    if (group) {
      group.push(event);
    } else {
      byInnings.set(event.promx_innings, [event]);
    }
  }
  return [...byInnings.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([inningsId, group]) => reduceInnings(inningsId, group));
}
