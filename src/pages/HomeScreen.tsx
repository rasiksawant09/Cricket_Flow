import { Link } from "react-router-dom";
import { useMatchContext } from "../hooks/useMatchContext";
import { useTournamentContext } from "../hooks/useTournamentContext";
import { ROUTE_PATHS } from "../routing/routeConstants";

export function HomeScreen() {
  const { tournaments } = useTournamentContext();
  const { matches } = useMatchContext();

  return (
    <main>
      <h1>Cricket Scoring</h1>
      <section aria-labelledby="home-summary-heading">
        <h2 id="home-summary-heading">Overview</h2>
        <dl>
          <dt>Tournaments</dt>
          <dd>{tournaments.length}</dd>
          <dt>Matches</dt>
          <dd>{matches.length}</dd>
        </dl>
      </section>
      <nav aria-label="Primary">
        <ul>
          <li><Link to={ROUTE_PATHS.tournamentList}>Tournaments</Link></li>
          <li><Link to={ROUTE_PATHS.matchList}>Matches</Link></li>
          <li><Link to={ROUTE_PATHS.standings}>Standings</Link></li>
          <li><Link to={ROUTE_PATHS.statistics}>Statistics</Link></li>
        </ul>
      </nav>
    </main>
  );
}
