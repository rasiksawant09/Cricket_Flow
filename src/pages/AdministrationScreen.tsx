import { useScoringContext } from "../hooks/useScoringContext";

export function AdministrationScreen() {
  const { currentMatchId } = useScoringContext();

  return (
    <main>
      <h1>Administration</h1>
      <p>Current match context: {currentMatchId ?? "None selected"}</p>
      <p>Data validation, projection rebuild, and audit review actions are not exposed by the current Context.</p>
    </main>
  );
}
