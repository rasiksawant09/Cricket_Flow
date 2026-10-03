import { useParams } from "react-router-dom";
import { useTournamentContext } from "../../hooks/useTournamentContext";

export function TournamentRulesScreen() {
  const { id } = useParams<{ id: string }>();
  const { currentTournament } = useTournamentContext();
  const isCurrent = currentTournament?.promx_crickettournamentid === id;

  return (
    <main>
      <h1>Tournament Rules</h1>
      <p>{isCurrent && currentTournament ? currentTournament.promx_tournamentname : `Tournament ID: ${id ?? "Not selected"}`}</p>
      <p>Rule configuration is not exposed by the current Tournament Context.</p>
    </main>
  );
}
