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
import { useParams } from "react-router-dom";
import { useCallback } from "react";
import { TournamentPage } from "../../components/tournaments/TournamentPage";
import { TournamentRequestState } from "../../components/tournaments/TournamentRequestState";
import { useTournamentContext } from "../../hooks/useTournamentContext";
import { useTournamentRequest } from "../../hooks/useTournamentRequest";
import type { CricketTournamentTeam } from "../../models/CricketTournamentTeam";

const columns: TableColumnDefinition<CricketTournamentTeam>[] = [
  createTableColumn<CricketTournamentTeam>({
    columnId: "team",
    renderHeaderCell: () => "Team",
    renderCell: (team) => team.promx_tournamentteamname,
  }),
  createTableColumn<CricketTournamentTeam>({
    columnId: "group",
    renderHeaderCell: () => "Group",
    renderCell: (team) => team.promx_groupname || "Not set",
  }),
  createTableColumn<CricketTournamentTeam>({
    columnId: "seed",
    renderHeaderCell: () => "Seed",
    renderCell: (team) => team.promx_seednumber ?? "Not set",
  }),
];

export function TournamentTeamsScreen() {
  const { id } = useParams<{ id: string }>();
  const { tournamentTeams, loadTournamentTeams } = useTournamentContext();
  const load = useCallback(
    () => id ? loadTournamentTeams(id) : Promise.resolve({ success: false as const, error: new Error("A tournament ID is required.") }),
    [id, loadTournamentTeams],
  );
  const request = useTournamentRequest(load);
  const teams = tournamentTeams.filter((team) => !id || team.promx_tournament === id);

  return (
    <TournamentPage title="Tournament Teams">
      <TournamentRequestState
        isLoading={request.isLoading}
        error={request.error}
        emptyMessage={teams.length === 0 ? "No teams are registered for this tournament." : undefined}
      />
      {!request.isLoading && !request.error && teams.length > 0 && (
        <DataGrid
          aria-label="Registered tournament teams"
          getRowId={(team) => team.promx_crickettournamentteamid ?? team.promx_tournamentteamname}
          items={teams}
          columns={columns}
        >
          <DataGridHeader>
            <DataGridRow>
              {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
            </DataGridRow>
          </DataGridHeader>
          <DataGridBody<CricketTournamentTeam>>
            {({ item, rowId }) => (
              <DataGridRow<CricketTournamentTeam> key={rowId}>
                {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
              </DataGridRow>
            )}
          </DataGridBody>
        </DataGrid>
      )}
    </TournamentPage>
  );
}
