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
import type { CricketBatterStatistic } from "../../models/CricketBatterStatistic";
import type { CricketMatchPlayer } from "../../models/CricketMatchPlayer";

interface BattingViewData {
  statistics: CricketBatterStatistic[];
  players: CricketMatchPlayer[];
}

export function BattingStatisticsScreen() {
  const {
    matches,
    currentMatch,
    loadMatches,
    loadPlayingXI,
    loadBattingStatistics,
  } = useMatchContext();
  const matchRequest = useAsyncResult(loadMatches);
  const matchOptions = matches.length > 0 ? matches : matchRequest.data ?? [];
  const [matchSelection, setMatchSelection] = useState(currentMatch?.promx_cricketmatchid ?? "");
  const selectedMatchId = matchOptions.find((match) => match.promx_cricketmatchid === matchSelection)?.promx_cricketmatchid
    ?? matchOptions.find((match) => match.promx_cricketmatchid === currentMatch?.promx_cricketmatchid)?.promx_cricketmatchid
    ?? matchOptions[0]?.promx_cricketmatchid
    ?? "";

  const loadData = useCallback(async (): Promise<Result<BattingViewData>> => {
    const [statistics, players] = await Promise.all([
      loadBattingStatistics(selectedMatchId),
      loadPlayingXI(selectedMatchId),
    ]);
    if (!statistics.success) return statistics;
    if (!players.success) return players;
    return { success: true, data: { statistics: statistics.data, players: players.data } };
  }, [loadBattingStatistics, loadPlayingXI, selectedMatchId]);
  const statisticsRequest = useAsyncResult(loadData, Boolean(selectedMatchId));
  const data = statisticsRequest.data;
  const statistics = data?.statistics ?? [];
  const playerNames = new Map(data?.players.flatMap((player) => player.promx_cricketmatchplayerid
    ? [[player.promx_cricketmatchplayerid, player] as const]
    : []) ?? []);
  const statisticsByTeam = new Map<string, CricketBatterStatistic[]>();
  for (const statistic of statistics) {
    const teamName = playerNames.get(statistic.promx_player ?? "")?.promx_teamsnapshot ?? "Unknown team";
    const teamStatistics = statisticsByTeam.get(teamName) ?? [];
    teamStatistics.push(statistic);
    statisticsByTeam.set(teamName, teamStatistics);
  }
  const selectedMatch = matchOptions.find((match) => match.promx_cricketmatchid === selectedMatchId);

  const columns: TableColumnDefinition<CricketBatterStatistic>[] = [
    textColumn("player", "Player", (statistic) => playerNames.get(statistic.promx_player ?? "")?.promx_playernamesnapshot ?? "Unknown player"),
    createTableColumn<CricketBatterStatistic>({
      columnId: "runs",
      compare: (left, right) => (left.promx_runs ?? 0) - (right.promx_runs ?? 0),
      renderHeaderCell: () => "Runs",
      renderCell: (statistic) => statistic.promx_runs ?? 0,
    }),
    createTableColumn<CricketBatterStatistic>({
      columnId: "ballsFaced",
      compare: (left, right) => (left.promx_ballsfaced ?? 0) - (right.promx_ballsfaced ?? 0),
      renderHeaderCell: () => "Balls Faced",
      renderCell: (statistic) => statistic.promx_ballsfaced ?? 0,
    }),
    createTableColumn<CricketBatterStatistic>({
      columnId: "fours",
      compare: (left, right) => (left.promx_fours ?? 0) - (right.promx_fours ?? 0),
      renderHeaderCell: () => "Fours",
      renderCell: (statistic) => statistic.promx_fours ?? 0,
    }),
    createTableColumn<CricketBatterStatistic>({
      columnId: "sixes",
      compare: (left, right) => (left.promx_sixes ?? 0) - (right.promx_sixes ?? 0),
      renderHeaderCell: () => "Sixes",
      renderCell: (statistic) => statistic.promx_sixes ?? 0,
    }),
    createTableColumn<CricketBatterStatistic>({
      columnId: "strikeRate",
      compare: (left, right) => (left.promx_strikerate ?? 0) - (right.promx_strikerate ?? 0),
      renderHeaderCell: () => "Strike Rate",
      renderCell: (statistic) => (statistic.promx_strikerate ?? 0).toFixed(2),
    }),
    createTableColumn<CricketBatterStatistic>({
      columnId: "outs",
      compare: (left, right) => Number(left.promx_isdismissed === true) - Number(right.promx_isdismissed === true),
      renderHeaderCell: () => "Outs",
      renderCell: (statistic) => statistic.promx_isdismissed ? "Out" : "Not out",
    }),
  ];
  const emptyMessage = matchOptions.length === 0
    ? "No matches are available."
    : !selectedMatchId
      ? "Select a match to view batting statistics."
      : data && statistics.length === 0
        ? "No batting statistics are available for this match."
        : undefined;

  return (
    <TournamentPage title="Batting Statistics" description={selectedMatch?.promx_matchname ?? undefined}>
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
        loadingLabel="Loading batting statistics"
      />
      {!matchRequest.isLoading && !statisticsRequest.isLoading && !matchRequest.error && !statisticsRequest.error && statistics.length > 0 && (
        [...statisticsByTeam.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([teamName, teamStatistics]) => (
          <section key={teamName} aria-label={`${teamName} batting statistics`}>
            <h2>{teamName}</h2>
            <SortableDataGrid
              ariaLabel={`${teamName} batting statistics`}
              items={teamStatistics}
              columns={columns}
              getRowId={(statistic) => statistic.promx_cricketbatterstatisticid ?? `${statistic.promx_match}:${statistic.promx_player}`}
              defaultSortState={{ sortColumn: "runs", sortDirection: "descending" }}
            />
          </section>
        ))
      )}
    </TournamentPage>
  );
}
