import { Button } from "@fluentui/react-components";
import { useNavigate, useParams } from "react-router-dom";
import { MatchInformation } from "../../components/matches/MatchInformation";
import { TournamentPage } from "../../components/tournaments/TournamentPage";
import { TournamentRequestState } from "../../components/tournaments/TournamentRequestState";
import { useMatchRecord } from "../../hooks/useMatchRecord";
import { routeFor } from "../../routing/routeConstants";
import {
  formatScheduledDate,
  matchStageLabel,
  matchStatusLabel,
  resultStatusLabel,
  tossStatusLabel,
} from "./matchFormatting";

export function MatchDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { request, match, tournament, teamNames } = useMatchRecord(id);

  return (
    <TournamentPage title={match?.promx_matchname ?? `Match ${match?.promx_matchnumber ?? "details"}`}>
      <TournamentRequestState
        isLoading={request.isLoading}
        error={request.error}
        loadingLabel="Loading match details"
      />
      {!request.isLoading && !request.error && match && (
        <>
          <MatchInformation fields={[
            { label: "Match number", value: match.promx_matchnumber?.toString() ?? "Not set" },
            { label: "Tournament", value: tournament?.promx_tournamentname ?? "Unknown tournament" },
            { label: "Stage", value: matchStageLabel(match.promx_matchstage) },
            { label: "Scheduled date", value: formatScheduledDate(match.promx_scheduleddatetime) },
            { label: "Team A", value: teamNames.get(match.promx_teama) ?? "Unknown team" },
            { label: "Team B", value: teamNames.get(match.promx_teamb) ?? "Unknown team" },
            { label: "Status", value: matchStatusLabel(match) },
            { label: "Toss status", value: tossStatusLabel(match, teamNames) },
            { label: "Result status", value: resultStatusLabel(match, teamNames) },
            { label: "Remarks", value: match.promx_remarks || "None" },
          ]} />
          {id && (
            <nav aria-label="Match sections">
              <Button appearance="secondary" onClick={() => navigate(routeFor.matchSetup(id))}>Match setup</Button>
              <Button appearance="secondary" onClick={() => navigate(routeFor.toss(id))}>Toss</Button>
            </nav>
          )}
        </>
      )}
    </TournamentPage>
  );
}
