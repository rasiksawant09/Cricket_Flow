import { useTournamentContext } from "../../hooks/useTournamentContext";

export function TournamentStandingsScreen() {
  const { currentTournament } = useTournamentContext();

  return (
    <main>
      <h1>Tournament Standings</h1>
      <p>{currentTournament?.promx_tournamentname ?? "Select a tournament to view standings."}</p>
      <p>Standing projection rows are not exposed by the current Context.</p>
    </main>
  );
}
