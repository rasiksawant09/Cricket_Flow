import { MessageBar, MessageBarBody } from "@fluentui/react-components";
import { useCallback } from "react";
import { useParams } from "react-router-dom";
import { useMatchContext } from "../../hooks/useMatchContext";
import { useMatchRecord } from "../../hooks/useMatchRecord";
import { useTournamentRequest } from "../../hooks/useTournamentRequest";
import { MatchInformation } from "../../components/matches/MatchInformation";
import { TournamentPage } from "../../components/tournaments/TournamentPage";
import { TournamentRequestState } from "../../components/tournaments/TournamentRequestState";
import { formatScheduledDate, matchStatusLabel } from "./matchFormatting";

export function MatchSetupScreen() {
  const { id } = useParams<{ id: string }>();
  const { validateMatchSetup } = useMatchContext();
  const { request, match, tournament, teamNames } = useMatchRecord(id);
  const validate = useCallback(
    () => match
      ? validateMatchSetup(match)
      : Promise.resolve({ success: false as const, error: new Error("Match data is not available for validation.") }),
    [match, validateMatchSetup],
  );
  const validation = useTournamentRequest(validate);

  return (
    <TournamentPage title={match?.promx_matchname ?? `Match ${match?.promx_matchnumber ?? "setup"} setup`}>
      <TournamentRequestState
        isLoading={request.isLoading}
        error={request.error}
        loadingLabel="Loading match setup"
      />
      {!request.isLoading && !request.error && match && (
        <>
          <MatchInformation fields={[
            { label: "Match number", value: match.promx_matchnumber?.toString() ?? "Not set" },
            { label: "Tournament", value: tournament?.promx_tournamentname ?? "Unknown tournament" },
            { label: "Team A", value: teamNames.get(match.promx_teama) ?? "Unknown team" },
            { label: "Team B", value: teamNames.get(match.promx_teamb) ?? "Unknown team" },
            { label: "Scheduled date", value: formatScheduledDate(match.promx_scheduleddatetime) },
            { label: "Status", value: matchStatusLabel(match) },
          ]} />
          {validation.isLoading ? (
            <TournamentRequestState isLoading error={null} loadingLabel="Validating match setup" />
          ) : validation.error ? (
            <TournamentRequestState isLoading={false} error={validation.error} />
          ) : (
            <MessageBar intent="success">
              <MessageBarBody>Match setup passed service validation.</MessageBarBody>
            </MessageBar>
          )}
        </>
      )}
    </TournamentPage>
  );
}
