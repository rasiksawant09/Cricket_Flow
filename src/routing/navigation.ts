import { ROUTE_PATHS } from "./routeConstants";

export interface NavigationItem {
  id: string;
  label: string;
  to: string;
  children?: readonly NavigationItem[];
}

export const navigationItems: readonly NavigationItem[] = [
  { id: "home", label: "Home", to: ROUTE_PATHS.home },
  {
    id: "tournaments",
    label: "Tournaments",
    to: ROUTE_PATHS.tournamentList,
    children: [
      { id: "tournament-list", label: "Tournament List", to: ROUTE_PATHS.tournamentList },
      { id: "tournament-detail", label: "Tournament Detail", to: ROUTE_PATHS.tournamentDetail },
      { id: "tournament-teams", label: "Tournament Teams", to: ROUTE_PATHS.tournamentTeams },
      { id: "tournament-players", label: "Tournament Players", to: ROUTE_PATHS.tournamentPlayers },
      { id: "tournament-rules", label: "Tournament Rules", to: ROUTE_PATHS.tournamentRules },
      { id: "standings", label: "Tournament Standings", to: ROUTE_PATHS.standings },
    ],
  },
  {
    id: "matches",
    label: "Matches",
    to: ROUTE_PATHS.matchList,
    children: [
      { id: "match-list", label: "Match List", to: ROUTE_PATHS.matchList },
      { id: "match-detail", label: "Match Detail", to: ROUTE_PATHS.matchDetail },
      { id: "match-setup", label: "Match Setup", to: ROUTE_PATHS.matchSetup },
      { id: "playing-xi", label: "Playing XI", to: ROUTE_PATHS.playingXI },
      { id: "toss", label: "Toss", to: ROUTE_PATHS.toss },
      { id: "over-summary", label: "Over Summary", to: ROUTE_PATHS.overSummary },
      { id: "scorecard", label: "Scorecard", to: ROUTE_PATHS.scorecard },
    ],
  },
  { id: "live-scoring", label: "Live Scoring", to: ROUTE_PATHS.liveScoring },
  {
    id: "statistics",
    label: "Statistics",
    to: ROUTE_PATHS.statistics,
    children: [
      { id: "batting-statistics", label: "Batting Statistics", to: ROUTE_PATHS.battingStatistics },
      { id: "bowling-statistics", label: "Bowling Statistics", to: ROUTE_PATHS.bowlingStatistics },
      { id: "tournament-leaderboards", label: "Tournament Leaderboards", to: ROUTE_PATHS.tournamentLeaderboards },
    ],
  },
  { id: "administration", label: "Administration", to: ROUTE_PATHS.administration },
];
