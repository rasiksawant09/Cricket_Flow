import type { DataverseRecord } from "./DataverseRecord";

export interface CricketMatch extends DataverseRecord<1 | 2 | 796280001 | 796280002 | 796280003 | 796280004 | 796280005 | 796280006 | 796280007 | 796280008> {
  promx_cricketmatchid?: string | null;
  promx_loser?: string | null;
  promx_matchname?: string | null;
  promx_matchnumber?: number | null;
  promx_matchstage?: 796280000 | 796280001 | 796280002 | 796280003 | 796280004 | 796280005 | null;
  promx_remarks?: string | null;
  promx_resulttype?: 796280000 | 796280001 | 796280002 | 796280003 | 796280004 | null;
  promx_scheduleddatetime?: string | null;
  promx_teama: string;
  promx_teamb: string;
  promx_tossdecision?: 796280000 | 796280001 | null;
  promx_tosswinner?: string | null;
  promx_tournament: string;
  promx_winner?: string | null;
}
