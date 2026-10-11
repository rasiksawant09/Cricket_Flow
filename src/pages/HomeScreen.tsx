import { Button, Text } from "@fluentui/react-components";
import { ArrowRight24Regular, CalendarLtr24Regular, PeopleTeam24Regular, Trophy24Filled } from "@fluentui/react-icons";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { TournamentPage } from "../components/tournaments/TournamentPage";
import { TournamentRequestState } from "../components/tournaments/TournamentRequestState";
import { useMatchContext } from "../hooks/useMatchContext";
import { useTournamentContext } from "../hooks/useTournamentContext";
import { useAsyncResult } from "../hooks/useAsyncResult";
import { ROUTE_PATHS, routeFor } from "../routing/routeConstants";
import { matchStatusLabel, resultStatusLabel, formatScheduledDate } from "./matches/matchFormatting";
import { formatTournamentDate, tournamentStatusLabel } from "./tournaments/tournamentFormatting";

export function HomeScreen() {
  const navigate = useNavigate();
  const {
    tournaments,
    currentTournament,
    tournamentTeams,
    tournamentPlayers,
    loadTournaments,
    loadTournamentPlayers,
    setCurrentTournament,
  } = useTournamentContext();
  const { matches, loadMatches } = useMatchContext();
  const load = useCallback(async () => {
    const [tournamentResult, matchResult] = await Promise.all([loadTournaments(), loadMatches()]);
    if (!tournamentResult.success) return tournamentResult;
    if (!matchResult.success) return matchResult;
    const selected = tournamentResult.data.find((tournament) => tournament.statuscode === 1) ?? tournamentResult.data[0];
    if (selected?.promx_crickettournamentid) {
      setCurrentTournament(selected);
      const playersResult = await loadTournamentPlayers(selected.promx_crickettournamentid);
      if (!playersResult.success) return playersResult;
    }
    return { success: true as const, data: undefined };
  }, [loadMatches, loadTournamentPlayers, loadTournaments, setCurrentTournament]);
  const request = useAsyncResult(load);
  const tournament = currentTournament ?? tournaments.find((item) => item.statuscode === 1) ?? tournaments[0];
  const tournamentId = tournament?.promx_crickettournamentid;
  const teamNames = new Map(tournamentTeams
    .filter((team) => team.promx_tournament === tournamentId)
    .map((team) => [team.promx_crickettournamentteamid ?? "", team.promx_tournamentteamname]));
  const tournamentMatches = matches.filter((match) => match.promx_tournament === tournamentId);
  const completedMatches = tournamentMatches.filter((match) => match.statuscode === 2)
    .sort((left, right) => (right.promx_scheduleddatetime ?? "").localeCompare(left.promx_scheduleddatetime ?? ""));
  const liveMatch = tournamentMatches.find((match) => match.statuscode === 796280002 || match.statuscode === 796280005);
  const nextMatch = liveMatch ?? tournamentMatches.filter((match) => match.statuscode === 796280001)
    .sort((left, right) => (left.promx_scheduleddatetime ?? "").localeCompare(right.promx_scheduleddatetime ?? ""))[0];
  const completedCount = completedMatches.length;
  const matchCount = tournamentMatches.length;
  const completion = matchCount > 0 ? Math.round((completedCount / matchCount) * 100) : 0;
  const teamCount = tournamentTeams.filter((team) => team.promx_tournament === tournamentId && team.statecode === 0 && team.statuscode === 1).length;
  const playerCount = tournamentPlayers.filter((player) => player.promx_tournament === tournamentId).length;
  const latestResult = completedMatches[0];
  const latestWinner = latestResult?.promx_winner ? teamNames.get(latestResult.promx_winner) : undefined;
  const resultLabel = latestResult ? resultStatusLabel(latestResult, teamNames) : "No completed results yet";
  const matchTeamA = nextMatch ? teamNames.get(nextMatch.promx_teama) ?? "Team A" : "";
  const matchTeamB = nextMatch ? teamNames.get(nextMatch.promx_teamb) ?? "Team B" : "";

  return (
    <TournamentPage title="Tournament overview" description={tournament?.promx_tournamentname ?? "Your competition, in one place."}>
      <TournamentRequestState isLoading={request.isLoading} error={request.error} loadingLabel="Loading overview" />
      {!request.isLoading && !request.error && (
        <>
          {!tournament && <Text role="status">Create a tournament to start managing teams and matches.</Text>}
          {tournament && (
            <>
              <section className="home-overview-grid" aria-label="Tournament overview">
                <article className="home-feature">
                  <div className="home-feature-copy">
                    <span className="home-status"><span />{tournamentStatusLabel(tournament)}</span>
                    <h2>{tournament.promx_tournamentname}</h2>
                    <p>{`${formatTournamentDate(tournament.promx_startdate)} — ${formatTournamentDate(tournament.promx_enddate)}`}</p>
                    <div className="home-feature-meta">
                      <span><PeopleTeam24Regular />{`${teamCount} teams`}</span>
                      <span><CalendarLtr24Regular />{`${matchCount} matches`}</span>
                    </div>
                    <div className="home-progress-label"><span>{`${completion}% complete`}</span><span>{`${completedCount} of ${matchCount}`}</span></div>
                    <div className="home-progress"><span style={{ width: `${completion}%` }} /></div>
                    <Button appearance="primary" icon={<ArrowRight24Regular />} iconPosition="after"
                      onClick={() => tournamentId && navigate(routeFor.tournamentDetail(tournamentId))}>View tournament</Button>
                  </div>
                  <div className="home-feature-art" aria-hidden="true"><Trophy24Filled /></div>
                </article>
                <div className="home-kpis" aria-label="Tournament numbers">
                  <article className="home-kpi home-kpi-teams"><PeopleTeam24Regular /><span>Teams</span><strong>{teamCount}</strong><small>Active registrations</small></article>
                  <article className="home-kpi home-kpi-players"><PeopleTeam24Regular /><span>Players</span><strong>{playerCount}</strong><small>On the tournament roster</small></article>
                  <article className="home-kpi home-kpi-matches"><CalendarLtr24Regular /><span>Matches</span><strong>{matchCount}</strong><small>{`${completedCount} completed`}</small></article>
                  <article className="home-kpi home-kpi-complete"><Trophy24Filled /><span>Completion</span><strong>{`${completion}%`}</strong><small>Fixtures completed</small></article>
                </div>
              </section>

              <section className="home-match-grid" aria-label="Match center">
                <article className="home-panel home-next-match">
                  <header><div><span className="home-eyebrow">MATCH CENTER</span><h2>{liveMatch ? "Live now" : "Next match"}</h2></div>
                    {nextMatch && <span className={liveMatch ? "home-live-badge" : "home-ready-badge"}>{matchStatusLabel(nextMatch)}</span>}
                  </header>
                  {nextMatch ? (
                    <>
                      <p className="home-match-date">{formatScheduledDate(nextMatch.promx_scheduleddatetime)}</p>
                      <div className="home-versus"><strong>{matchTeamA}</strong><span>VS</span><strong>{matchTeamB}</strong></div>
                      <div className="home-panel-footer">
                        <span>{`Match ${nextMatch.promx_matchnumber ?? "—"}`}</span>
                        <Button appearance="primary" onClick={() => nextMatch.promx_cricketmatchid && navigate(routeFor.liveScoring(nextMatch.promx_cricketmatchid))}>
                          {liveMatch ? "Open live center" : "Open match"}
                        </Button>
                      </div>
                    </>
                  ) : <p className="home-empty">No upcoming fixtures are scheduled.</p>}
                </article>

                <article className="home-panel home-recent-result">
                  <header><div><span className="home-eyebrow">LATEST RESULT</span><h2>{latestResult ? "Recent result" : "Waiting for first result"}</h2></div>
                    {latestResult && <span className="home-result-date">{formatScheduledDate(latestResult.promx_scheduleddatetime)}</span>}
                  </header>
                  {latestResult ? (
                    <>
                      <div className="home-result-teams">
                        <span>{teamNames.get(latestResult.promx_teama) ?? "Team A"}</span>
                        <span className="home-result-vs">VS</span>
                        <span>{teamNames.get(latestResult.promx_teamb) ?? "Team B"}</span>
                      </div>
                      <div className="home-result-callout">{latestWinner ? <strong>{latestWinner}</strong> : null}<span>{resultLabel}</span></div>
                      <div className="home-panel-footer">
                        <span>Completed fixture</span>
                        <Button appearance="secondary" onClick={() => latestResult.promx_cricketmatchid && navigate(routeFor.scorecard(latestResult.promx_cricketmatchid))}>View scorecard</Button>
                      </div>
                    </>
                  ) : <p className="home-empty">Completed match results will appear here.</p>}
                </article>
              </section>

              <section className="home-shortcuts" aria-label="Tournament tools">
                <div><span className="home-eyebrow">TOURNAMENT TOOLS</span><h2>Keep the competition moving</h2></div>
                <Button appearance="subtle" onClick={() => navigate(ROUTE_PATHS.tournamentLeaderboards)}>Leaderboards <ArrowRight24Regular /></Button>
                <Button appearance="subtle" onClick={() => navigate(ROUTE_PATHS.standings)}>Standings <ArrowRight24Regular /></Button>
                <Button appearance="subtle" onClick={() => navigate(ROUTE_PATHS.matchList)}>All matches <ArrowRight24Regular /></Button>
              </section>
            </>
          )}
        </>
      )}
    </TournamentPage>
  );
}
