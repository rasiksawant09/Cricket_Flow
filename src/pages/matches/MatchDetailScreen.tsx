import { Button, Tab, TabList } from "@fluentui/react-components";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MatchInformation } from "../../components/matches/MatchInformation";
import { TournamentPage } from "../../components/tournaments/TournamentPage";
import { TournamentRequestState } from "../../components/tournaments/TournamentRequestState";
import { useMatchRecord } from "../../hooks/useMatchRecord";
import { ArrowLeft24Regular, Board24Regular, ClipboardTask24Regular, PeopleTeam24Regular, Sport24Regular } from "@fluentui/react-icons";
import { ROUTE_PATHS, routeFor } from "../../routing/routeConstants";
import { MatchSetupScreen } from "./MatchSetupScreen";
import { OverSummaryScreen } from "./OverSummaryScreen";
import { ScorecardScreen } from "./ScorecardScreen";
import {
  formatScheduledDate,
  matchStageLabel,
  matchStatusLabel,
  resultStatusLabel,
  tossStatusLabel,
} from "./matchFormatting";

const PRE_MATCH_STATUSES = new Set([1, 796280001]);
const LIVE_MATCH_STATUSES = new Set([796280002, 796280003, 796280004, 796280005]);
const STOPPED_MATCH_STATUSES = new Set([796280006, 796280007, 796280008]);
type MatchDetailTab = "scorecard" | "setup" | "overs";

export function MatchDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { request, match, tournament, teamNames } = useMatchRecord(id);
  const [selectedTab, setSelectedTab] = useState<{ matchId?: string; value: MatchDetailTab }>({ matchId: id, value: "scorecard" });
  const activeTab = selectedTab.matchId === id ? selectedTab.value : "scorecard";
  const isCompleted = match?.statuscode === 2;
  const isLive = match?.statuscode != null && LIVE_MATCH_STATUSES.has(match.statuscode);
  const canEditPreMatch = match?.statuscode != null && PRE_MATCH_STATUSES.has(match.statuscode);
  const isStopped = match?.statuscode != null && STOPPED_MATCH_STATUSES.has(match.statuscode);
  const statusClass = isLive ? "match-status-live" : isCompleted ? "match-status-completed" : isStopped ? "match-status-stopped" : "match-status-upcoming";
  const resultText = match
    ? isCompleted ? resultStatusLabel(match, teamNames) : isLive ? "Live match in progress" : isStopped ? matchStatusLabel(match) : "Fixture details and setup"
    : "";

  return (
    <TournamentPage title={match?.promx_matchname ?? `Match ${match?.promx_matchnumber ?? "details"}`} description={tournament?.promx_tournamentname}>
      <TournamentRequestState
        isLoading={request.isLoading}
        error={request.error}
        loadingLabel="Loading match details"
      />
      {!request.isLoading && !request.error && match && (
        <>
          <div className="match-detail-top-actions">
            <Button appearance="subtle" icon={<ArrowLeft24Regular />} onClick={() => navigate(ROUTE_PATHS.matchList)}>All matches</Button>
          </div>
          <section className="match-detail-hero" aria-label="Match overview">
            <header className="match-detail-hero-header">
              <div>
                <span className="match-detail-eyebrow">{`${matchStageLabel(match.promx_matchstage)} · Match ${match.promx_matchnumber ?? "—"}`}</span>
                <span className={`match-status ${statusClass}`}><span />{matchStatusLabel(match)}</span>
              </div>
              <span className="match-detail-schedule">{formatScheduledDate(match.promx_scheduleddatetime)}</span>
            </header>
            <div className="match-detail-teams">
              <div className="match-detail-team">
                <span className="match-team-mark"><PeopleTeam24Regular /></span>
                <strong>{teamNames.get(match.promx_teama) ?? "Unknown team"}</strong>
                <small>Team A</small>
              </div>
              <span className="match-detail-versus">VS</span>
              <div className="match-detail-team match-detail-team-away">
                <span className="match-team-mark"><PeopleTeam24Regular /></span>
                <strong>{teamNames.get(match.promx_teamb) ?? "Unknown team"}</strong>
                <small>Team B</small>
              </div>
            </div>
            <div className="match-detail-result">
              <span>{isCompleted ? "FINAL RESULT" : isLive ? "MATCH STATUS" : "FIXTURE"}</span>
              <strong>{resultText}</strong>
            </div>
          </section>
          <section className="match-detail-meta" aria-label="Match details">
            <MatchInformation fields={[
              { label: "Tournament", value: tournament?.promx_tournamentname ?? "Unknown tournament" },
              { label: "Stage", value: matchStageLabel(match.promx_matchstage) },
              { label: "Scheduled", value: formatScheduledDate(match.promx_scheduleddatetime) },
              { label: "Toss", value: tossStatusLabel(match, teamNames) },
              ...(match.promx_remarks ? [{ label: "Remarks", value: match.promx_remarks }] : []),
            ]} />
          </section>
          {id && (
            <>
              <div className="match-detail-workspace">
                <TabList
                  className="match-detail-tabs"
                  selectedValue={activeTab}
                  onTabSelect={(_, data) => setSelectedTab({ matchId: id, value: data.value as MatchDetailTab })}
                  aria-label="Match views"
                >
                  <Tab value="scorecard" icon={<Board24Regular />}>Scorecard</Tab>
                  <Tab value="setup" icon={<ClipboardTask24Regular />}>Match Setup</Tab>
                  <Tab value="overs">Over Summary</Tab>
                </TabList>
                <div className="match-detail-tab-panel" role="tabpanel">
                  {activeTab === "scorecard" && <ScorecardScreen embedded />}
                  {activeTab === "setup" && <MatchSetupScreen embedded />}
                  {activeTab === "overs" && <OverSummaryScreen embedded />}
                </div>
              </div>
              <nav className="match-detail-actions" aria-label="Additional match actions">
                {isLive && <Button appearance="primary" icon={<Sport24Regular />} onClick={() => navigate(routeFor.liveScoring(id))}>Open live match center</Button>}
                {canEditPreMatch && <Button appearance="secondary" onClick={() => navigate(routeFor.playingXI(id))}>Playing XI</Button>}
                {canEditPreMatch && <Button appearance="secondary" onClick={() => navigate(routeFor.toss(id))}>Toss</Button>}
              </nav>
            </>
          )}
        </>
      )}
    </TournamentPage>
  );
}
