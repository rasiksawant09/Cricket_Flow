import {
  createTableColumn,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  MessageBar,
  MessageBarBody,
} from "@fluentui/react-components";
import type { TableColumnDefinition } from "@fluentui/react-components";
import { useParams } from "react-router-dom";
import { useCallback, useState } from "react";
import { TournamentPage } from "../../components/tournaments/TournamentPage";
import { TournamentRequestState } from "../../components/tournaments/TournamentRequestState";
import { TeamRegistrationDialog } from "../../components/tournaments/TeamRegistrationDialog";
import { TournamentTeamFormDialog } from "../../components/tournaments/TournamentTeamFormDialog";
import { useTournamentContext } from "../../hooks/useTournamentContext";
import { useTournamentRequest } from "../../hooks/useTournamentRequest";
import type { CricketTournamentTeam } from "../../models/CricketTournamentTeam";

export function TournamentTeamsScreen() {
  const { id } = useParams<{ id: string }>();
  const {
    tournamentTeams,
    masterTeams,
    loadTournamentTeams,
    loadMasterTeams,
    registerTeam,
    createAndRegisterTeam,
    updateTournamentTeam,
    removeTournamentTeam,
  } = useTournamentContext();
  const [registrationToRemove, setRegistrationToRemove] = useState<CricketTournamentTeam | null>(null);
  const [removeError, setRemoveError] = useState<Error | null>(null);
  const [removing, setRemoving] = useState(false);
  const load = useCallback(async () => {
    if (!id) return { success: false as const, error: new Error("A tournament ID is required.") };
    const [registered, masters] = await Promise.all([loadTournamentTeams(id), loadMasterTeams()]);
    if (!registered.success) return registered;
    if (!masters.success) return masters;
    return registered;
  }, [id, loadMasterTeams, loadTournamentTeams]);
  const request = useTournamentRequest(load);
  const teams = tournamentTeams.filter((team) => !id || team.promx_tournament === id);
  const activeTeams = teams.filter((team) => team.statecode === 0 && team.statuscode === 1);

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
    createTableColumn<CricketTournamentTeam>({
      columnId: "actions",
      renderHeaderCell: () => "Actions",
      renderCell: (registration) => {
        const master = masterTeams.find((team) => team.promx_cricketteamid === registration.promx_team);
        if (!master || !id) return null;
        return (
          <div style={{ display: "flex", gap: "8px" }}>
            <TournamentTeamFormDialog
              key={`edit-${registration.promx_crickettournamentteamid}`}
              initialTeam={master}
              initialRegistration={registration}
              onSave={(team, groupName, seedNumber) => updateTournamentTeam(team, {
                ...registration,
                promx_groupname: groupName,
                promx_seednumber: seedNumber,
              })}
            />
            <Button appearance="subtle" onClick={() => {
              setRemoveError(null);
              setRegistrationToRemove(registration);
            }}>Remove</Button>
          </div>
        );
      },
    }),
  ];

  async function confirmRemove() {
    const registrationId = registrationToRemove?.promx_crickettournamentteamid;
    if (!registrationId) return;
    setRemoving(true);
    setRemoveError(null);
    const result = await removeTournamentTeam(registrationId);
    setRemoving(false);
    if (!result.success) {
      setRemoveError(result.error);
      return;
    }
    setRegistrationToRemove(null);
  }

  return (
    <TournamentPage title="Tournament Teams">
      {id && (
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: "8px" }}>
          <TournamentTeamFormDialog
            key={`add-${id}`}
            onSave={(team, groupName, seedNumber) => createAndRegisterTeam(id, team, groupName, seedNumber)}
          />
          <TeamRegistrationDialog
            tournamentId={id}
            teams={masterTeams}
            registrations={teams}
            onRegister={registerTeam}
          />
        </div>
      )}
      <TournamentRequestState
        isLoading={request.isLoading}
        error={request.error}
        emptyMessage={activeTeams.length === 0 ? "No teams are registered for this tournament." : undefined}
      />
      {removeError && <MessageBar intent="error"><MessageBarBody>{removeError.message}</MessageBarBody></MessageBar>}
      {!request.isLoading && !request.error && activeTeams.length > 0 && (
        <DataGrid
          aria-label="Registered tournament teams"
          className="cf-table-surface"
          getRowId={(team) => team.promx_crickettournamentteamid ?? team.promx_tournamentteamname}
          items={activeTeams}
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
      <Dialog open={Boolean(registrationToRemove)} onOpenChange={(_, data) => {
        if (!data.open && !removing) setRegistrationToRemove(null);
      }}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Remove team from tournament?</DialogTitle>
            <DialogContent style={{ display: "grid", gap: "12px" }}>
              {removeError && <MessageBar intent="error"><MessageBarBody>{removeError.message}</MessageBarBody></MessageBar>}
              <p>This permanently deletes the tournament team registration and its tournament player registrations. The shared Cricket Flow master team is kept. Existing matches may prevent deletion if they still reference this team.</p>
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement><Button appearance="secondary" disabled={removing}>Cancel</Button></DialogTrigger>
              <Button appearance="primary" onClick={() => void confirmRemove()} disabled={removing}>
                {removing ? "Removing" : "Remove Team"}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </TournamentPage>
  );
}
