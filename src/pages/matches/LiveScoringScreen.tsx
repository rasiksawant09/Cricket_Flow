import { Button, MessageBar, MessageBarBody } from "@fluentui/react-components";
import { useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import { BallEventGrid } from "../../components/matches/BallEventGrid";
import { MatchInformation } from "../../components/matches/MatchInformation";
import { ScoringControls } from "../../components/matches/ScoringControls";
import type { PlayerOption } from "../../components/matches/ScoringControls";
import { TournamentPage } from "../../components/tournaments/TournamentPage";
import { TournamentRequestState } from "../../components/tournaments/TournamentRequestState";
import { useMatchContext } from "../../hooks/useMatchContext";
import { useScoringContext } from "../../hooks/useScoringContext";
import { useTournamentContext } from "../../hooks/useTournamentContext";
import { useTournamentRequest } from "../../hooks/useTournamentRequest";
import type { DeliveryInput, InningsEndReason } from "../../services/interfaces/IScoringService";

type Feedback = { intent: "success" | "warning" | "error"; message: string };

const END_REASON_LABELS: Record<InningsEndReason, string> = {
  allOut: "all out",
  oversExhausted: "overs exhausted",
  targetReached: "target reached",
};

export function LiveScoringScreen() {
  const { id } = useParams<{ id: string }>();
  const { currentMatch, playingXI, loadMatch, loadPlayingXI } = useMatchContext();
  const { liveScoring, loadLiveScoring, recordDelivery, startInnings, reverseBall } = useScoringContext();
  const { tournamentPlayers, tournamentTeams, loadTournamentPlayers } = useTournamentContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      return { success: false as const, error: new Error("A match ID is required.") };
    }
    const matchResult = await loadMatch(id);
    if (!matchResult.success) {
      return matchResult;
    }
    const [playersResult, rosterResult] = await Promise.all([
      loadPlayingXI(id),
      loadTournamentPlayers(matchResult.data.promx_tournament),
    ]);
    if (!playersResult.success) {
      return { success: false as const, error: playersResult.error };
    }
    if (!rosterResult.success) {
      return { success: false as const, error: rosterResult.error };
    }
    return loadLiveScoring(id);
  }, [id, loadLiveScoring, loadMatch, loadPlayingXI, loadTournamentPlayers]);
  const request = useTournamentRequest(load);

  const match = currentMatch?.promx_cricketmatchid === id ? currentMatch : null;
  const snapshot = liveScoring && liveScoring.matchId === id ? liveScoring : null;
  const state = snapshot?.matchState ?? null;
  const innings = snapshot?.innings ?? null;
  const teamName = (teamId?: string | null) => tournamentTeams.find((team) =>
    team.promx_crickettournamentteamid === teamId && team.promx_tournament === match?.promx_tournament,
  )?.promx_tournamentteamname ?? "Team";
  const playerName = (playerId?: string | null): string => {
    if (!playerId) {
      return "Not available";
    }
    return playingXI.find((player) => player.promx_cricketmatchplayerid === playerId)?.promx_playernamesnapshot ?? "Unknown player";
  };
  const target = state?.promx_target ?? innings?.promx_target;
  const teamByRegistration = new Map(
    tournamentPlayers.flatMap((player) => player.promx_crickettournamentplayerid
      ? [[player.promx_crickettournamentplayerid, player.promx_tournamentteam] as const]
      : []),
  );
  const optionsFor = (teamId?: string): PlayerOption[] => playingXI
    .filter((player) => player.promx_match === id
      && player.promx_isplaying === true
      && player.promx_cricketmatchplayerid
      && teamByRegistration.get(player.promx_tournamentplayer) === teamId
      && !snapshot?.dismissedPlayerIds.includes(player.promx_cricketmatchplayerid))
    .map((player) => ({ id: player.promx_cricketmatchplayerid ?? "", label: player.promx_playernamesnapshot }));

  async function submit(input: Omit<DeliveryInput, "matchId">): Promise<boolean> {
    if (!id) {
      return false;
    }
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const result = await recordDelivery({ ...input, matchId: id });
      if (!result.success) {
        setFeedback({ intent: "error", message: result.error.message });
        return false;
      }
      const notes = [
        result.data.overCompleted && !result.data.inningsEnded ? "Over completed and the next over opened." : null,
        result.data.inningsEnded ? `Innings ended (${END_REASON_LABELS[result.data.inningsEnded]}).` : null,
        result.data.nextInningsOpened
          ? innings?.promx_issuperover ? "The second Super Over innings started." : "Second innings started."
          : null,
        result.data.superOverRequired ? "Match tied. Super Over required." : null,
        result.data.matchCompleted ? "Match completed." : null,
        result.data.overError ? `Over update failed: ${result.data.overError.message}` : null,
        result.data.lifecycleError ? `Lifecycle update failed: ${result.data.lifecycleError.message}` : null,
        result.data.projectionError ? `Match State was not refreshed: ${result.data.projectionError.message}` : null,
      ].filter((note): note is string => note !== null);
      setFeedback({
        intent: result.data.overError || result.data.lifecycleError || result.data.projectionError ? "warning" : "success",
        message: ["Ball Event recorded.", ...notes].join(" "),
      });
      return true;
    } catch (error) {
      setFeedback({ intent: "error", message: error instanceof Error ? error.message : "Could not record delivery." });
      return false;
    } finally {
      try {
        await loadLiveScoring(id);
      } finally {
        setIsSubmitting(false);
      }
    }
  }

  async function undoLast() {
    const latest = snapshot?.recentEvents[0];
    if (!id || !latest) {
      return;
    }
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const result = await reverseBall(latest, "Undone from live scoring");
      setFeedback(result.success
        ? { intent: "success", message: `Undid ${latest.promx_balleventname}.` }
        : { intent: "error", message: result.error.message });
      await loadLiveScoring(id);
    } catch (error) {
      setFeedback({ intent: "error", message: error instanceof Error ? error.message : "Could not undo the last ball." });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function begin() {
    if (!id) {
      return;
    }
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const result = await startInnings(id);
      if (!result.success) {
        setFeedback({ intent: "error", message: result.error.message });
      } else {
        setFeedback({
          intent: "success",
          message: result.data.promx_issuperover ? "Super Over started." : "Innings started.",
        });
      }
      await loadLiveScoring(id);
    } catch (error) {
      setFeedback({ intent: "error", message: error instanceof Error ? error.message : "Could not start innings." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <TournamentPage title={match?.promx_matchname ?? "Live Scoring"}>
      <TournamentRequestState
        isLoading={request.isLoading}
        error={request.error}
        loadingLabel="Loading live scoring"
        emptyMessage={!request.isLoading && !request.error && snapshot && !innings
          ? snapshot.matchCompleted ? "This match has been completed." : "This match has no live innings to score."
          : undefined}
      />
      {!request.isLoading && !request.error && snapshot && !innings && (
        <>
          {feedback && (
            <MessageBar intent={feedback.intent}>
              <MessageBarBody>{feedback.message}</MessageBarBody>
            </MessageBar>
          )}
          {snapshot.canStartInnings && (
            <div>
              <Button appearance="primary" disabled={isSubmitting} onClick={() => void begin()}>
                {snapshot.superOverRequired ? "Start Super Over" : "Start Innings"}
              </Button>
            </div>
          )}
        </>
      )}
      {!request.isLoading && !request.error && snapshot && innings && (
        <>
          <section className="live-center-board" aria-label="Live match score">
            <div className="live-center-heading">
              <span className="live-center-indicator"><span />{snapshot.matchCompleted ? "Match completed" : "Live match center"}</span>
              <span>{innings.promx_issuperover ? "Super Over" : `Innings ${innings.promx_inningsnumber}`}</span>
            </div>
            <div className="live-center-scoreline">
              <div className="live-center-team">
                <span>{teamName(innings.promx_battingteam)}</span>
                <strong>{`${state?.promx_currentruns ?? innings.promx_runs ?? 0}/${state?.promx_currentwickets ?? innings.promx_wickets ?? 0}`}</strong>
                <small>{`${state?.promx_currentovers ?? innings.promx_overs ?? 0} overs`}</small>
              </div>
              <div className="live-center-vs">VS</div>
              <div className="live-center-team live-center-opponent">
                <span>{teamName(innings.promx_bowlingteam)}</span>
                {target != null && <small>{`Target ${target}`}</small>}
              </div>
            </div>
          </section>
          <MatchInformation fields={[
            { label: "Current batter", value: playerName(state?.promx_currentstriker) },
            { label: "Non-striker", value: playerName(state?.promx_currentnonstriker) },
            { label: "Current bowler", value: playerName(state?.promx_currentbowler) },
            ...(innings.promx_inningsnumber >= 2 && target != null ? [{ label: "Runs required", value: state?.promx_runsrequired?.toString() ?? "Not available" }] : []),
          ]} />
          {feedback && (
            <MessageBar intent={feedback.intent}>
              <MessageBarBody>{feedback.message}</MessageBarBody>
            </MessageBar>
          )}
          <div>
            <Button appearance="secondary" disabled={isSubmitting || !snapshot.canUndo} onClick={() => void undoLast()}>
              {snapshot.canUndo && snapshot.recentEvents[0] ? `Undo last ball (${snapshot.recentEvents[0].promx_balleventname})` : "Undo last ball"}
            </Button>
          </div>
          <ScoringControls
            disabled={isSubmitting}
            pending={snapshot.pending}
            batters={optionsFor(innings.promx_battingteam)}
            bowlers={optionsFor(innings.promx_bowlingteam)}
            onSubmit={submit}
          />
          <BallEventGrid
            title={snapshot.currentOver ? `Current over ${snapshot.currentOver.promx_overnumber}` : "Current over"}
            events={snapshot.currentOverEvents}
            emptyMessage={snapshot.currentOver ? "No balls recorded in this over." : "There is no open over."}
          />
          <BallEventGrid title="Recent ball events" events={snapshot.recentEvents} emptyMessage="No Ball Events recorded yet." />
        </>
      )}
    </TournamentPage>
  );
}
