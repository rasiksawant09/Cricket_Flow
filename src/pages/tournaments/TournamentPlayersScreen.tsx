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
import { useParams } from "react-router-dom";
import { TournamentPage } from "../../components/tournaments/TournamentPage";
import { TournamentRequestState } from "../../components/tournaments/TournamentRequestState";
import { useTournamentContext } from "../../hooks/useTournamentContext";
import { useTournamentRequest } from "../../hooks/useTournamentRequest";
import type { CricketTournamentPlayer } from "../../models/CricketTournamentPlayer";
import { playerCategoryLabel } from "./tournamentFormatting";

function roleLabel(value?: boolean | null): string {
  if (value === true) {
    return "Yes";
  }
  if (value === false) {
    return "No";
  }
  return "Not set";
}

export function TournamentPlayersScreen() {
  const { id } = useParams<{ id: string }>();
  const { tournamentPlayers, tournamentTeams, loadTournamentPlayers } = useTournamentContext();
  const load = useCallback(
    () => id ? loadTournamentPlayers(id) : Promise.resolve({ success: false as const, error: new Error("A tournament ID is required.") }),
    [id, loadTournamentPlayers],
  );
  const request = useTournamentRequest(load);
  const players = tournamentPlayers.filter((player) => !id || player.promx_tournament === id);
  const teamNames = new Map(tournamentTeams.map((team) => [team.promx_crickettournamentteamid, team.promx_tournamentteamname]));
  const columns: TableColumnDefinition<CricketTournamentPlayer>[] = [
    createTableColumn<CricketTournamentPlayer>({
      columnId: "name",
      renderHeaderCell: () => "Player Name",
      renderCell: (player) => player.promx_tournamentplayername,
    }),
    createTableColumn<CricketTournamentPlayer>({
      columnId: "category",
      renderHeaderCell: () => "Category",
      renderCell: playerCategoryLabel,
    }),
    createTableColumn<CricketTournamentPlayer>({
      columnId: "team",
      renderHeaderCell: () => "Team",
      renderCell: (player) => teamNames.get(player.promx_tournamentteam) ?? "Unknown team",
    }),
    createTableColumn<CricketTournamentPlayer>({
      columnId: "captain",
      renderHeaderCell: () => "Captain",
      renderCell: (player) => roleLabel(player.promx_iscaptain),
    }),
    createTableColumn<CricketTournamentPlayer>({
      columnId: "viceCaptain",
      renderHeaderCell: () => "Vice Captain",
      renderCell: (player) => roleLabel(player.promx_isvicecaptain),
    }),
  ];

  return (
    <TournamentPage title="Tournament Players">
      <TournamentRequestState
        isLoading={request.isLoading}
        error={request.error}
        emptyMessage={players.length === 0 ? "No players are registered for this tournament." : undefined}
      />
      {!request.isLoading && !request.error && players.length > 0 && (
        <DataGrid
          aria-label="Tournament players"
          getRowId={(player) => player.promx_crickettournamentplayerid ?? player.promx_tournamentplayername}
          items={players}
          columns={columns}
        >
          <DataGridHeader>
            <DataGridRow>
              {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
            </DataGridRow>
          </DataGridHeader>
          <DataGridBody<CricketTournamentPlayer>>
            {({ item, rowId }) => (
              <DataGridRow<CricketTournamentPlayer> key={rowId}>
                {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
              </DataGridRow>
            )}
          </DataGridBody>
        </DataGrid>
      )}
    </TournamentPage>
  );
}
