import type { DataverseRecord } from "./DataverseRecord";

export interface CricketTournamentPlayer extends DataverseRecord<1 | 2> {
  promx_age?: number | null;
  promx_crickettournamentplayerid?: string | null;
  promx_iscaptain?: boolean | null;
  promx_isvicecaptain?: boolean | null;
  promx_jerseynumber?: number | null;
  promx_player: string;
  promx_playercategory?: 796280000 | 796280001 | 796280002 | 796280003 | null;
  promx_tournament: string;
  promx_tournamentplayername: string;
  promx_tournamentteam: string;
}
