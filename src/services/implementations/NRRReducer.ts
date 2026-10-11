import { maxLegalBalls } from "./MatchStateReducer";

const COMPLETED_MATCH_STATUS = 2;
const ALL_OUT_INNINGS_STATUS = 796280003;
const SUPER_OVER_INNINGS_TYPE = 796280001;
const BALLS_PER_OVER = 6;

export interface NRRInningsScore {
  matchStatusCode?: number | null;
  inningsStatusCode?: number | null;
  isSuperOver?: boolean | null;
  inningsType?: number | null;
  battingTeamId: string;
  bowlingTeamId: string;
  runs: number;
  wickets: number;
  legalBalls: number;
}

export interface NRRConfiguration {
  oversPerInnings: number;
  playersPerTeam: number;
}

export interface NRRTotals {
  runsScored: number;
  runsConceded: number;
  oversFaced: number;
  oversBowled: number;
  netRunRate: number;
}

export function isNRRInningsCompleted(statusCode: number | null | undefined): boolean {
  return statusCode === 2 || statusCode === 796280002 || statusCode === 796280003;
}

interface MutableNRRTotals {
  runsScored: number;
  runsConceded: number;
  ballsFaced: number;
  ballsBowled: number;
}

function emptyTotals(): MutableNRRTotals {
  return { runsScored: 0, runsConceded: 0, ballsFaced: 0, ballsBowled: 0 };
}

export function reduceNRR(
  inningsScores: readonly NRRInningsScore[],
  teamIds: readonly string[],
  configuration: NRRConfiguration,
): Map<string, NRRTotals> {
  const totals = new Map<string, MutableNRRTotals>(teamIds.map((id) => [id, emptyTotals()]));
  const allocatedBalls = Math.max(0, maxLegalBalls(configuration.oversPerInnings));

  for (const innings of inningsScores) {
    if (innings.matchStatusCode !== COMPLETED_MATCH_STATUS) continue;
    if (!isNRRInningsCompleted(innings.inningsStatusCode)) continue;
    if (innings.isSuperOver === true || innings.inningsType === SUPER_OVER_INNINGS_TYPE) continue;

    const allOut = innings.inningsStatusCode === ALL_OUT_INNINGS_STATUS
      || (configuration.playersPerTeam > 1 && innings.wickets >= configuration.playersPerTeam - 1);
    const ballsFaced = allOut ? allocatedBalls : Math.max(0, innings.legalBalls);
    const legalBalls = Math.max(0, innings.legalBalls);
    const batting = totals.get(innings.battingTeamId);
    const bowling = totals.get(innings.bowlingTeamId);
    if (batting) {
      batting.runsScored += innings.runs;
      batting.ballsFaced += ballsFaced;
    }
    if (bowling) {
      bowling.runsConceded += innings.runs;
      bowling.ballsBowled += legalBalls;
    }
  }

  return new Map([...totals].map(([teamId, total]) => {
    const oversFaced = total.ballsFaced / BALLS_PER_OVER;
    const oversBowled = total.ballsBowled / BALLS_PER_OVER;
    const battingRate = oversFaced > 0 ? total.runsScored / oversFaced : 0;
    const bowlingRate = oversBowled > 0 ? total.runsConceded / oversBowled : 0;
    return [teamId, {
      runsScored: total.runsScored,
      runsConceded: total.runsConceded,
      oversFaced,
      oversBowled,
      netRunRate: battingRate - bowlingRate,
    }];
  }));
}