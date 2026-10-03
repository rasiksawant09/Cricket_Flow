import { MessageBar, MessageBarBody, Spinner, Text } from "@fluentui/react-components";
import { useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";
import { PlayingXIGrid } from "../../components/matches/PlayingXIGrid";
import type { PlayingXIGridRow } from "../../components/matches/PlayingXIGrid";
import { TournamentPage } from "../../components/tournaments/TournamentPage";
import { TournamentRequestState } from "../../components/tournaments/TournamentRequestState";
import { useMatchContext } from "../../hooks/useMatchContext";
import { useTournamentContext } from "../../hooks/useTournamentContext";
import { useTournamentRequest } from "../../hooks/useTournamentRequest";
import type { CricketMatchPlayer } from "../../models/CricketMatchPlayer";
import type { CricketTournamentPlayer } from "../../models/CricketTournamentPlayer";

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
  const {
    currentMatch,
    playingXI,
    playingXIValidation,
    loadMatch,
    loadPlayingXI,
    validatePlayingXI,
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
  const availableRows: PlayingXIGridRow[] = roster
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
          <PlayingXIGrid
            title="Available tournament players"
            rows={availableRows}
            emptyMessage={roster.length === 0
              ? "No tournament players are registered for either match team."
              : "All registered players for these teams are in the selected XI."}
          />
          <PlayingXIGrid
            title="Selected Playing XI"
            rows={selectedRows}
            emptyMessage="No players are currently selected in the Playing XI."
          />
        </>
      )}
    </TournamentPage>
  );
}
