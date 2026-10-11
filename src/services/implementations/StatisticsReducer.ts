import type { CricketBallEvent } from "../../models/CricketBallEvent";
import { BALLS_PER_OVER, formatOvers, selectEffectiveEvents } from "./MatchStateReducer";

const WIDE = 796280001;
const NO_BALL = 796280002;
const FOUR = 796280000;
const SIX = 796280001;
// Bowled, Caught, LBW, Stumped, Hit Wicket; run outs and retirements are not credited to the bowler.
const BOWLER_CREDITED_DISMISSALS: readonly number[] = [796280000, 796280001, 796280002, 796280004, 796280005];

export interface BatterTotals {
  playerId: string;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  dismissed: boolean;
}

export interface BowlerTotals {
  playerId: string;
  legalBalls: number;
  overs: number;
  runsConceded: number;
  wickets: number;
  economy: number;
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function isValidWicket(event: CricketBallEvent): boolean {
  return event.promx_iswicket === true && event.promx_dismissalvalid !== false;
}

export function reduceBatterStatistics(events: readonly CricketBallEvent[]): BatterTotals[] {
  const totals = new Map<string, BatterTotals>();
  const entry = (playerId: string): BatterTotals => {
    let current = totals.get(playerId);
    if (!current) {
      current = { playerId, runs: 0, ballsFaced: 0, fours: 0, sixes: 0, strikeRate: 0, dismissed: false };
      totals.set(playerId, current);
    }
    return current;
  };

  for (const event of selectEffectiveEvents(events)) {
    const striker = event.promx_striker ?? event.promx_strikerbeforeball;
    if (striker) {
      const batter = entry(striker);
      const batterRuns = event.promx_batterruns ?? 0;
      batter.runs += batterRuns;
      // Wides are not faced by the batter; no-balls are.
      if (event.promx_islegaldelivery === true || event.promx_eventtype === NO_BALL) {
        batter.ballsFaced += 1;
      }
      if (event.promx_isboundary === true && batterRuns > 0) {
        if (event.promx_boundarytype === FOUR) batter.fours += 1;
        if (event.promx_boundarytype === SIX) batter.sixes += 1;
      }
    }
    if (isValidWicket(event) && event.promx_dismissedplayer) {
      entry(event.promx_dismissedplayer).dismissed = true;
    }
  }

  return [...totals.values()]
    .map((batter) => ({
      ...batter,
      strikeRate: batter.ballsFaced > 0 ? round2((batter.runs / batter.ballsFaced) * 100) : 0,
    }))
    .sort((a, b) => a.playerId.localeCompare(b.playerId));
}

export function reduceBowlerStatistics(events: readonly CricketBallEvent[]): BowlerTotals[] {
  const totals = new Map<string, BowlerTotals>();

  for (const event of selectEffectiveEvents(events)) {
    const bowlerId = event.promx_bowler;
    if (!bowlerId) {
      continue;
    }
    let bowler = totals.get(bowlerId);
    if (!bowler) {
      bowler = { playerId: bowlerId, legalBalls: 0, overs: 0, runsConceded: 0, wickets: 0, economy: 0 };
      totals.set(bowlerId, bowler);
    }
    if (event.promx_islegaldelivery === true) {
      bowler.legalBalls += 1;
    }
    // Byes, leg byes and penalty runs are not charged to the bowler.
    const chargedExtras = event.promx_eventtype === WIDE || event.promx_eventtype === NO_BALL ? event.promx_extraruns ?? 0 : 0;
    bowler.runsConceded += (event.promx_batterruns ?? 0) + chargedExtras;
    if (isValidWicket(event) && event.promx_dismissaltype != null && BOWLER_CREDITED_DISMISSALS.includes(event.promx_dismissaltype)) {
      bowler.wickets += 1;
    }
  }

  return [...totals.values()]
    .map((bowler) => ({
      ...bowler,
      overs: formatOvers(bowler.legalBalls),
      economy: bowler.legalBalls > 0 ? round2(bowler.runsConceded / (bowler.legalBalls / BALLS_PER_OVER)) : 0,
    }))
    .sort((a, b) => a.playerId.localeCompare(b.playerId));
}
