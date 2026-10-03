import {
  createTableColumn,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
} from "@fluentui/react-components";
import type { TableColumnDefinition } from "@fluentui/react-components";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { TournamentPage } from "../../components/tournaments/TournamentPage";
import { TournamentRequestState } from "../../components/tournaments/TournamentRequestState";
import { useMatchContext } from "../../hooks/useMatchContext";
import { useTournamentContext } from "../../hooks/useTournamentContext";
import { useTournamentRequest } from "../../hooks/useTournamentRequest";
import type { CricketMatch } from "../../models/CricketMatch";
import { routeFor } from "../../routing/routeConstants";
import { formatScheduledDate, matchStatusLabel } from "./matchFormatting";

function teamName(id: string, names: ReadonlyMap<string, string>): string {
  return names.get(id) ?? "Unknown team";
}

export function MatchListScreen() {
  const navigate = useNavigate();
  const { matches, loadMatches } = useMatchContext();
  const { tournamentTeams, loadTournamentTeams } = useTournamentContext();
  const load = useCallback(async () => {
    const result = await loadMatches();
    if (!result.success) {
      return result;
    }

    const tournamentIds = [...new Set(result.data.map((match) => match.promx_tournament))];
    const teamResults = await Promise.all(tournamentIds.map(loadTournamentTeams));
    const failed = teamResults.find((teamResult) => !teamResult.success);
    if (failed && !failed.success) {
      return { success: false as const, error: failed.error };
    }
    return result;
  }, [loadMatches, loadTournamentTeams]);
  const request = useTournamentRequest(load);
  const teamNames = new Map<string, string>();
  for (const team of tournamentTeams) {
    if (team.promx_crickettournamentteamid) {
      teamNames.set(team.promx_crickettournamentteamid, team.promx_tournamentteamname);
    }
  }
  const columns: TableColumnDefinition<CricketMatch>[] = [
    createTableColumn<CricketMatch>({
      columnId: "number",
      renderHeaderCell: () => "Match Number",
      renderCell: (match) => match.promx_matchnumber ?? "Not set",
    }),
    createTableColumn<CricketMatch>({
      columnId: "teamA",
      renderHeaderCell: () => "Team A",
      renderCell: (match) => teamName(match.promx_teama, teamNames),
    }),
    createTableColumn<CricketMatch>({
      columnId: "teamB",
      renderHeaderCell: () => "Team B",
      renderCell: (match) => teamName(match.promx_teamb, teamNames),
    }),
    createTableColumn<CricketMatch>({
      columnId: "scheduled",
      renderHeaderCell: () => "Scheduled Date",
      renderCell: (match) => formatScheduledDate(match.promx_scheduleddatetime),
    }),
    createTableColumn<CricketMatch>({
      columnId: "status",
      renderHeaderCell: () => "Status",
      renderCell: matchStatusLabel,
    }),
  ];

  return (
    <TournamentPage title="Matches">
      <TournamentRequestState
        isLoading={request.isLoading}
        error={request.error}
        emptyMessage={matches.length === 0 ? "No matches are available." : undefined}
        loadingLabel="Loading matches"
      />
      {!request.isLoading && !request.error && matches.length > 0 && (
        <DataGrid
          aria-label="Matches"
          getRowId={(match) => match.promx_cricketmatchid ?? match.promx_matchname ?? String(match.promx_matchnumber)}
          items={matches}
          columns={columns}
          selectionMode="single"
          onSelectionChange={(_, data) => {
            const selectedId = [...data.selectedItems][0];
            const match = matches.find((item) => item.promx_cricketmatchid === selectedId);
            if (match?.promx_cricketmatchid) {
              navigate(routeFor.matchDetail(match.promx_cricketmatchid));
            }
          }}
        >
          <DataGridHeader>
            <DataGridRow>
              {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
            </DataGridRow>
          </DataGridHeader>
          <DataGridBody<CricketMatch>>
            {({ item, rowId }) => (
              <DataGridRow<CricketMatch> key={rowId}>
                {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
              </DataGridRow>
            )}
          </DataGridBody>
        </DataGrid>
      )}
    </TournamentPage>
  );
}
