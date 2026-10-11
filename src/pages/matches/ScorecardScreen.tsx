import { createTableColumn } from "@fluentui/react-components";
import type { TableColumnDefinition } from "@fluentui/react-components";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { MatchInformation } from "../../components/matches/MatchInformation";
import { SortableDataGrid } from "../../components/statistics/SortableDataGrid";
import { textColumn } from "../../components/statistics/tableColumns";
import { TournamentPage } from "../../components/tournaments/TournamentPage";
import { TournamentRequestState } from "../../components/tournaments/TournamentRequestState";
import { useMatchContext } from "../../hooks/useMatchContext";
import { useScoringContext } from "../../hooks/useScoringContext";
import { useTournamentContext } from "../../hooks/useTournamentContext";
import type { CricketInnings } from "../../models/CricketInnings";
import type { CricketMatch } from "../../models/CricketMatch";
import type { CricketMatchPlayer } from "../../models/CricketMatchPlayer";
import type { CricketMatchState } from "../../models/CricketMatchState";
import type { CricketTournamentTeam } from "../../models/CricketTournamentTeam";
import type { InningsScorecardStatistics } from "../../services/interfaces/IStatisticsService";

type BatterRow = InningsScorecardStatistics["batting"][number];
type BowlerRow = InningsScorecardStatistics["bowling"][number];

interface ScorecardData {
  match: CricketMatch;
  innings: CricketInnings[];
  states: CricketMatchState[];
  players: CricketMatchPlayer[];
  teams: CricketTournamentTeam[];
  scorecards: InningsScorecardStatistics[];
}

const LIVE_STATUSES = new Set([796280002, 796280003, 796280004, 796280005]);

