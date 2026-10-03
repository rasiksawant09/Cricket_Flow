import type { DataverseRecord } from "./DataverseRecord";

export interface CricketInnings extends DataverseRecord<1 | 2 | 796280001 | 796280002 | 796280003> {
  promx_balls?: number | null;
  promx_battingteam: string;
  promx_bowlingteam: string;
  promx_cricketinningsid?: string | null;
  promx_inningsname: string;
  promx_inningsnumber: number;
  promx_inningstype?: 796280000 | 796280001 | null;
  promx_issuperover?: boolean | null;
  promx_match: string;
  promx_overs?: number | null;
  promx_runs?: number | null;
  promx_target?: number | null;
  promx_wickets?: number | null;
}
