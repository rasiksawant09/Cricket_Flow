import { createTableColumn } from "@fluentui/react-components";
import type { TableColumnDefinition } from "@fluentui/react-components";
import { useCallback, useState } from "react";
import { RecordSelector } from "../../components/RecordSelector";
import { SortableDataGrid } from "../../components/statistics/SortableDataGrid";
import { TournamentPage } from "../../components/tournaments/TournamentPage";
import { TournamentRequestState } from "../../components/tournaments/TournamentRequestState";
import { useAsyncResult } from "../../hooks/useAsyncResult";
import { useTournamentContext } from "../../hooks/useTournamentContext";
import type { CricketTournamentStanding } from "../../models/CricketTournamentStanding";
import type { CricketTournamentTeam } from "../../models/CricketTournamentTeam";

interface StandingsViewData {
  standings: CricketTournamentStanding[];
  teams: CricketTournamentTeam[];
}

export function TournamentStandingsScreen() {
  const {
    tournaments,
    currentTournament,
    loadTournaments,
    loadTournamentTeams,
    loadTournamentStandings,
  } = useTournamentContext();
  const tournamentRequest = useAsyncResult(loadTournaments);
  const tournamentOptions = tournaments.length > 0 ? tournaments : tournamentRequest.data ?? [];
  const [tournamentSelection, setTournamentSelection] = useState(currentTournament?.promx_crickettournamentid ?? "");
  const selectedTournamentId = tournamentOptions.find((tournament) => tournament.promx_crickettournamentid === tournamentSelection)?.promx_crickettournamentid
    ?? tournamentOptions.find((tournament) => tournament.promx_crickettournamentid === currentTournament?.promx_crickettournamentid)?.promx_crickettournamentid
    ?? tournamentOptions[0]?.promx_crickettournamentid
    ?? "";

  const loadData = useCallback(async (): Promise<Result<StandingsViewData>> => {
    const [standings, teams] = await Promise.all([
      loadTournamentStandings(selectedTournamentId),
      loadTournamentTeams(selectedTournamentId),
    ]);
    if (!standings.success) return standings;
    if (!teams.success) return teams;
    return { success: true, data: { standings: standings.data, teams: teams.data } };
  }, [loadTournamentStandings, loadTournamentTeams, selectedTournamentId]);
  const standingsRequest = useAsyncResult(loadData, Boolean(selectedTournamentId));
  const data = standingsRequest.data;
  const standings = data?.standings ?? [];
  const teamNames = new Map(data?.teams.flatMap((team) => team.promx_crickettournamentteamid
    ? [[team.promx_crickettournamentteamid, team.promx_tournamentteamname] as const]
    : []) ?? []);
  const selectedTournament = tournamentOptions.find((tournament) => tournament.promx_crickettournamentid === selectedTournamentId);
  const columns: TableColumnDefinition<CricketTournamentStanding>[] = [
    createTableColumn<CricketTournamentStanding>({
      columnId: "team",
      compare: (left, right) => (teamNames.get(left.promx_tournamentteam) ?? "").localeCompare(teamNames.get(right.promx_tournamentteam) ?? ""),
      renderHeaderCell: () => "Team",
      renderCell: (standing) => teamNames.get(standing.promx_tournamentteam) ?? standing.promx_standingname,
    }),
    createTableColumn<CricketTournamentStanding>({
      columnId: "matchesPlayed",
      compare: (left, right) => (left.promx_matchesplayed ?? 0) - (right.promx_matchesplayed ?? 0),
      renderHeaderCell: () => "Matches Played",
      renderCell: (standing) => standing.promx_matchesplayed ?? 0,
    }),
    createTableColumn<CricketTournamentStanding>({
      columnId: "wins",
      compare: (left, right) => (left.promx_matcheswon ?? 0) - (right.promx_matcheswon ?? 0),
      renderHeaderCell: () => "Wins",
      renderCell: (standing) => standing.promx_matcheswon ?? 0,
    }),
    createTableColumn<CricketTournamentStanding>({
      columnId: "losses",
      compare: (left, right) => (left.promx_matcheslost ?? 0) - (right.promx_matcheslost ?? 0),
      renderHeaderCell: () => "Losses",
      renderCell: (standing) => standing.promx_matcheslost ?? 0,
    }),
    createTableColumn<CricketTournamentStanding>({
      columnId: "ties",
      compare: (left, right) => (left.promx_matchestied ?? 0) - (right.promx_matchestied ?? 0),
      renderHeaderCell: () => "Ties",
      renderCell: (standing) => standing.promx_matchestied ?? 0,
    }),
    createTableColumn<CricketTournamentStanding>({
      columnId: "points",
      compare: (left, right) => (left.promx_points ?? 0) - (right.promx_points ?? 0),
      renderHeaderCell: () => "Points",
      renderCell: (standing) => standing.promx_points ?? 0,
    }),
    createTableColumn<CricketTournamentStanding>({
      columnId: "nrr",
      compare: (left, right) => (left.promx_netrunrate ?? 0) - (right.promx_netrunrate ?? 0),
      renderHeaderCell: () => "NRR",
      renderCell: (standing) => (standing.promx_netrunrate ?? 0).toFixed(3),
    }),
  ];
  const error = tournamentRequest.error ?? standingsRequest.error;
  const emptyMessage = tournamentOptions.length === 0
    ? "No tournaments are available."
    : !selectedTournamentId
      ? "Select a tournament to view standings."
      : data && standings.length === 0
        ? "No standings are available for this tournament."
        : undefined;

  return (
    <TournamentPage title="Tournament Standings" description={selectedTournament?.promx_tournamentname}>
      {tournamentOptions.length > 0 && (
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
        isLoading={tournamentRequest.isLoading || standingsRequest.isLoading}
        error={error}
        emptyMessage={emptyMessage}
        loadingLabel="Loading tournament standings"
      />
      {!tournamentRequest.isLoading && !standingsRequest.isLoading && !error && standings.length > 0 && (
        <SortableDataGrid
          ariaLabel="Tournament standings"
          items={standings}
          columns={columns}
          getRowId={(standing) => standing.promx_crickettournamentstandingid ?? standing.promx_tournamentteam}
          defaultSortState={{ sortColumn: "points", sortDirection: "descending" }}
        />
      )}
    </TournamentPage>
  );
}
