import {
  Button,
  Dropdown,
  Field,
  MessageBar,
  MessageBarBody,
  Option,
  Radio,
  RadioGroup,
  Spinner,
} from "@fluentui/react-components";
import type { FormEvent } from "react";
import { useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import { MatchInformation } from "../../components/matches/MatchInformation";
import { TournamentPage } from "../../components/tournaments/TournamentPage";
import { TournamentRequestState } from "../../components/tournaments/TournamentRequestState";
import { useMatchContext } from "../../hooks/useMatchContext";
import { useTournamentContext } from "../../hooks/useTournamentContext";
import { useTournamentRequest } from "../../hooks/useTournamentRequest";
import type { CricketMatch } from "../../models/CricketMatch";

interface TossTeamOption {
  id: string;
  label: string;
}

function tossDecisionLabel(value: CricketMatch["promx_tossdecision"]): string {
  switch (value) {
    case 796280000:
      return "Bat";
    case 796280001:
      return "Bowl";
    default:
      return "Not recorded";
  }
}

function tossWinnerLabel(match: CricketMatch, teams: readonly TossTeamOption[]): string {
  if (!match.promx_tosswinner) {
    return "Not recorded";
  }
  return teams.find((team) => team.id === match.promx_tosswinner)?.label
    ?? (match.promx_tosswinner === match.promx_teama ? "Team A" : "Team B");
}

interface TossFormProps {
  match: CricketMatch;
  teams: readonly TossTeamOption[];
}

function TossForm({ match, teams }: TossFormProps) {
  const { recordToss, updateToss } = useMatchContext();
  const [winnerId, setWinnerId] = useState(match.promx_tosswinner ?? "");
  const [decision, setDecision] = useState<NonNullable<CricketMatch["promx_tossdecision"]> | null>(
    match.promx_tossdecision ?? null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!winnerId || decision === null) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      const hasToss = match.promx_tosswinner !== undefined
        && match.promx_tosswinner !== null;
      const result = hasToss
        ? await updateToss(match.promx_cricketmatchid ?? "", winnerId, decision)
        : await recordToss(match.promx_cricketmatchid ?? "", winnerId, decision);
      if (result.success) {
        setSaved(true);
      } else {
        setError(result.error);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError : new Error("Could not save toss details."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <Field label="Toss Winner" required>
        <Dropdown
          aria-label="Toss winner"
          placeholder="Select toss winner"
          value={teams.find((team) => team.id === winnerId)?.label ?? ""}
          selectedOptions={winnerId ? [winnerId] : []}
          onOptionSelect={(_, data) => setWinnerId(data.optionValue ?? "")}
        >
          {teams.map((team) => <Option key={team.id} value={team.id}>{team.label}</Option>)}
        </Dropdown>
      </Field>
      <Field label="Toss Decision" required>
        <RadioGroup
          value={decision === 796280000 ? "bat" : decision === 796280001 ? "bowl" : ""}
          onChange={(_, data) => {
            if (data.value === "bat") setDecision(796280000);
            if (data.value === "bowl") setDecision(796280001);
          }}
        >
          <Radio value="bat" label="Bat" />
          <Radio value="bowl" label="Bowl" />
        </RadioGroup>
      </Field>
      {error && (
        <MessageBar intent="error">
          <MessageBarBody>{error.message}</MessageBarBody>
        </MessageBar>
      )}
      {saved && (
        <MessageBar intent="success">
          <MessageBarBody>Toss details saved.</MessageBarBody>
        </MessageBar>
      )}
      <Button appearance="primary" type="submit" disabled={isSaving || !winnerId || decision === null}>
        {isSaving ? <Spinner label="Saving toss details" size="tiny" /> : "Save Toss"}
      </Button>
    </form>
  );
}

export function TossScreen() {
  const { id } = useParams<{ id: string }>();
  const { currentMatch, loadMatch } = useMatchContext();
  const { tournamentTeams, loadTournamentTeams } = useTournamentContext();
  const load = useCallback(async () => {
    if (!id) {
      return { success: false as const, error: new Error("A match ID is required.") };
    }

    const matchResult = await loadMatch(id);
    if (!matchResult.success) {
      return matchResult;
    }
    const teamsResult = await loadTournamentTeams(matchResult.data.promx_tournament);
    if (!teamsResult.success) {
      return { success: false as const, error: teamsResult.error };
    }
    return matchResult;
  }, [id, loadMatch, loadTournamentTeams]);
  const request = useTournamentRequest(load);
  const match = currentMatch?.promx_cricketmatchid === id ? currentMatch : null;
  const registeredTeams = match
    ? tournamentTeams.filter((team) => team.promx_tournament === match.promx_tournament)
    : [];
  const teams: TossTeamOption[] = match
    ? [match.promx_teama, match.promx_teamb].map((teamId, index) => ({
      id: teamId,
      label: registeredTeams.find((team) => team.promx_crickettournamentteamid === teamId)?.promx_tournamentteamname
        ?? `Team ${index === 0 ? "A" : "B"}`,
    }))
    : [];
  const teamsResolved = teams.length === 2 && teams.every((team) =>
    registeredTeams.some((registeredTeam) => registeredTeam.promx_crickettournamentteamid === team.id),
  );

  return (
    <TournamentPage title="Toss">
      <TournamentRequestState
        isLoading={request.isLoading}
        error={request.error}
        loadingLabel="Loading toss details"
      />
      {!request.isLoading && !request.error && match && (
        <>
          <MatchInformation fields={[
            { label: "Current Toss Winner", value: tossWinnerLabel(match, teams) },
            { label: "Current Toss Decision", value: tossDecisionLabel(match.promx_tossdecision) },
          ]} />
          {!teamsResolved ? (
            <TournamentRequestState
              isLoading={false}
              error={null}
              emptyMessage="Toss choices are unavailable because this match's team registrations could not be resolved."
            />
          ) : (
            <TossForm key={id} match={match} teams={teams} />
          )}
        </>
      )}
    </TournamentPage>
  );
}
