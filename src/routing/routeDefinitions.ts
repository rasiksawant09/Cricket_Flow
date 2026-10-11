import { createElement } from "react";
import { createBrowserRouter } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import { AppShell } from "../app/AppShell";
import { AdministrationScreen } from "../pages/AdministrationScreen";
import { HomeScreen } from "../pages/HomeScreen";
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
import { BattingStatisticsScreen } from "../pages/statistics/BattingStatisticsScreen";
import { BowlingStatisticsScreen } from "../pages/statistics/BowlingStatisticsScreen";
import { TournamentLeaderboardsScreen } from "../pages/tournaments/TournamentLeaderboardsScreen";
import { TournamentStandingsScreen } from "../pages/tournaments/TournamentStandingsScreen";
import { TournamentRulesScreen } from "../pages/tournaments/TournamentRulesScreen";
import { OverSummaryScreen } from "../pages/matches/OverSummaryScreen";
import { ScorecardScreen } from "../pages/matches/ScorecardScreen";
import { StatisticsScreen } from "../pages/statistics/StatisticsScreen";
import { AuctionImportScreen } from "../pages/auction/AuctionImportScreen";
import { MoreScreen } from "../pages/more/MoreScreen";
import { ROUTE_PATHS } from "./routeConstants";

export const routeDefinitions: RouteObject[] = [
  {
    id: "app-shell",
    path: ROUTE_PATHS.home,
    element: createElement(AppShell),
    children: [
      { id: "home", index: true, element: createElement(HomeScreen) },
      { id: "tournament-list", path: "tournaments", element: createElement(TournamentListScreen) },
      { id: "tournament-detail", path: "tournaments/:id", element: createElement(TournamentDetailScreen) },
      { id: "tournament-teams", path: "tournaments/:id/teams", element: createElement(TournamentTeamsScreen) },
      { id: "tournament-players", path: "tournaments/:id/players", element: createElement(TournamentPlayersScreen) },
      { id: "tournament-rules", path: "tournaments/:id/rules", element: createElement(TournamentRulesScreen) },
      { id: "match-list", path: "matches", element: createElement(MatchListScreen) },
      { id: "match-detail", path: "matches/:id", element: createElement(MatchDetailScreen) },
      { id: "match-setup", path: "matches/:id/setup", element: createElement(MatchSetupScreen) },
      { id: "playing-xi", path: "matches/:id/playing-xi", element: createElement(PlayingXIScreen) },
      { id: "toss", path: "matches/:id/toss", element: createElement(TossScreen) },
      { id: "over-summary", path: "matches/:id/overs", element: createElement(OverSummaryScreen) },
      { id: "scorecard", path: "matches/:id/scorecard", element: createElement(ScorecardScreen) },
      { id: "live-scoring", path: "scoring/:id", element: createElement(LiveScoringScreen) },
      { id: "statistics", path: "statistics", element: createElement(StatisticsScreen) },
      { id: "batting-statistics", path: "statistics/batting", element: createElement(BattingStatisticsScreen) },
      { id: "bowling-statistics", path: "statistics/bowling", element: createElement(BowlingStatisticsScreen) },
      { id: "tournament-leaderboards", path: "statistics/leaderboards", element: createElement(TournamentLeaderboardsScreen) },
      { id: "standings", path: "standings", element: createElement(TournamentStandingsScreen) },
      { id: "administration", path: "admin", element: createElement(AdministrationScreen) },
      { id: "auction-import", path: "auction-import", element: createElement(AuctionImportScreen) },
      { id: "more", path: "more", element: createElement(MoreScreen) },
    ],
  },
];

const powerAppsAppBasePath = window.location.pathname.match(/^\/play\/e\/[^/]+\/app\/[^/]+/i)?.[0] ?? "/";

export const appRouter = createBrowserRouter(routeDefinitions, {
  basename: powerAppsAppBasePath,
});
