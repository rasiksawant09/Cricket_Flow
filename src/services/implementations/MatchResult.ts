import type { MatchLimits } from "../interfaces/IMatchService";
import type { MatchResultSummary } from "../interfaces/IScoringService";

export interface InningsScore {
  battingTeam: string;
  bowlingTeam: string;
  runs: number;
  wickets: number;
}

// Target reached means the second innings out-scored the first, so comparing totals covers every end reason.
export function determineMatchResult(first: InningsScore, second: InningsScore, limits: MatchLimits): MatchResultSummary {
  if (second.runs > first.runs) {
    return {
      kind: "wonByWickets",
      winnerTeamId: second.battingTeam,
      loserTeamId: second.bowlingTeam,
      margin: Math.max(limits.playersPerTeam - 1 - second.wickets, 0),
    };
  }
  if (second.runs < first.runs) {
    return {
      kind: "wonByRuns",
      winnerTeamId: first.battingTeam,
      loserTeamId: first.bowlingTeam,
      margin: first.runs - second.runs,
    };
  }
  return { kind: "tie", winnerTeamId: null, loserTeamId: null, margin: null };
}
