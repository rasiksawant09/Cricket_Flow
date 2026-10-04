import { createElement } from "react";
import { createBrowserRouter } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import { TournamentDetailScreen } from "../pages/tournaments/TournamentDetailScreen";
import { TournamentListScreen } from "../pages/tournaments/TournamentListScreen";
import { TournamentPlayersScreen } from "../pages/tournaments/TournamentPlayersScreen";
import { TournamentTeamsScreen } from "../pages/tournaments/TournamentTeamsScreen";
import { MatchDetailScreen } from "../pages/matches/MatchDetailScreen";
import { MatchListScreen } from "../pages/matches/MatchListScreen";
import { MatchSetupScreen } from "../pages/matches/MatchSetupScreen";
import { LiveScoringScreen } from "../pages/matches/LiveScoringScreen";
import { PlayingXIScreen } from "../pages/matches/PlayingXIScreen";
import { TossScreen } from "../pages/matches/TossScreen";
import { ROUTE_PATHS } from "./routeConstants";

export const routeDefinitions: RouteObject[] = [
  { id: "home", path: ROUTE_PATHS.home },
  { id: "tournament-list", path: ROUTE_PATHS.tournamentList, element: createElement(TournamentListScreen) },
  { id: "tournament-detail", path: ROUTE_PATHS.tournamentDetail, element: createElement(TournamentDetailScreen) },
  { id: "tournament-teams", path: ROUTE_PATHS.tournamentTeams, element: createElement(TournamentTeamsScreen) },
  { id: "tournament-players", path: ROUTE_PATHS.tournamentPlayers, element: createElement(TournamentPlayersScreen) },
  { id: "tournament-rules", path: ROUTE_PATHS.tournamentRules },
  { id: "match-list", path: ROUTE_PATHS.matchList, element: createElement(MatchListScreen) },
  { id: "match-detail", path: ROUTE_PATHS.matchDetail, element: createElement(MatchDetailScreen) },
  { id: "match-setup", path: ROUTE_PATHS.matchSetup, element: createElement(MatchSetupScreen) },
  { id: "playing-xi", path: ROUTE_PATHS.playingXI, element: createElement(PlayingXIScreen) },
  { id: "toss", path: ROUTE_PATHS.toss, element: createElement(TossScreen) },
  { id: "over-summary", path: ROUTE_PATHS.overSummary },
  { id: "scorecard", path: ROUTE_PATHS.scorecard },
  { id: "live-scoring", path: ROUTE_PATHS.liveScoring, element: createElement(LiveScoringScreen) },
  { id: "statistics", path: ROUTE_PATHS.statistics },
  { id: "batting-statistics", path: ROUTE_PATHS.battingStatistics },
  { id: "bowling-statistics", path: ROUTE_PATHS.bowlingStatistics },
  { id: "tournament-leaderboards", path: ROUTE_PATHS.tournamentLeaderboards },
  { id: "standings", path: ROUTE_PATHS.standings },
  { id: "administration", path: ROUTE_PATHS.administration },
];

export const appRouter = createBrowserRouter(routeDefinitions);
