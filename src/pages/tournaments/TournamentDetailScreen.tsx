import { Button, Text, makeStyles, tokens } from "@fluentui/react-components";
import { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { TournamentPage } from "../../components/tournaments/TournamentPage";
import { TournamentRequestState } from "../../components/tournaments/TournamentRequestState";
import { TournamentFormDialog } from "../../components/tournaments/TournamentFormDialog";
import { useTournamentContext } from "../../hooks/useTournamentContext";
import { useTournamentRequest } from "../../hooks/useTournamentRequest";
import { routeFor } from "../../routing/routeConstants";
import { ROUTE_PATHS } from "../../routing/routeConstants";
import { formatTournamentDate, tournamentStatusLabel } from "./tournamentFormatting";

const useStyles = makeStyles({
  details: {
    display: "grid",
    gap: tokens.spacingVerticalL,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
  },
  field: {
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXS,
    paddingBlockEnd: tokens.spacingVerticalS,
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: tokens.spacingHorizontalS,
  },
});

export function TournamentDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTournament, loadTournament, updateTournament, setTournamentStatus } = useTournamentContext();
  const load = useCallback(
    () => id ? loadTournament(id) : Promise.resolve({ success: false as const, error: new Error("A tournament ID is required.") }),
    [id, loadTournament],
  );
  const request = useTournamentRequest(load);
  const tournament = currentTournament?.promx_crickettournamentid === id ? currentTournament : null;
  const styles = useStyles();

  return (
    <TournamentPage title={tournament?.promx_tournamentname ?? "Tournament details"}>
      <TournamentRequestState isLoading={request.isLoading} error={request.error} />
      {!request.isLoading && !request.error && tournament && (
        <>
          <section className={styles.details} aria-label="Tournament information">
            <div className={styles.field}>
              <Text size={200} weight="semibold">Name</Text>
              <Text>{tournament.promx_tournamentname}</Text>
            </div>
            <div className={styles.field}>
              <Text size={200} weight="semibold">Description</Text>
              <Text>{tournament.promx_description || "Not provided"}</Text>
            </div>
            <div className={styles.field}>
              <Text size={200} weight="semibold">Overs per innings</Text>
              <Text>{tournament.promx_oversperinnings}</Text>
            </div>
            <div className={styles.field}>
              <Text size={200} weight="semibold">Players per team</Text>
              <Text>{tournament.promx_playersperteam}</Text>
            </div>
            <div className={styles.field}>
              <Text size={200} weight="semibold">Start date</Text>
              <Text>{formatTournamentDate(tournament.promx_startdate)}</Text>
            </div>
            <div className={styles.field}>
              <Text size={200} weight="semibold">End date</Text>
              <Text>{formatTournamentDate(tournament.promx_enddate)}</Text>
            </div>
            <div className={styles.field}>
              <Text size={200} weight="semibold">Status</Text>
              <Text>{tournamentStatusLabel(tournament)}</Text>
            </div>
          </section>
          {id && (
            <nav className={styles.actions} aria-label="Tournament sections">
              <TournamentFormDialog
                key={tournament.promx_crickettournamentid}
                initial={tournament}
                triggerLabel="Edit Tournament"
                onSave={updateTournament}
                onStatusChange={setTournamentStatus}
              />
              <Button appearance="secondary" onClick={() => navigate(routeFor.tournamentTeams(id))}>Teams</Button>
              <Button appearance="secondary" onClick={() => navigate(routeFor.tournamentPlayers(id))}>Players</Button>
              <Button appearance="secondary" onClick={() => navigate(routeFor.tournamentRules(id))}>Rules</Button>
              <Button appearance="primary" onClick={() => navigate(ROUTE_PATHS.standings)}>Standings</Button>
              <Button appearance="secondary" onClick={() => navigate(ROUTE_PATHS.tournamentLeaderboards)}>Leaderboards</Button>
            </nav>
          )}
        </>
      )}
    </TournamentPage>
  );
}
