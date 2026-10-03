import { useParams } from "react-router-dom";
import { useMatchContext } from "../../hooks/useMatchContext";
import { useScoringContext } from "../../hooks/useScoringContext";

export function ScorecardScreen() {
  const { id } = useParams<{ id: string }>();
  const { currentMatch } = useMatchContext();
  const { currentMatchState } = useScoringContext();
  const match = currentMatch?.promx_cricketmatchid === id ? currentMatch : null;
  const states = currentMatchState.filter((state) => !id || state.promx_match === id);

  return (
    <main>
      <h1>Scorecard</h1>
      <p>{match?.promx_matchname ?? `Match ID: ${id ?? "Not selected"}`}</p>
      {states.length === 0 ? (
        <p>Scorecard projections are not currently available in context.</p>
      ) : (
        <ul>
          {states.map((state) => (
            <li key={state.promx_cricketmatchstateid ?? state.promx_matchstatename}>
              Innings {state.promx_innings ?? ""}: {state.promx_currentruns ?? 0}/{state.promx_currentwickets ?? 0}
            </li>
          ))}
        </ul>
      )}
      <p>Batting and bowling figures are provided by their projection contexts when available.</p>
    </main>
  );
}
