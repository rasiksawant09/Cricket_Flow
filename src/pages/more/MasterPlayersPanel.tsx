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
import { MasterPlayerFormDialog } from "../../components/master/MasterPlayerFormDialog";
import { genderLabel, sourceLabel } from "../../components/master/masterData";
import { TournamentRequestState } from "../../components/tournaments/TournamentRequestState";
import { useTournamentContext } from "../../hooks/useTournamentContext";
import { useTournamentRequest } from "../../hooks/useTournamentRequest";
import type { CricketPlayer } from "../../models/CricketPlayer";

export function MasterPlayersPanel() {
  const { masterPlayers, loadMasterPlayers, createMasterPlayer, updateMasterPlayer, deleteMasterPlayer } = useTournamentContext();
  const [playerToDelete, setPlayerToDelete] = useState<CricketPlayer | null>(null);
  const request = useTournamentRequest(loadMasterPlayers);

  const columns: TableColumnDefinition<CricketPlayer>[] = [
    createTableColumn<CricketPlayer>({ columnId: "name", renderHeaderCell: () => "Player Name", renderCell: (player) => player.promx_cricketplayer1 }),
    createTableColumn<CricketPlayer>({ columnId: "gender", renderHeaderCell: () => "Gender", renderCell: (player) => genderLabel(player.promx_gender) }),
    createTableColumn<CricketPlayer>({ columnId: "email", renderHeaderCell: () => "Email", renderCell: (player) => player.promx_emailaddress || "Not set" }),
    createTableColumn<CricketPlayer>({ columnId: "employee", renderHeaderCell: () => "Employee Id", renderCell: (player) => player.promx_employeeid || "Not set" }),
    createTableColumn<CricketPlayer>({ columnId: "source", renderHeaderCell: () => "Source", renderCell: (player) => sourceLabel(player.promx_source) }),
    createTableColumn<CricketPlayer>({
      columnId: "actions",
      renderHeaderCell: () => "Actions",
      renderCell: (player) => (
        <div style={{ display: "flex", gap: "8px" }}>
          <MasterPlayerFormDialog key={player.promx_cricketplayerid} initial={player} onSave={updateMasterPlayer} />
          <Button appearance="subtle" onClick={() => setPlayerToDelete(player)}>Delete</Button>
        </div>
      ),
    }),
  ];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <MasterPlayerFormDialog onSave={createMasterPlayer} />
      </div>
      <TournamentRequestState
        isLoading={request.isLoading}
        error={request.error}
        emptyMessage={masterPlayers.length === 0 ? "No players are available." : undefined}
      />
      {!request.isLoading && !request.error && masterPlayers.length > 0 && (
        <DataGrid
          aria-label="Players"
          className="cf-table-surface"
          getRowId={(player) => player.promx_cricketplayerid ?? player.promx_cricketplayer1}
          items={masterPlayers}
          columns={columns}
        >
          <DataGridHeader>
            <DataGridRow>
              {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
            </DataGridRow>
          </DataGridHeader>
          <DataGridBody<CricketPlayer>>
            {({ item, rowId }) => (
              <DataGridRow<CricketPlayer> key={rowId}>
                {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
              </DataGridRow>
            )}
          </DataGridBody>
        </DataGrid>
      )}
      {playerToDelete?.promx_cricketplayerid && (
        <ConfirmDeleteDialog
          title="Delete player?"
          message={`This permanently deletes ${playerToDelete.promx_cricketplayer1}. Dataverse may prevent deletion, or remove related records, depending on how tournaments reference this player.`}
          onConfirm={() => deleteMasterPlayer(playerToDelete.promx_cricketplayerid!)}
          onClose={() => setPlayerToDelete(null)}
        />
      )}
    </>
  );
}
