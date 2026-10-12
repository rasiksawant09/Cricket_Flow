import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Spinner,
  Textarea,
} from "@fluentui/react-components";
import { useCallback, useState } from "react";
import type { FormEvent } from "react";
import { useParams } from "react-router-dom";
import { EventLineageGrid } from "../../components/matches/EventLineageGrid";
import { TournamentPage } from "../../components/tournaments/TournamentPage";
import { TournamentRequestState } from "../../components/tournaments/TournamentRequestState";
import { useAsyncResult } from "../../hooks/useAsyncResult";
import { useMatchContext } from "../../hooks/useMatchContext";
import { useScoringContext } from "../../hooks/useScoringContext";
import { selectEffectiveEvents } from "../../services/implementations/MatchStateReducer";
import type { CricketBallEvent } from "../../models/CricketBallEvent";

type ActionMode = "reverse" | "correct" | null;

interface OverSummaryScreenProps {
  embedded?: boolean;
}

export function OverSummaryScreen({ embedded = false }: OverSummaryScreenProps) {
  const { id } = useParams<{ id: string }>();
  const { currentMatch, loadMatch } = useMatchContext();
  const { loadMatchEvents, reverseBall, correctBall } = useScoringContext();
  const [refreshToken, setRefreshToken] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<CricketBallEvent | null>(null);
  const [mode, setMode] = useState<ActionMode>(null);
  const [reason, setReason] = useState("");
  const [batterRuns, setBatterRuns] = useState("");
  const [extraRuns, setExtraRuns] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<Error | null>(null);
  const load = useCallback(async () => {
    if (!id) return { success: false as const, error: new Error("A match ID is required.") };
    const matchResult = await loadMatch(id);
    if (!matchResult.success) return matchResult;
    return loadMatchEvents(id);
  }, [id, loadMatch, loadMatchEvents]);
  const request = useAsyncResult(load, Boolean(id), refreshToken);
  const events = request.data ?? [];
  const match = currentMatch?.promx_cricketmatchid === id ? currentMatch : null;
  const effectiveIds = new Set(selectEffectiveEvents(events).flatMap((event) =>
    event.promx_cricketballeventid ? [event.promx_cricketballeventid] : [],
  ));

  function openAction(event: CricketBallEvent, action: Exclude<ActionMode, null>) {
    setSelectedEvent(event);
    setMode(action);
    setReason("");
    setBatterRuns(String(event.promx_batterruns ?? 0));
    setExtraRuns(String(event.promx_extraruns ?? 0));
    setActionError(null);
  }

  function closeAction() {
    if (saving) return;
    setSelectedEvent(null);
    setMode(null);
    setActionError(null);
  }

  async function submitAction(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (!selectedEvent || !reason.trim()) return;
    setSaving(true);
    setActionError(null);
    try {
      const result = mode === "reverse"
        ? await reverseBall(selectedEvent, reason)
        : await correctBall(selectedEvent, {
          ...selectedEvent,
          promx_parentballevent: selectedEvent.promx_parentballevent ?? selectedEvent.promx_cricketballeventid,
          promx_correctionreason: reason,
          promx_batterruns: Number(batterRuns),
          promx_extraruns: Number(extraRuns),
          statuscode: 796280002,
        });
      if (!result.success) {
        setActionError(result.error);
        return;
      }
      setSelectedEvent(null);
      setMode(null);
    } catch (error) {
      setActionError(error instanceof Error ? error : new Error("Could not amend Ball Event."));
    } finally {
      setRefreshToken((current) => current + 1);
      setSaving(false);
    }
  }

  return (
    <TournamentPage embedded={embedded} title={match?.promx_matchname ?? "Over Summary"} description="Ball Event history and correction lineage">
      <TournamentRequestState isLoading={request.isLoading} error={request.error} loadingLabel="Loading Ball Event history"
        emptyMessage={!request.isLoading && !request.error && events.length === 0 ? "No Ball Events are recorded for this match." : undefined} />
      {actionError && <MessageBar intent="error"><MessageBarBody>{actionError.message}</MessageBarBody></MessageBar>}
      {!request.isLoading && !request.error && events.length > 0 && (
        <EventLineageGrid
          events={events}
          effectiveIds={effectiveIds}
          onReverse={(event) => openAction(event, "reverse")}
          onCorrect={(event) => openAction(event, "correct")}
        />
      )}
      <Dialog open={mode !== null} onOpenChange={(_, data) => !data.open && closeAction()}>
        <DialogSurface>
          <form onSubmit={(event) => void submitAction(event)}>
            <DialogBody>
              <DialogTitle>{mode === "reverse" ? "Reverse Ball Event" : "Correct Ball Event"}</DialogTitle>
              <DialogContent style={{ display: "grid", gap: "12px" }}>
                {actionError && <MessageBar intent="error"><MessageBarBody>{actionError.message}</MessageBarBody></MessageBar>}
                {mode === "correct" && (
                  <>
                    <Field label="Batter runs" required>
                      <Input type="number" min="0" step="1" required value={batterRuns} onChange={(_, data) => setBatterRuns(data.value)} />
                    </Field>
                    <Field label="Extra runs" required>
                      <Input type="number" min="0" step="1" required value={extraRuns} onChange={(_, data) => setExtraRuns(data.value)} />
                    </Field>
                  </>
                )}
                <Field label="Reason" required>
                  <Textarea value={reason} onChange={(_, data) => setReason(data.value)} required maxLength={850} />
                </Field>
              </DialogContent>
              <DialogActions>
                <DialogTrigger disableButtonEnhancement><Button appearance="secondary" disabled={saving} onClick={closeAction}>Cancel</Button></DialogTrigger>
                <Button appearance="primary" type="submit" disabled={saving || !reason.trim()}>
                  {saving ? <Spinner size="tiny" label="Saving Ball Event amendment" /> : mode === "reverse" ? "Append Reversal" : "Append Correction"}
                </Button>
              </DialogActions>
            </DialogBody>
          </form>
        </DialogSurface>
      </Dialog>
    </TournamentPage>
  );
}
