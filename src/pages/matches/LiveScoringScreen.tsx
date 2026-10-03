import { Link, useParams } from "react-router-dom";
import { useScoringContext } from "../../hooks/useScoringContext";
import { routeFor } from "../../routing/routeConstants";

export function LiveScoringScreen() {
  const { id } = useParams<{ id: string }>();
  const { currentMatchId, currentMatchState } = useScoringContext();
  const states = currentMatchState.filter((state) => !id || state.promx_match === id);

  return (
    <main>
      <h1>Live Scoring</h1>
      <p>Match ID: {id ?? currentMatchId ?? "Not selected"}</p>
      {states.length === 0 ? (
        <p>Live match state is not currently available in context.</p>
      ) : (
        <ul>
          {states.map((state) => (
            <li key={state.promx_cricketmatchstateid ?? state.promx_matchstatename}>
              Innings {state.promx_innings ?? ""}: {state.promx_currentruns ?? 0}/{state.promx_currentwickets ?? 0}
              {state.promx_currentovers !== undefined && state.promx_currentovers !== null && ` in ${state.promx_currentovers} overs`}
            </li>
          ))}
        </ul>
      )}
      {id && <p><Link to={routeFor.scorecard(id)}>Open scorecard</Link></p>}
      {id && <p><Link to={routeFor.overSummary(id)}>Review overs</Link></p>}
    </main>
  );
}
