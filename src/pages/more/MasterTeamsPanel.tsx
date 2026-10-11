import {
  Button,
  createTableColumn,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
} from "@fluentui/react-components";
import type { TableColumnDefinition } from "@fluentui/react-components";
import { useState } from "react";
import { ConfirmDeleteDialog } from "../../components/master/ConfirmDeleteDialog";
import { MasterTeamFormDialog } from "../../components/master/MasterTeamFormDialog";
import { sourceLabel } from "../../components/master/masterData";
import { TournamentRequestState } from "../../components/tournaments/TournamentRequestState";
import { useTournamentContext } from "../../hooks/useTournamentContext";
import { useTournamentRequest } from "../../hooks/useTournamentRequest";
import type { CricketTeam } from "../../models/CricketTeam";

export function MasterTeamsPanel() {
  const { masterTeams, loadMasterTeams, createMasterTeam, updateMasterTeam, deleteMasterTeam } = useTournamentContext();
  const [teamToDelete, setTeamToDelete] = useState<CricketTeam | null>(null);
  const request = useTournamentRequest(loadMasterTeams);

  const columns: TableColumnDefinition<CricketTeam>[] = [
    createTableColumn<CricketTeam>({ columnId: "name", renderHeaderCell: () => "Team Name", renderCell: (team) => team.promx_teamname }),
    createTableColumn<CricketTeam>({ columnId: "short", renderHeaderCell: () => "Short Name", renderCell: (team) => team.promx_teamshortname }),
    createTableColumn<CricketTeam>({ columnId: "color", renderHeaderCell: () => "Color", renderCell: (team) => team.promx_teamcolor || "Not set" }),
    createTableColumn<CricketTeam>({ columnId: "source", renderHeaderCell: () => "Source", renderCell: (team) => sourceLabel(team.promx_source) }),
    createTableColumn<CricketTeam>({
      columnId: "actions",
      renderHeaderCell: () => "Actions",
      renderCell: (team) => (
        <div style={{ display: "flex", gap: "8px" }}>
          <MasterTeamFormDialog key={team.promx_cricketteamid} initial={team} onSave={updateMasterTeam} />
          <Button appearance="subtle" onClick={() => setTeamToDelete(team)}>Delete</Button>
        </div>
      ),
    }),
  ];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <MasterTeamFormDialog onSave={createMasterTeam} />
      </div>
      <TournamentRequestState
        isLoading={request.isLoading}
        error={request.error}
        emptyMessage={masterTeams.length === 0 ? "No teams are available." : undefined}
      />
      {!request.isLoading && !request.error && masterTeams.length > 0 && (
        <DataGrid
          aria-label="Teams"
          className="cf-table-surface"
          getRowId={(team) => team.promx_cricketteamid ?? team.promx_teamname}
          items={masterTeams}
          columns={columns}
        >
          <DataGridHeader>
            <DataGridRow>
              {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
            </DataGridRow>
          </DataGridHeader>
          <DataGridBody<CricketTeam>>
            {({ item, rowId }) => (
              <DataGridRow<CricketTeam> key={rowId}>
                {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
              </DataGridRow>
            )}
          </DataGridBody>
        </DataGrid>
      )}
      {teamToDelete?.promx_cricketteamid && (
        <ConfirmDeleteDialog
          title="Delete team?"
          message={`This permanently deletes ${teamToDelete.promx_teamname}. Dataverse may prevent deletion, or remove related records, depending on how tournaments reference this team.`}
          onConfirm={() => deleteMasterTeam(teamToDelete.promx_cricketteamid!)}
          onClose={() => setTeamToDelete(null)}
        />
      )}
    </>
  );
}
