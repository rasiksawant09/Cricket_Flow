import type { DataverseRecord } from "./DataverseRecord";

export interface CricketMatchPlayer extends DataverseRecord<1 | 2> {
  promx_cricketmatchplayerid?: string | null;
  promx_gendersnapshot?: 796280000 | 796280001 | 796280002 | null;
  promx_iscaptain?: boolean | null;
  promx_isplaying?: boolean | null;
  promx_iswicketkeeper?: boolean | null;
  promx_jerseynumbersnapshot?: number | null;
  promx_match: string;
  promx_matchplayername?: string | null;
  promx_playercategorysnapshot?: 796280000 | 796280001 | 796280002 | 796280003 | null;
  promx_playernamesnapshot: string;
  promx_teamsnapshot: string;
  promx_tournamentplayer: string;
}
