import { useCallback } from "react";
import { useMatchContext } from "./useMatchContext";
import { useTournamentContext } from "./useTournamentContext";
import { useTournamentRequest } from "./useTournamentRequest";

export function useMatchRecord(matchId?: string) {
  const { currentMatch, loadMatch } = useMatchContext();
  const { currentTournament, tournamentTeams, loadTournament, loadTournamentTeams } = useTournamentContext();
  const load = useCallback(async () => {
    if (!matchId) {
      return { success: false as const, error: new Error("A match ID is required.") };
    }

    const matchResult = await loadMatch(matchId);
    if (!matchResult.success) {
      return matchResult;
    }

    const [tournamentResult, teamsResult] = await Promise.all([
      loadTournament(matchResult.data.promx_tournament),
      loadTournamentTeams(matchResult.data.promx_tournament),
    ]);
    if (!tournamentResult.success) {
      return { success: false as const, error: tournamentResult.error };
    }
    if (!teamsResult.success) {
      return { success: false as const, error: teamsResult.error };
    }

    return matchResult;
  }, [loadMatch, loadTournament, loadTournamentTeams, matchId]);
  const request = useTournamentRequest(load);
  const match = currentMatch?.promx_cricketmatchid === matchId ? currentMatch : null;
  const tournament = currentTournament?.promx_crickettournamentid === match?.promx_tournament
    ? currentTournament
    : null;
  const teamNames = new Map<string, string>();
  if (match) {
    for (const team of tournamentTeams) {
      if (team.promx_tournament === match.promx_tournament && team.promx_crickettournamentteamid) {
        teamNames.set(team.promx_crickettournamentteamid, team.promx_tournamentteamname);
      }
    }
  }

  return { request, match, tournament, teamNames };
}