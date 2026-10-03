import { useParams } from "react-router-dom";
import { useScoringContext } from "../../hooks/useScoringContext";

export function OverSummaryScreen() {
  const { id } = useParams<{ id: string }>();
  const { currentMatchId } = useScoringContext();

  return (
    <main>
      <h1>Over Summary</h1>
      <p>Match ID: {id ?? currentMatchId ?? "Not selected"}</p>
      <p>Ball-event history for the selected over is not exposed by the current Context.</p>
    </main>
  );
}
