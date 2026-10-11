import { Button } from "@fluentui/react-components";
import { useNavigate } from "react-router-dom";
import { TournamentPage } from "../../components/tournaments/TournamentPage";
import { ROUTE_PATHS } from "../../routing/routeConstants";

export function StatisticsScreen() {
  const navigate = useNavigate();

  return (
    <TournamentPage title="Statistics">
      <nav aria-label="Statistics views" style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        <Button appearance="primary" onClick={() => navigate(ROUTE_PATHS.battingStatistics)}>Batting Statistics</Button>
        <Button appearance="secondary" onClick={() => navigate(ROUTE_PATHS.bowlingStatistics)}>Bowling Statistics</Button>
        <Button appearance="secondary" onClick={() => navigate(ROUTE_PATHS.tournamentLeaderboards)}>Tournament Leaderboards</Button>
      </nav>
    </TournamentPage>
  );
}