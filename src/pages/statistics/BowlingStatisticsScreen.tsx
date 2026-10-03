import { useMatchContext } from "../../hooks/useMatchContext";

export function BowlingStatisticsScreen() {
  const { currentMatch } = useMatchContext();

  return (
    <main>
      <h1>Bowling Statistics</h1>
      <p>{currentMatch?.promx_matchname ?? "Select a match to view bowling statistics."}</p>
      <p>Bowler statistic records are not exposed by the current Context.</p>
    </main>
  );
}
