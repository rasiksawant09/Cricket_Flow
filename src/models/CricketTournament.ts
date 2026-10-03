import type { DataverseRecord } from "./DataverseRecord";

export interface CricketTournament extends DataverseRecord<1 | 2 | 796280001 | 796280002> {
  promx_crickettournamentid?: string | null;
  promx_auctionintegrationenabled?: boolean | null;
  promx_description?: string | null;
  promx_enddate?: string | null;
  promx_oversperinnings: number;
  promx_playersperteam: number;
  promx_pointsforloss?: number | null;
  promx_pointsfortie?: number | null;
  promx_pointsforwin?: number | null;
  promx_startdate?: string | null;
  promx_tournamentname: string;
}
