import { Button, MessageBar, MessageBarBody, Spinner, Text } from "@fluentui/react-components";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PlayingXIGrid } from "../../components/matches/PlayingXIGrid";
import type { PlayingXIGridRow } from "../../components/matches/PlayingXIGrid";
import { TournamentPage } from "../../components/tournaments/TournamentPage";
import { TournamentRequestState } from "../../components/tournaments/TournamentRequestState";
import { useMatchContext } from "../../hooks/useMatchContext";
import { useTournamentContext } from "../../hooks/useTournamentContext";
import { useTournamentRequest } from "../../hooks/useTournamentRequest";
import type { CricketMatchPlayer } from "../../models/CricketMatchPlayer";
import type { CricketTournamentPlayer } from "../../models/CricketTournamentPlayer";
import { routeFor } from "../../routing/routeConstants";

function roleLabel(value?: boolean | null): string {
  if (value === true) {
    return "Yes";
  }
  if (value === false) {
    return "No";
  }
  return "Not set";
}

function selectedPlayerRow(
  snapshot: CricketMatchPlayer,
  registration: CricketTournamentPlayer | undefined,
  teamNames: ReadonlyMap<string, string>,
): PlayingXIGridRow {
  const teamId = registration?.promx_tournamentteam;
  return {
    id: snapshot.promx_cricketmatchplayerid ?? snapshot.promx_tournamentplayer,
    playerName: snapshot.promx_playernamesnapshot || registration?.promx_tournamentplayername || "Unknown player",
    teamName: snapshot.promx_teamsnapshot || (teamId ? teamNames.get(teamId) : undefined) || "Unknown team",
    captain: roleLabel(snapshot.promx_iscaptain ?? registration?.promx_iscaptain),
    viceCaptain: roleLabel(registration?.promx_isvicecaptain),
  };
}