export function ScorecardScreen() {
  const { id } = useParams<{ id: string }>();
  const { loadMatch, loadPlayingXI, loadInningsScorecard } = useMatchContext();
  const { loadMatchInnings, loadMatchStates } = useScoringContext();
  const { loadTournamentTeams } = useTournamentContext();
  const [data, setData] = useState<ScorecardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadScorecard = useCallback(async (): Promise<Result<ScorecardData>> => {
    if (!id) {
      return { success: false, error: new Error("A match ID is required.") };
    }
    const matchResult = await loadMatch(id);
    if (!matchResult.success) return matchResult;

    const [inningsResult, statesResult, playersResult, teamsResult, scorecardsResult] = await Promise.all([
      loadMatchInnings(id),
      loadMatchStates(id),
      loadPlayingXI(id),
      loadTournamentTeams(matchResult.data.promx_tournament),
      loadInningsScorecard(id),
    ]);
    if (!inningsResult.success) return inningsResult;
    if (!statesResult.success) return statesResult;
    if (!playersResult.success) return playersResult;
    if (!teamsResult.success) return teamsResult;
    if (!scorecardsResult.success) return scorecardsResult;

    return {
      success: true,
      data: {
        match: matchResult.data,
        innings: inningsResult.data,
        states: statesResult.data,
        players: playersResult.data,
        teams: teamsResult.data,
        scorecards: scorecardsResult.data,
      },
    };
  }, [id, loadMatch, loadMatchInnings, loadMatchStates, loadPlayingXI, loadTournamentTeams, loadInningsScorecard]);

  const refreshScorecard = useCallback(async () => {
    try {
      const result = await loadScorecard();
      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError : new Error("Could not load scorecard."));
    } finally {
      setIsLoading(false);
    }
  }, [loadScorecard]);

  useEffect(() => {
    let active = true;
    async function loadInitialScorecard() {
      try {
        const result = await loadScorecard();
        if (!active) return;
        if (result.success) {
          setData(result.data);
          setError(null);
        } else {
          setError(result.error);
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError : new Error("Could not load scorecard."));
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void loadInitialScorecard();
    return () => { active = false; };
  }, [loadScorecard]);

  const matchStatus = data?.match.statuscode;
  useEffect(() => {
    if (!LIVE_STATUSES.has(matchStatus ?? 0)) return undefined;
    const interval = window.setInterval(() => void refreshScorecard(), 15000);
    return () => window.clearInterval(interval);
  }, [matchStatus, refreshScorecard]);

  const visibleData = data?.match.promx_cricketmatchid === id ? data : null;
  const waitingForMatch = isLoading || (Boolean(id) && !visibleData);
  const playerNames = new Map(visibleData?.players.flatMap((player) => player.promx_cricketmatchplayerid
    ? [[player.promx_cricketmatchplayerid, player.promx_playernamesnapshot] as const]
    : []) ?? []);
  const statesByInnings = new Map(visibleData?.states.map((state) => [state.promx_innings, state]) ?? []);
  const scorecardsByInnings = new Map(visibleData?.scorecards.map((scorecard) => [scorecard.inningsId, scorecard]) ?? []);
  const teamNames = new Map(visibleData?.teams.flatMap((team) => team.promx_crickettournamentteamid
    ? [[team.promx_crickettournamentteamid, team.promx_tournamentteamname] as const]
    : []) ?? []);

  const battingColumns: TableColumnDefinition<BatterRow>[] = [
    textColumn("player", "Batter", (batter) => playerNames.get(batter.playerId) ?? "Unknown player"),
    createTableColumn<BatterRow>({ columnId: "runs", compare: (a, b) => a.runs - b.runs, renderHeaderCell: () => "R", renderCell: (batter) => batter.runs }),
    createTableColumn<BatterRow>({ columnId: "balls", compare: (a, b) => a.ballsFaced - b.ballsFaced, renderHeaderCell: () => "B", renderCell: (batter) => batter.ballsFaced }),
    createTableColumn<BatterRow>({ columnId: "fours", compare: (a, b) => a.fours - b.fours, renderHeaderCell: () => "4s", renderCell: (batter) => batter.fours }),
    createTableColumn<BatterRow>({ columnId: "sixes", compare: (a, b) => a.sixes - b.sixes, renderHeaderCell: () => "6s", renderCell: (batter) => batter.sixes }),
    createTableColumn<BatterRow>({ columnId: "strikeRate", compare: (a, b) => a.strikeRate - b.strikeRate, renderHeaderCell: () => "S/R", renderCell: (batter) => batter.strikeRate.toFixed(2) }),
    textColumn("status", "Status", (batter) => batter.dismissed ? "Out" : "Not out"),
  ];
  const bowlingColumns: TableColumnDefinition<BowlerRow>[] = [
    textColumn("player", "Bowler", (bowler) => playerNames.get(bowler.playerId) ?? "Unknown player"),
    createTableColumn<BowlerRow>({ columnId: "overs", compare: (a, b) => a.overs - b.overs, renderHeaderCell: () => "O", renderCell: (bowler) => bowler.overs }),
    createTableColumn<BowlerRow>({ columnId: "maidens", compare: (a, b) => a.maidens - b.maidens, renderHeaderCell: () => "M", renderCell: (bowler) => bowler.maidens }),
    createTableColumn<BowlerRow>({ columnId: "runs", compare: (a, b) => a.runsConceded - b.runsConceded, renderHeaderCell: () => "R", renderCell: (bowler) => bowler.runsConceded }),
    createTableColumn<BowlerRow>({ columnId: "wickets", compare: (a, b) => a.wickets - b.wickets, renderHeaderCell: () => "W", renderCell: (bowler) => bowler.wickets }),
    createTableColumn<BowlerRow>({ columnId: "economy", compare: (a, b) => a.economy - b.economy, renderHeaderCell: () => "Econ", renderCell: (bowler) => bowler.economy.toFixed(2) }),
  ];

  return (
    <TournamentPage title={data?.match.promx_matchname ?? "Scorecard"}>
      <TournamentRequestState isLoading={waitingForMatch} error={error} loadingLabel="Loading scorecard" />
      {!waitingForMatch && !error && visibleData && visibleData.innings.length === 0 && <p>No innings have started for this match.</p>}
      {!waitingForMatch && !error && visibleData && visibleData.innings.length > 0 && (
        <>
          {visibleData.innings.slice().sort((a, b) => a.promx_inningsnumber - b.promx_inningsnumber).map((innings) => {
            const state = statesByInnings.get(innings.promx_cricketinningsid ?? "");
            const scorecard = scorecardsByInnings.get(innings.promx_cricketinningsid ?? "");
            const batters = scorecard?.batting ?? [];
            const bowlers = scorecard?.bowling ?? [];
            const teamName = teamNames.get(innings.promx_battingteam) ?? "Unknown team";
            const opponentName = teamNames.get(innings.promx_bowlingteam) ?? "Unknown team";
            const label = innings.promx_issuperover ? `Super Over ${innings.promx_inningsnumber}` : `${teamName} innings`;
            const scoreRuns = state?.promx_currentruns ?? innings.promx_runs ?? scorecard?.runs ?? 0;
            const scoreWickets = state?.promx_currentwickets ?? innings.promx_wickets ?? scorecard?.wickets ?? 0;
            const overs = state?.promx_currentovers ?? innings.promx_overs
              ?? Number(`${Math.floor((scorecard?.legalBalls ?? 0) / 6)}.${(scorecard?.legalBalls ?? 0) % 6}`);
            const wicketFalls = scorecard?.fallOfWickets.map((fall) => {
              const over = `${Math.floor(fall.legalBalls / 6)}.${fall.legalBalls % 6}`;
              const player = playerNames.get(fall.playerId ?? "") ?? "Batter";
              return `${fall.runs}/${fall.wickets} (${player}, ${over} ov)`;
            }) ?? [];
            return (
              <section key={innings.promx_cricketinningsid ?? innings.promx_inningsname}>
                <h2>{label}</h2>
                <MatchInformation fields={[
                  { label: "Batting", value: teamName },
                  { label: "Bowling", value: opponentName },
                  { label: "Score", value: `${scoreRuns}/${scoreWickets}` },
                  { label: "Overs", value: String(overs) },
                ]} />
                {batters.length > 0 && (
                  <div>
                    <h3>Batting</h3>
                    <SortableDataGrid ariaLabel={`${teamName} batting figures`} items={batters} columns={battingColumns}
                      getRowId={(batter) => batter.playerId}
                      defaultSortState={{ sortColumn: "runs", sortDirection: "descending" }} />
                  </div>
                )}
                {wicketFalls.length > 0 && (
                  <p>Fall of wickets: {wicketFalls.join(" · ")}</p>
                )}
                {bowlers.length > 0 && (
                  <div>
                    <h3>Bowling</h3>
                    <SortableDataGrid ariaLabel={`${opponentName} bowling figures`} items={bowlers} columns={bowlingColumns}
                      getRowId={(bowler) => bowler.playerId}
                      defaultSortState={{ sortColumn: "wickets", sortDirection: "descending" }} />
                  </div>
                )}
              </section>
            );
          })}
        </>
      )}
    </TournamentPage>
  );
}
