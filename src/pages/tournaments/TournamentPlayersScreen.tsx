import {
  Button,
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
import { useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import { ConfirmDeleteDialog } from "../../components/master/ConfirmDeleteDialog";
import { GENDER_OPTIONS, PLAYER_CATEGORY_OPTIONS, genderLabel } from "../../components/master/masterData";
import { ColumnFilter } from "../../components/tournaments/ColumnFilter";
import { TournamentPage } from "../../components/tournaments/TournamentPage";
import { TournamentRequestState } from "../../components/tournaments/TournamentRequestState";
import { BulkPlayerRegistrationDialog } from "../../components/tournaments/BulkPlayerRegistrationDialog";
import { PlayerRegistrationDialog } from "../../components/tournaments/PlayerRegistrationDialog";
import { TournamentPlayerAddDialog } from "../../components/tournaments/TournamentPlayerAddDialog";
import { TournamentPlayerEditDialog } from "../../components/tournaments/TournamentPlayerEditDialog";
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

const YES_NO_OPTIONS = [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] as const;

function matchesFlag(value: boolean | null | undefined, filter: string): boolean {
  return !filter || (filter === "yes") === (value === true);
}

interface TournamentPlayersScreenProps {
  tournamentId?: string;
  embedded?: boolean;
}

export function TournamentPlayersScreen({ tournamentId, embedded = false }: TournamentPlayersScreenProps) {
  const { id: routeId } = useParams<{ id: string }>();
  const id = tournamentId ?? routeId;
  const {
    tournamentPlayers,
    tournamentTeams,
    masterPlayers,
    currentTournament,
    tournaments,
    loadTournament,
    loadTournamentPlayers,
    loadMasterPlayers,
    registerPlayer,
    registerPlayers,
    createAndRegisterPlayer,
    updateTournamentPlayer,
    removeTournamentPlayer,
  } = useTournamentContext();
  const [playerToRemove, setPlayerToRemove] = useState<CricketTournamentPlayer | null>(null);
  const [filters, setFilters] = useState({ name: "", gender: "", category: "", team: "", captain: "", viceCaptain: "" });
  const setFilter = (key: keyof typeof filters) => (value: string) => setFilters((current) => ({ ...current, [key]: value }));
  const load = useCallback(async () => {
    if (!id) return { success: false as const, error: new Error("A tournament ID is required.") };
    const [registered, masters, tournament] = await Promise.all([loadTournamentPlayers(id), loadMasterPlayers(), loadTournament(id)]);
    if (!registered.success) return registered;
    if (!masters.success) return masters;
    if (!tournament.success) return tournament;
    return registered;
  }, [id, loadMasterPlayers, loadTournament, loadTournamentPlayers]);
  const request = useTournamentRequest(load);
  const players = tournamentPlayers.filter((player) => !id || player.promx_tournament === id);
  const activeTeams = tournamentTeams.filter((team) => team.promx_tournament === id && team.statecode === 0 && team.statuscode === 1);
  const tournamentName = tournaments.find((tournament) => tournament.promx_crickettournamentid === id)?.promx_tournamentname
    ?? currentTournament?.promx_tournamentname
    ?? "";
  const teamNames = new Map(tournamentTeams.map((team) => [team.promx_crickettournamentteamid, team.promx_tournamentteamname]));
  const genderByPlayer = new Map(masterPlayers.map((master) => [master.promx_cricketplayerid, master.promx_gender]));
  const filteredPlayers = players.filter((player) => {
    const gender = genderByPlayer.get(player.promx_player);
    return (!filters.name || player.promx_tournamentplayername.toLowerCase().includes(filters.name.trim().toLowerCase()))
      && (!filters.gender || String(gender) === filters.gender)
      && (!filters.category || String(player.promx_playercategory) === filters.category)
      && (!filters.team || player.promx_tournamentteam === filters.team)
      && matchesFlag(player.promx_iscaptain, filters.captain)
      && matchesFlag(player.promx_isvicecaptain, filters.viceCaptain);
  });
  const hasFilters = Object.values(filters).some(Boolean);
  const teamOptions = activeTeams.flatMap((team) => team.promx_crickettournamentteamid
    ? [{ value: team.promx_crickettournamentteamid, label: team.promx_tournamentteamname }]
    : []);
  const columns: TableColumnDefinition<CricketTournamentPlayer>[] = [
    createTableColumn<CricketTournamentPlayer>({
      columnId: "name",
      renderHeaderCell: () => <ColumnFilter label="Player Name" value={filters.name} onChange={setFilter("name")} />,
      renderCell: (player) => player.promx_tournamentplayername,
    }),
    createTableColumn<CricketTournamentPlayer>({
      columnId: "gender",
      renderHeaderCell: () => (
        <ColumnFilter
          label="Gender"
          value={filters.gender}
          onChange={setFilter("gender")}
          options={GENDER_OPTIONS.map((option) => ({ value: String(option.value), label: option.label }))}
        />
      ),
      renderCell: (player) => genderLabel(genderByPlayer.get(player.promx_player)),
    }),
    createTableColumn<CricketTournamentPlayer>({
      columnId: "category",
      renderHeaderCell: () => (
        <ColumnFilter
          label="Category"
          value={filters.category}
          onChange={setFilter("category")}
          options={PLAYER_CATEGORY_OPTIONS.map((option) => ({ value: String(option.value), label: option.label }))}
        />
      ),
      renderCell: playerCategoryLabel,
    }),
    createTableColumn<CricketTournamentPlayer>({
      columnId: "team",
      renderHeaderCell: () => <ColumnFilter label="Team" value={filters.team} onChange={setFilter("team")} options={teamOptions} />,
      renderCell: (player) => teamNames.get(player.promx_tournamentteam) ?? "Unknown team",
    }),
    createTableColumn<CricketTournamentPlayer>({
      columnId: "captain",
      renderHeaderCell: () => <ColumnFilter label="Captain" value={filters.captain} onChange={setFilter("captain")} options={YES_NO_OPTIONS} />,
      renderCell: (player) => roleLabel(player.promx_iscaptain),
    }),
    createTableColumn<CricketTournamentPlayer>({
      columnId: "viceCaptain",
      renderHeaderCell: () => <ColumnFilter label="Vice Captain" value={filters.viceCaptain} onChange={setFilter("viceCaptain")} options={YES_NO_OPTIONS} />,
      renderCell: (player) => roleLabel(player.promx_isvicecaptain),
    }),
    createTableColumn<CricketTournamentPlayer>({
      columnId: "actions",
      renderHeaderCell: () => "Actions",
      renderCell: (player) => (
        <div style={{ display: "flex", gap: "8px" }}>
          <TournamentPlayerEditDialog
            key={player.promx_crickettournamentplayerid}
            player={player}
            tournamentName={tournamentName}
            masterPlayerName={masterPlayers.find((master) => master.promx_cricketplayerid === player.promx_player)?.promx_cricketplayer1 ?? player.promx_tournamentplayername}
            teams={activeTeams}
            onSave={updateTournamentPlayer}
          />
          <Button appearance="subtle" onClick={() => setPlayerToRemove(player)}>Remove</Button>
        </div>
      ),
    }),
  ];

  return (
    <TournamentPage embedded={embedded} title="Tournament Players">
      {id && (
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: "8px" }}>
          <TournamentPlayerAddDialog
            tournamentId={id}
            teams={activeTeams}
            onSave={createAndRegisterPlayer}
          />
          <PlayerRegistrationDialog
            tournamentId={id}
            players={masterPlayers}
            teams={activeTeams}
            registrations={players}
            onRegister={registerPlayer}
          />
          <BulkPlayerRegistrationDialog
            tournamentId={id}
            players={masterPlayers}
            teams={activeTeams}
            registrations={players}
            onRegister={registerPlayers}
          />
        </div>
      )}
      <TournamentRequestState
        isLoading={request.isLoading}
        error={request.error}
        emptyMessage={players.length === 0 ? "No players are registered for this tournament." : undefined}
      />
      {!request.isLoading && !request.error && players.length > 0 && hasFilters && (
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Text role="status">{`Showing ${filteredPlayers.length} of ${players.length} players`}</Text>
          <Button size="small" appearance="secondary" onClick={() => setFilters({ name: "", gender: "", category: "", team: "", captain: "", viceCaptain: "" })}>
            Clear all filters
          </Button>
        </div>
      )}
      {!request.isLoading && !request.error && players.length > 0 && (
        <DataGrid
          aria-label="Tournament players"
          className="cf-table-surface"
          getRowId={(player) => player.promx_crickettournamentplayerid ?? player.promx_tournamentplayername}
          items={filteredPlayers}
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
      {!request.isLoading && !request.error && players.length > 0 && filteredPlayers.length === 0 && (
        <Text role="status">No players match the current filters.</Text>
      )}
      {playerToRemove?.promx_crickettournamentplayerid && (
        <ConfirmDeleteDialog
          title="Remove player from tournament?"
          message={`This permanently deletes ${playerToRemove.promx_tournamentplayername}'s tournament registration. The shared Cricket Flow player is kept. Match records that still reference this registration may prevent deletion.`}
          onConfirm={() => removeTournamentPlayer(playerToRemove.promx_crickettournamentplayerid!)}
          onClose={() => setPlayerToRemove(null)}
        />
      )}
    </TournamentPage>
  );
}
