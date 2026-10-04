import type { CricketBallEvent } from "../../models/CricketBallEvent";

// Overs notation (whole.balls) needs a balls-per-over value; none is persisted in the schema.
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
}

function isActive(event: CricketBallEvent): boolean {
  return event.statuscode === undefined || event.statuscode === null || event.statuscode === 1;
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
  const active = events.filter(isActive);
  const superseded = new Set(
    active.flatMap((event) => (event.promx_parentballevent ? [event.promx_parentballevent] : [])),
  );
  return active
    .filter((event) => !event.promx_cricketballeventid || !superseded.has(event.promx_cricketballeventid))
    .sort(compareEvents);
}

export function formatOvers(legalBalls: number): number {
  const whole = Math.floor(legalBalls / BALLS_PER_OVER);
  const remainder = legalBalls % BALLS_PER_OVER;
  return Number((whole + remainder / 10).toFixed(1));
}

function eventRuns(event: CricketBallEvent): number {
  return event.promx_totalruns ?? (event.promx_batterruns ?? 0) + (event.promx_extraruns ?? 0);
}

function reduceInnings(inningsId: string, events: readonly CricketBallEvent[]): ReducedInningsState {
  let runs = 0;
  let wickets = 0;
  let legalBalls = 0;
  let striker: string | null = null;
  let nonStriker: string | null = null;
  let bowler: string | null = null;

  for (const event of events) {
    runs += eventRuns(event);
    if (event.promx_islegaldelivery === true) {
      legalBalls += 1;
    }

    striker = event.promx_strikerafterball ?? event.promx_striker ?? event.promx_strikerbeforeball ?? striker;
    nonStriker = event.promx_nonstrikerafterball ?? event.promx_nonstriker ?? event.promx_nonstrikerbeforeball ?? nonStriker;
    bowler = event.promx_bowler ?? bowler;

    const dismissed = event.promx_iswicket === true && event.promx_dismissalvalid !== false
      ? event.promx_dismissedplayer ?? null
      : null;
    if (event.promx_iswicket === true && event.promx_dismissalvalid !== false) {
      wickets += 1;
    }
    // Without an after-ball record, a dismissed batter has left the crease.
    if (dismissed && !event.promx_strikerafterball && dismissed === striker) {
      striker = null;
    }
    if (dismissed && !event.promx_nonstrikerafterball && dismissed === nonStriker) {
      nonStriker = null;
    }
  }

  return { inningsId, runs, wickets, legalBalls, overs: formatOvers(legalBalls), striker, nonStriker, bowler };
}

export function reduceMatchStates(events: readonly CricketBallEvent[]): ReducedInningsState[] {
  const byInnings = new Map<string, CricketBallEvent[]>();
  for (const event of selectEffectiveEvents(events)) {
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
