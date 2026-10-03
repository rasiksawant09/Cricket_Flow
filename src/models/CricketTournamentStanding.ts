import type { DataverseRecord } from "./DataverseRecord";

export interface CricketTournamentStanding extends DataverseRecord<1 | 2> {
  promx_crickettournamentstandingid?: string | null;
  promx_tournament: string;
  promx_tournamentteam: string;
  promx_matcheslost?: number | null;
  promx_matchesplayed?: number | null;
  promx_matchestied?: number | null;
  promx_matcheswon?: number | null;
  promx_netrunrate?: number | null;
  promx_noresult?: number | null;
  promx_oversbowled?: number | null;
  promx_oversfaced?: number | null;
  promx_points?: number | null;
  promx_runsconceded?: number | null;
  promx_runsscored?: number | null;
  promx_standingname: string;
}
