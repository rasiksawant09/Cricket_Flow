import { useMatchContext } from "../../hooks/useMatchContext";

export function BattingStatisticsScreen() {
  const { currentMatch } = useMatchContext();

  return (
    <main>
      <h1>Batting Statistics</h1>
      <p>{currentMatch?.promx_matchname ?? "Select a match to view batting statistics."}</p>
      <p>Batter statistic records are not exposed by the current Context.</p>
    </main>
  );
}
