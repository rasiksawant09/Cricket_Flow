export const ROUTE_PATHS = {
  home: "/",
  tournamentList: "/tournaments",
  tournamentDetail: "/tournaments/:id",
  tournamentTeams: "/tournaments/:id/teams",
  tournamentPlayers: "/tournaments/:id/players",
  tournamentRules: "/tournaments/:id/rules",
  matchList: "/matches",
  matchDetail: "/matches/:id",
  matchSetup: "/matches/:id/setup",
  playingXI: "/matches/:id/playing-xi",
  toss: "/matches/:id/toss",
  overSummary: "/matches/:id/overs",
  scorecard: "/matches/:id/scorecard",
  liveScoring: "/scoring/:id",
  battingStatistics: "/statistics/batting",
  bowlingStatistics: "/statistics/bowling",
  tournamentLeaderboards: "/statistics/leaderboards",
  statistics: "/statistics",
  standings: "/standings",
  administration: "/admin",
} as const;

function encodePathSegment(value: string): string {
  return encodeURIComponent(value);
}

export const routeFor = {
  tournamentDetail: (tournamentId: string) => `/tournaments/${encodePathSegment(tournamentId)}`,
  tournamentTeams: (tournamentId: string) => `/tournaments/${encodePathSegment(tournamentId)}/teams`,
  tournamentPlayers: (tournamentId: string) => `/tournaments/${encodePathSegment(tournamentId)}/players`,
  tournamentRules: (tournamentId: string) => `/tournaments/${encodePathSegment(tournamentId)}/rules`,
  matchDetail: (matchId: string) => `/matches/${encodePathSegment(matchId)}`,
  matchSetup: (matchId: string) => `/matches/${encodePathSegment(matchId)}/setup`,
  playingXI: (matchId: string) => `/matches/${encodePathSegment(matchId)}/playing-xi`,
  toss: (matchId: string) => `/matches/${encodePathSegment(matchId)}/toss`,
  overSummary: (matchId: string) => `/matches/${encodePathSegment(matchId)}/overs`,
  scorecard: (matchId: string) => `/matches/${encodePathSegment(matchId)}/scorecard`,
  liveScoring: (matchId: string) => `/scoring/${encodePathSegment(matchId)}`,
} as const;
