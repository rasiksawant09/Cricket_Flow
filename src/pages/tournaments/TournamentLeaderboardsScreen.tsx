import { makeStyles, tokens } from "@fluentui/react-components";
import { useCallback, useState } from "react";
import { LeaderboardGrid } from "../../components/statistics/LeaderboardGrid";
import { RecordSelector } from "../../components/RecordSelector";
import { TournamentPage } from "../../components/tournaments/TournamentPage";
import { TournamentRequestState } from "../../components/tournaments/TournamentRequestState";
import { useAsyncResult } from "../../hooks/useAsyncResult";
import { useTournamentContext } from "../../hooks/useTournamentContext";

const TOP_PLAYERS_LIMIT = 10;

interface TournamentLeaderboardsScreenProps {
  tournamentId?: string;
  embedded?: boolean;
}

const useStyles = makeStyles({
  leaderboards: {
    display: "grid",
    gap: tokens.spacingVerticalXXL,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    "@media (max-width: 760px)": { gridTemplateColumns: "minmax(0, 1fr)" },
  },
});

export function TournamentLeaderboardsScreen({ tournamentId, embedded = false }: TournamentLeaderboardsScreenProps) {
  const {
    tournaments,
    currentTournament,
    loadTournaments,
    loadTournamentLeaderboards,
  } = useTournamentContext();
  const styles = useStyles();
  const tournamentRequest = useAsyncResult(loadTournaments, !tournamentId);
  const tournamentOptions = tournaments.length > 0 ? tournaments : tournamentRequest.data ?? [];
  const [tournamentSelection, setTournamentSelection] = useState(tournamentId ?? currentTournament?.promx_crickettournamentid ?? "");
  const selectedTournamentId = tournamentId ?? tournamentOptions.find((tournament) => tournament.promx_crickettournamentid === tournamentSelection)?.promx_crickettournamentid
    ?? tournamentOptions.find((tournament) => tournament.promx_crickettournamentid === currentTournament?.promx_crickettournamentid)?.promx_crickettournamentid
    ?? tournamentOptions[0]?.promx_crickettournamentid
    ?? "";

  const loadData = useCallback(
    () => loadTournamentLeaderboards(selectedTournamentId),
    [loadTournamentLeaderboards, selectedTournamentId],
  );
  const leaderboardsRequest = useAsyncResult(loadData, Boolean(selectedTournamentId));
  const leaderboards = leaderboardsRequest.data;
  const selectedTournament = tournamentOptions.find((tournament) => tournament.promx_crickettournamentid === selectedTournamentId)
    ?? (currentTournament?.promx_crickettournamentid === selectedTournamentId ? currentTournament : undefined);
  const error = tournamentRequest.error ?? leaderboardsRequest.error;
  const noLeaderboardRows = leaderboards
    && leaderboards.topRunScorers.length === 0
    && leaderboards.topWicketTakers.length === 0
    && leaderboards.bestStrikeRates.length === 0
    && leaderboards.bestEconomyRates.length === 0;
  const emptyMessage = !selectedTournamentId && tournamentOptions.length === 0
    ? "No tournaments are available."
    : !selectedTournamentId
      ? "Select a tournament to view leaderboards."
      : noLeaderboardRows
        ? "No statistics are available for this tournament."
        : undefined;

  return (
    <TournamentPage embedded={embedded} title="Tournament Leaderboards" description={selectedTournament?.promx_tournamentname}>
      {!tournamentId && tournamentOptions.length > 0 && (
        <RecordSelector
          label="Tournament"
          selectedId={selectedTournamentId}
          options={tournamentOptions.flatMap((tournament) => tournament.promx_crickettournamentid ? [{
            id: tournament.promx_crickettournamentid,
            label: tournament.promx_tournamentname,
          }] : [])}
          onSelectionChange={setTournamentSelection}
        />
      )}
      <TournamentRequestState
        isLoading={tournamentRequest.isLoading || leaderboardsRequest.isLoading}
        error={error}
        emptyMessage={emptyMessage}
        loadingLabel="Loading tournament leaderboards"
      />
      {!tournamentRequest.isLoading && !leaderboardsRequest.isLoading && !error && leaderboards && !noLeaderboardRows && (
        <div className={styles.leaderboards}>
          <LeaderboardGrid
            title="Top Run Scorers"
            items={leaderboards.topRunScorers.slice(0, TOP_PLAYERS_LIMIT)}
            metricLabel="Runs"
            metricValue={(entry) => entry.runs}
            formatMetric={(entry) => String(entry.runs)}
            direction="descending"
          />
          <LeaderboardGrid
            title="Top Wicket Takers"
            items={leaderboards.topWicketTakers.slice(0, TOP_PLAYERS_LIMIT)}
            metricLabel="Wickets"
            metricValue={(entry) => entry.wickets}
            formatMetric={(entry) => String(entry.wickets)}
            direction="descending"
          />
          <LeaderboardGrid
            title="Best Strike Rates"
            items={leaderboards.bestStrikeRates.slice(0, TOP_PLAYERS_LIMIT)}
            metricLabel="Strike Rate"
            metricValue={(entry) => entry.strikeRate}
            formatMetric={(entry) => entry.strikeRate.toFixed(2)}
            direction="descending"
          />
          <LeaderboardGrid
            title="Best Economy Rates"
            items={leaderboards.bestEconomyRates.slice(0, TOP_PLAYERS_LIMIT)}
            metricLabel="Economy"
            metricValue={(entry) => entry.economy}
            formatMetric={(entry) => entry.economy.toFixed(2)}
            direction="ascending"
          />
        </div>
      )}
    </TournamentPage>
  );
}
