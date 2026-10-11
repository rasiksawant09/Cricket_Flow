import {
  createTableColumn,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  Text,
} from "@fluentui/react-components";
import type { TableColumnDefinition } from "@fluentui/react-components";
import { useNavigate } from "react-router-dom";
import { TournamentPage } from "../../components/tournaments/TournamentPage";
import { TournamentFormDialog } from "../../components/tournaments/TournamentFormDialog";
import { TournamentRequestState } from "../../components/tournaments/TournamentRequestState";
import { useTournamentContext } from "../../hooks/useTournamentContext";
import { useTournamentRequest } from "../../hooks/useTournamentRequest";
import type { CricketTournament } from "../../models/CricketTournament";
import { routeFor } from "../../routing/routeConstants";
import { formatTournamentDate, tournamentStatusLabel } from "./tournamentFormatting";

const columns: TableColumnDefinition<CricketTournament>[] = [
  createTableColumn<CricketTournament>({
    columnId: "name",
    renderHeaderCell: () => "Tournament Name",
    renderCell: (tournament) => <Text weight="semibold">{tournament.promx_tournamentname}</Text>,
  }),
  createTableColumn<CricketTournament>({
    columnId: "startDate",
    renderHeaderCell: () => "Start Date",
    renderCell: (tournament) => formatTournamentDate(tournament.promx_startdate),
  }),
  createTableColumn<CricketTournament>({
    columnId: "endDate",
    renderHeaderCell: () => "End Date",
    renderCell: (tournament) => formatTournamentDate(tournament.promx_enddate),
  }),
  createTableColumn<CricketTournament>({
    columnId: "status",
    renderHeaderCell: () => "Status",
    renderCell: tournamentStatusLabel,
  }),
];

export function TournamentListScreen() {
  const navigate = useNavigate();
  const { tournaments, loadTournaments, createTournament } = useTournamentContext();
  const request = useTournamentRequest(loadTournaments);

  return (
    <TournamentPage title="Tournaments">
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <TournamentFormDialog
          triggerLabel="Create Tournament"
          onSave={createTournament}
          onSaved={(tournament) => {
            if (tournament.promx_crickettournamentid) navigate(routeFor.tournamentDetail(tournament.promx_crickettournamentid));
          }}
        />
      </div>
      <TournamentRequestState
        isLoading={request.isLoading}
        error={request.error}
        emptyMessage={tournaments.length === 0 ? "No tournaments are available." : undefined}
      />
      {!request.isLoading && !request.error && tournaments.length > 0 && (
        <DataGrid
          aria-label="Tournaments"
          className="cf-table-surface"
          getRowId={(tournament) => tournament.promx_crickettournamentid ?? tournament.promx_tournamentname}
          items={tournaments}
          columns={columns}
          selectionMode="single"
          onSelectionChange={(_, data) => {
            const selectedId = [...data.selectedItems][0];
            const tournament = tournaments.find((item) => item.promx_crickettournamentid === selectedId);
            if (tournament?.promx_crickettournamentid) {
              navigate(routeFor.tournamentDetail(tournament.promx_crickettournamentid));
            }
          }}
        >
          <DataGridHeader>
            <DataGridRow>
              {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
            </DataGridRow>
          </DataGridHeader>
          <DataGridBody<CricketTournament>>
            {({ item, rowId }) => (
              <DataGridRow<CricketTournament> key={rowId}>
                {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
              </DataGridRow>
            )}
          </DataGridBody>
        </DataGrid>
      )}
    </TournamentPage>
  );
}