export function PlayingXIScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    currentMatch,
    playingXI,
    playingXIValidation,
    loadMatch,
    loadPlayingXI,
    validatePlayingXI,
    addPlayer,
    removePlayer,
    lockPlayingXI,
  } = useMatchContext();
  const { tournamentPlayers, tournamentTeams, loadTournamentPlayers } = useTournamentContext();
  const load = useCallback(async () => {
    if (!id) {
      return { success: false as const, error: new Error("A match ID is required.") };
    }

    const matchResult = await loadMatch(id);
    if (!matchResult.success) {
      return matchResult;
    }

    const [rosterResult, selectedResult] = await Promise.all([
      loadTournamentPlayers(matchResult.data.promx_tournament),
      loadPlayingXI(id),
    ]);
    if (!rosterResult.success) {
      return { success: false as const, error: rosterResult.error };
    }
    if (!selectedResult.success) {
      return { success: false as const, error: selectedResult.error };
    }
    return matchResult;
  }, [id, loadMatch, loadPlayingXI, loadTournamentPlayers]);
  const request = useTournamentRequest(load);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<Error | null>(null);
  const match = currentMatch?.promx_cricketmatchid === id ? currentMatch : null;
  const roster = tournamentPlayers.filter((player) =>
    player.promx_tournament === match?.promx_tournament
    && (player.promx_tournamentteam === match.promx_teama || player.promx_tournamentteam === match.promx_teamb),
  );
  const selected = playingXI.filter((player) => player.promx_match === id && player.promx_isplaying === true);
  const selectedPlayerIds = new Set(selected.map((player) => player.promx_tournamentplayer));
  const registrationsById = new Map(
    roster.flatMap((player) => player.promx_crickettournamentplayerid
      ? [[player.promx_crickettournamentplayerid, player] as const]
      : []),
  );
  const teamNames = new Map(
    tournamentTeams.flatMap((team) => team.promx_crickettournamentteamid
      && team.promx_tournament === match?.promx_tournament
      ? [[team.promx_crickettournamentteamid, team.promx_tournamentteamname] as const]
      : []),
  );
  const availableRowsFor = (teamId: string | undefined): PlayingXIGridRow[] => roster
    .filter((player) => player.promx_tournamentteam === teamId)
    .filter((player) => !player.promx_crickettournamentplayerid || !selectedPlayerIds.has(player.promx_crickettournamentplayerid))
    .map((player) => ({
      id: player.promx_crickettournamentplayerid ?? `${player.promx_tournamentteam}-${player.promx_tournamentplayername}`,
      playerName: player.promx_tournamentplayername,
      teamName: teamNames.get(player.promx_tournamentteam) ?? "Unknown team",
      captain: roleLabel(player.promx_iscaptain),
      viceCaptain: roleLabel(player.promx_isvicecaptain),
    }));
  const selectedRows = selected.map((player) => selectedPlayerRow(
    player,
    registrationsById.get(player.promx_tournamentplayer),
    teamNames,
  ));
  const validation = playingXIValidation && playingXIValidation.matchId === id
    ? playingXIValidation.result
    : null;

  async function selectPlayer(row: PlayingXIGridRow) {
    if (!id || !match) return;
    const registration = roster.find((player) => player.promx_crickettournamentplayerid === row.id);
    if (!registration) return;
    setIsSaving(true);
    setActionError(null);
    try {
      const result = await addPlayer(id, {
        promx_match: id,
        promx_tournamentplayer: registration.promx_crickettournamentplayerid ?? "",
        promx_playernamesnapshot: registration.promx_tournamentplayername,
        promx_teamsnapshot: teamNames.get(registration.promx_tournamentteam) ?? "Unknown team",
        promx_matchplayername: registration.promx_tournamentplayername,
        promx_playercategorysnapshot: registration.promx_playercategory,
        promx_jerseynumbersnapshot: registration.promx_jerseynumber,
        promx_iscaptain: registration.promx_iscaptain,
        promx_isplaying: true,
      });
      if (!result.success) setActionError(result.error);
      else await validatePlayingXI(id);
    } catch (error) {
      setActionError(error instanceof Error ? error : new Error("Could not select player."));
    } finally {
      setIsSaving(false);
    }
  }

  async function removeSelectedPlayer(row: PlayingXIGridRow) {
    const snapshot = selected.find((player) => player.promx_cricketmatchplayerid === row.id);
    if (!snapshot?.promx_cricketmatchplayerid) return;
    setIsSaving(true);
    setActionError(null);
    try {
      const result = await removePlayer(snapshot.promx_cricketmatchplayerid);
      if (!result.success) setActionError(result.error);
      else if (id) await validatePlayingXI(id);
    } catch (error) {
      setActionError(error instanceof Error ? error : new Error("Could not remove player."));
    } finally {
      setIsSaving(false);
    }
  }

  async function lockAndStart() {
    if (!id) return;
    setIsSaving(true);
    setActionError(null);
    try {
      const result = await lockPlayingXI(id);
      if (!result.success) {
        setActionError(result.error);
        return;
      }
      navigate(routeFor.liveScoring(id));
    } catch (error) {
      setActionError(error instanceof Error ? error : new Error("Could not lock the Playing XI."));
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    if (request.isLoading || request.error || !match || !id) {
      return;
    }
    void validatePlayingXI(id);
  }, [id, match, request.error, request.isLoading, validatePlayingXI]);

  return (
    <TournamentPage title={match?.promx_matchname ?? `Match ${id ?? ""} - Playing XI`}>
      <TournamentRequestState
        isLoading={request.isLoading}
        error={request.error}
        loadingLabel="Loading Playing XI"
      />
      {!request.isLoading && !request.error && match && (
        <>
          <Text>{`${teamNames.get(match.promx_teama) ?? "Unknown team"} vs ${teamNames.get(match.promx_teamb) ?? "Unknown team"}`}</Text>
          <section aria-label="Playing XI validation">
            <Text as="h2" size={500} weight="semibold">Validation status</Text>
            {validation === null ? (
              <Spinner label="Validating Playing XI" size="small" />
            ) : validation.success ? (
              <MessageBar intent="success">
                <MessageBarBody>Playing XI passed service validation.</MessageBarBody>
              </MessageBar>
            ) : (
              <MessageBar intent="error">
                <MessageBarBody>{validation.error.message}</MessageBarBody>
              </MessageBar>
            )}
          </section>
          {actionError && (
            <MessageBar intent="error"><MessageBarBody>{actionError.message}</MessageBarBody></MessageBar>
          )}
          <PlayingXIGrid
            title={`Team A available players - ${teamNames.get(match.promx_teama) ?? "Unknown team"}`}
            rows={availableRowsFor(match.promx_teama)}
            emptyMessage="No available players for Team A."
            actionLabel="Select"
            disabled={isSaving}
            onAction={(row) => void selectPlayer(row)}
          />
          <PlayingXIGrid
            title={`Team B available players - ${teamNames.get(match.promx_teamb) ?? "Unknown team"}`}
            rows={availableRowsFor(match.promx_teamb)}
            emptyMessage="No available players for Team B."
            actionLabel="Select"
            disabled={isSaving}
            onAction={(row) => void selectPlayer(row)}
          />
          <PlayingXIGrid
            title="Selected Playing XI"
            rows={selectedRows}
            emptyMessage="No players are currently selected in the Playing XI."
            actionLabel="Remove"
            disabled={isSaving}
            onAction={(row) => void removeSelectedPlayer(row)}
          />
          <Button appearance="primary" disabled={isSaving || request.isLoading} onClick={() => void lockAndStart()}>
            {isSaving ? <Spinner label="Validating and locking Playing XI" size="tiny" /> : "Lock Playing XI and start match"}
          </Button>
        </>
      )}
    </TournamentPage>
  );
}
