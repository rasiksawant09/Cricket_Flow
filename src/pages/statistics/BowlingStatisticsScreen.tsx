import { createTableColumn } from "@fluentui/react-components";
import type { TableColumnDefinition } from "@fluentui/react-components";
import { useCallback, useState } from "react";
import { RecordSelector } from "../../components/RecordSelector";
import { SortableDataGrid } from "../../components/statistics/SortableDataGrid";
import { textColumn } from "../../components/statistics/tableColumns";
import { TournamentPage } from "../../components/tournaments/TournamentPage";
import { TournamentRequestState } from "../../components/tournaments/TournamentRequestState";
import { useAsyncResult } from "../../hooks/useAsyncResult";
import { useMatchContext } from "../../hooks/useMatchContext";
import type { CricketBowlerStatistic } from "../../models/CricketBowlerStatistic";
import type { CricketMatchPlayer } from "../../models/CricketMatchPlayer";

interface BowlingViewData {
  statistics: CricketBowlerStatistic[];
  players: CricketMatchPlayer[];
}

export function BowlingStatisticsScreen() {
  const {
    matches,
    currentMatch,
    loadMatches,
    loadPlayingXI,
    loadBowlingStatistics,
  } = useMatchContext();
  const matchRequest = useAsyncResult(loadMatches);
  const matchOptions = matches.length > 0 ? matches : matchRequest.data ?? [];
  const [matchSelection, setMatchSelection] = useState(currentMatch?.promx_cricketmatchid ?? "");
  const selectedMatchId = matchOptions.find((match) => match.promx_cricketmatchid === matchSelection)?.promx_cricketmatchid
    ?? matchOptions.find((match) => match.promx_cricketmatchid === currentMatch?.promx_cricketmatchid)?.promx_cricketmatchid
    ?? matchOptions[0]?.promx_cricketmatchid
    ?? "";

  const loadData = useCallback(async (): Promise<Result<BowlingViewData>> => {
    const [statistics, players] = await Promise.all([
      loadBowlingStatistics(selectedMatchId),
      loadPlayingXI(selectedMatchId),
    ]);
    if (!statistics.success) return statistics;
    if (!players.success) return players;
    return { success: true, data: { statistics: statistics.data, players: players.data } };
  }, [loadBowlingStatistics, loadPlayingXI, selectedMatchId]);
  const statisticsRequest = useAsyncResult(loadData, Boolean(selectedMatchId));
  const data = statisticsRequest.data;
  const statistics = data?.statistics ?? [];
  const playerNames = new Map(data?.players.flatMap((player) => player.promx_cricketmatchplayerid
    ? [[player.promx_cricketmatchplayerid, player] as const]
    : []) ?? []);
  const statisticsByTeam = new Map<string, CricketBowlerStatistic[]>();
  for (const statistic of statistics) {
    const teamName = playerNames.get(statistic.promx_player ?? "")?.promx_teamsnapshot ?? "Unknown team";
    const teamStatistics = statisticsByTeam.get(teamName) ?? [];
    teamStatistics.push(statistic);
    statisticsByTeam.set(teamName, teamStatistics);
  }
  const selectedMatch = matchOptions.find((match) => match.promx_cricketmatchid === selectedMatchId);

  const columns: TableColumnDefinition<CricketBowlerStatistic>[] = [
    textColumn("player", "Player", (statistic) => playerNames.get(statistic.promx_player ?? "")?.promx_playernamesnapshot ?? "Unknown player"),
    createTableColumn<CricketBowlerStatistic>({
      columnId: "overs",
      compare: (left, right) => (left.promx_overs ?? 0) - (right.promx_overs ?? 0),
      renderHeaderCell: () => "Overs",
      renderCell: (statistic) => statistic.promx_overs ?? 0,
    }),
    createTableColumn<CricketBowlerStatistic>({
      columnId: "runsConceded",
      compare: (left, right) => (left.promx_runsconceded ?? 0) - (right.promx_runsconceded ?? 0),
      renderHeaderCell: () => "Runs Conceded",
      renderCell: (statistic) => statistic.promx_runsconceded ?? 0,
    }),
    createTableColumn<CricketBowlerStatistic>({
      columnId: "wickets",
      compare: (left, right) => (left.promx_wickets ?? 0) - (right.promx_wickets ?? 0),
      renderHeaderCell: () => "Wickets",
      renderCell: (statistic) => statistic.promx_wickets ?? 0,
    }),
    createTableColumn<CricketBowlerStatistic>({
      columnId: "economy",
      compare: (left, right) => (left.promx_economy ?? 0) - (right.promx_economy ?? 0),
      renderHeaderCell: () => "Economy",
      renderCell: (statistic) => (statistic.promx_economy ?? 0).toFixed(2),
    }),
  ];
  const emptyMessage = matchOptions.length === 0
    ? "No matches are available."
    : !selectedMatchId
      ? "Select a match to view bowling statistics."
      : data && statistics.length === 0
        ? "No bowling statistics are available for this match."
        : undefined;

  return (
    <TournamentPage title="Bowling Statistics" description={selectedMatch?.promx_matchname ?? undefined}>
      {matchOptions.length > 0 && (
        <RecordSelector
          label="Match"
          selectedId={selectedMatchId}
          options={matchOptions.flatMap((match) => match.promx_cricketmatchid ? [{
            id: match.promx_cricketmatchid,
            label: match.promx_matchname ?? `Match ${match.promx_matchnumber ?? ""}`,
          }] : [])}
          onSelectionChange={setMatchSelection}
        />
      )}
      <TournamentRequestState
        isLoading={matchRequest.isLoading || statisticsRequest.isLoading}
        error={matchRequest.error ?? statisticsRequest.error}
        emptyMessage={emptyMessage}
        loadingLabel="Loading bowling statistics"
      />
      {!matchRequest.isLoading && !statisticsRequest.isLoading && !matchRequest.error && !statisticsRequest.error && statistics.length > 0 && (
        [...statisticsByTeam.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([teamName, teamStatistics]) => (
          <section key={teamName} aria-label={`${teamName} bowling statistics`}>
            <h2>{teamName}</h2>
            <SortableDataGrid
              ariaLabel={`${teamName} bowling statistics`}
              items={teamStatistics}
              columns={columns}
              getRowId={(statistic) => statistic.promx_cricketbowlerstatisticid ?? `${statistic.promx_match}:${statistic.promx_player}`}
              defaultSortState={{ sortColumn: "wickets", sortDirection: "descending" }}
            />
          </section>
        ))
      )}
    </TournamentPage>
  );
}
