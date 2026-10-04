import { MessageBar, MessageBarBody } from "@fluentui/react-components";
import { useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import { BallEventGrid } from "../../components/matches/BallEventGrid";
import { MatchInformation } from "../../components/matches/MatchInformation";
import { ScoringControls } from "../../components/matches/ScoringControls";
import { TournamentPage } from "../../components/tournaments/TournamentPage";
import { TournamentRequestState } from "../../components/tournaments/TournamentRequestState";
import { useMatchContext } from "../../hooks/useMatchContext";
import { useScoringContext } from "../../hooks/useScoringContext";
import { useTournamentRequest } from "../../hooks/useTournamentRequest";
import type { DeliveryInput } from "../../services/interfaces/IScoringService";

type Feedback = { intent: "success" | "warning" | "error"; message: string };

export function LiveScoringScreen() {
  const { id } = useParams<{ id: string }>();
  const { currentMatch, playingXI, loadMatch, loadPlayingXI } = useMatchContext();
  const { liveScoring, loadLiveScoring, recordDelivery } = useScoringContext();
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
    const playersResult = await loadPlayingXI(id);
    if (!playersResult.success) {
      return { success: false as const, error: playersResult.error };
    }
    return loadLiveScoring(id);
  }, [id, loadLiveScoring, loadMatch, loadPlayingXI]);
  const request = useTournamentRequest(load);

  const match = currentMatch?.promx_cricketmatchid === id ? currentMatch : null;
  const snapshot = liveScoring && liveScoring.matchId === id ? liveScoring : null;
  const state = snapshot?.matchState ?? null;
  const innings = snapshot?.innings ?? null;
  const playerName = (playerId?: string | null): string => {
    if (!playerId) {
      return "Not available";
    }
    return playingXI.find((player) => player.promx_cricketmatchplayerid === playerId)?.promx_playernamesnapshot ?? "Unknown player";
  };
  const target = state?.promx_target ?? innings?.promx_target;

  async function submit(input: Omit<DeliveryInput, "matchId">) {
    if (!id) {
      return;
    }
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const result = await recordDelivery({ ...input, matchId: id });
      if (!result.success) {
        setFeedback({ intent: "error", message: result.error.message });
      } else if (result.data.projectionError) {
        setFeedback({ intent: "warning", message: `Ball Event recorded. Match State was not refreshed: ${result.data.projectionError.message}` });
      } else {
        setFeedback({ intent: "success", message: "Ball Event recorded." });
      }
      await loadLiveScoring(id);
    } catch (error) {
      setFeedback({ intent: "error", message: error instanceof Error ? error.message : "Could not record delivery." });
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
          ? "This match has no live innings to score."
          : undefined}
      />
      {!request.isLoading && !request.error && snapshot && innings && (
        <>
          <MatchInformation fields={[
            { label: "Current score", value: state?.promx_currentruns?.toString() ?? "Not available" },
            { label: "Wickets", value: state?.promx_currentwickets?.toString() ?? "Not available" },
            { label: "Overs", value: state?.promx_currentovers?.toString() ?? "Not available" },
            { label: "Current batter", value: playerName(state?.promx_currentstriker) },
            { label: "Non-striker", value: playerName(state?.promx_currentnonstriker) },
            { label: "Current bowler", value: playerName(state?.promx_currentbowler) },
            ...(innings.promx_inningsnumber >= 2 ? [{ label: "Target", value: target?.toString() ?? "Not available" }] : []),
          ]} />
          {feedback && (
            <MessageBar intent={feedback.intent}>
              <MessageBarBody>{feedback.message}</MessageBarBody>
            </MessageBar>
          )}
          <ScoringControls disabled={isSubmitting} onSubmit={(input) => void submit(input)} />
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
