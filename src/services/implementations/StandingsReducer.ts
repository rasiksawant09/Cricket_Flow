import type { CricketMatch } from "../../models/CricketMatch";

const COMPLETED_STATUS = 2;
const NORMAL_WIN = 796280000;
const TIE = 796280001;
const SUPER_OVER_WIN = 796280004;

export interface PointsConfiguration {
  win: number;
  tie: number;
  loss: number;
}

export interface StandingTotals {
  matchesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  points: number;
}

function emptyTotals(): StandingTotals {
  return { matchesPlayed: 0, wins: 0, losses: 0, ties: 0, points: 0 };
}

// Only completed matches with a recorded Normal Win or Tie result count; abandoned, cancelled and unfinished matches are ignored.
export function reduceStandings(
  matches: readonly CricketMatch[],
  teamIds: readonly string[],
  points: PointsConfiguration,
): Map<string, StandingTotals> {
  const totals = new Map<string, StandingTotals>(teamIds.map((id) => [id, emptyTotals()]));
  const entry = (teamId: string): StandingTotals => {
    let current = totals.get(teamId);
    if (!current) {
      current = emptyTotals();
      totals.set(teamId, current);
    }
    return current;
  };

  for (const match of matches) {
    if (match.statuscode !== COMPLETED_STATUS) {
      continue;
    }
    if (match.promx_resulttype === TIE && !match.promx_winner && !match.promx_loser) {
      for (const teamId of [match.promx_teama, match.promx_teamb]) {
        const team = entry(teamId);
        team.matchesPlayed += 1;
        team.ties += 1;
        team.points += points.tie;
      }
    } else if ((match.promx_resulttype === NORMAL_WIN || match.promx_resulttype === SUPER_OVER_WIN) && match.promx_winner && match.promx_loser) {
      const winner = entry(match.promx_winner);
      winner.matchesPlayed += 1;
      winner.wins += 1;
      winner.points += points.win;
      const loser = entry(match.promx_loser);
      loser.matchesPlayed += 1;
      loser.losses += 1;
      loser.points += points.loss;
    }
  }
  return totals;
}
