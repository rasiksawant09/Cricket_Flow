import { useTournamentContext } from "../../hooks/useTournamentContext";

export function TournamentLeaderboardsScreen() {
  const { currentTournament } = useTournamentContext();

  return (
    <main>
      <h1>Tournament Leaderboards</h1>
      <p>{currentTournament?.promx_tournamentname ?? "Select a tournament to view leaderboards."}</p>
      <p>Leaderboard values are not exposed by the current Context.</p>
    </main>
  );
}
