import { Tab, TabList } from "@fluentui/react-components";
import { useCallback } from "react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { TournamentPage } from "../../components/tournaments/TournamentPage";
import { TournamentRequestState } from "../../components/tournaments/TournamentRequestState";
import { TournamentFormDialog } from "../../components/tournaments/TournamentFormDialog";
import { useTournamentContext } from "../../hooks/useTournamentContext";
import { useTournamentRequest } from "../../hooks/useTournamentRequest";
import { TournamentTeamsScreen } from "./TournamentTeamsScreen";
import { TournamentPlayersScreen } from "./TournamentPlayersScreen";
import { TournamentRulesScreen } from "./TournamentRulesScreen";
import { TournamentStandingsScreen } from "./TournamentStandingsScreen";
import { TournamentLeaderboardsScreen } from "./TournamentLeaderboardsScreen";
import { formatTournamentDate, tournamentStatusLabel } from "./tournamentFormatting";

type TournamentDetailTab = "teams" | "players" | "rules" | "standings" | "leaderboards";

export function TournamentDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const { currentTournament, loadTournament, updateTournament, setTournamentStatus } = useTournamentContext();
  const [selectedTab, setSelectedTab] = useState<{ tournamentId?: string; value: TournamentDetailTab }>({ tournamentId: id, value: "teams" });
  const load = useCallback(
    () => id ? loadTournament(id) : Promise.resolve({ success: false as const, error: new Error("A tournament ID is required.") }),
    [id, loadTournament],
  );
  const request = useTournamentRequest(load);
  const tournament = currentTournament?.promx_crickettournamentid === id ? currentTournament : null;
  const activeTab = selectedTab.tournamentId === id ? selectedTab.value : "teams";

  return (
    <TournamentPage title="Tournament">
      <TournamentRequestState isLoading={request.isLoading} error={request.error} />
      {!request.isLoading && !request.error && tournament && (
        <>
          <section className="tournament-detail-hero" aria-label="Tournament overview">
            <div className="tournament-detail-copy">
              <span className="tournament-detail-status">{tournamentStatusLabel(tournament)}</span>
              <h2>{tournament.promx_tournamentname}</h2>
              {tournament.promx_description && <p>{tournament.promx_description}</p>}
              <div className="tournament-detail-facts">
                <div><span>DATES</span><strong>{`${formatTournamentDate(tournament.promx_startdate)} — ${formatTournamentDate(tournament.promx_enddate)}`}</strong></div>
                <div><span>OVERS PER INNINGS</span><strong>{tournament.promx_oversperinnings}</strong></div>
                <div><span>PLAYERS PER TEAM</span><strong>{tournament.promx_playersperteam}</strong></div>
              </div>
            </div>
            {id && (
              <div className="tournament-detail-edit">
              <TournamentFormDialog
                key={tournament.promx_crickettournamentid}
                initial={tournament}
                triggerLabel="Edit Tournament"
                onSave={updateTournament}
                onStatusChange={setTournamentStatus}
              />
              </div>
            )}
          </section>
          {id && (
            <section className="tournament-detail-sections" aria-label="Tournament sections">
              <TabList
                className="tournament-detail-tabs"
                selectedValue={activeTab}
                onTabSelect={(_, data) => setSelectedTab({ tournamentId: id, value: data.value as TournamentDetailTab })}
                aria-label="Tournament views"
              >
                <Tab value="teams">Teams</Tab>
                <Tab value="players">Players</Tab>
                <Tab value="rules">Rules</Tab>
                <Tab value="standings">Standings</Tab>
                <Tab value="leaderboards">Leaderboards</Tab>
              </TabList>
              <div className="tournament-detail-tab-panel" role="tabpanel">
                {activeTab === "teams" && <TournamentTeamsScreen tournamentId={id} embedded />}
                {activeTab === "players" && <TournamentPlayersScreen tournamentId={id} embedded />}
                {activeTab === "rules" && <TournamentRulesScreen tournamentId={id} embedded />}
                {activeTab === "standings" && <TournamentStandingsScreen tournamentId={id} embedded />}
                {activeTab === "leaderboards" && <TournamentLeaderboardsScreen tournamentId={id} embedded />}
              </div>
            </section>
          )}
        </>
      )}
    </TournamentPage>
  );
}
