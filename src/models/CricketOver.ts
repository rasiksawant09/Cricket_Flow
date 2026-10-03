import type { DataverseRecord } from "./DataverseRecord";

export interface CricketOver extends DataverseRecord<1 | 2 | 796280001> {
  promx_bowler?: string | null;
  promx_cricketoverid?: string | null;
  promx_innings: string;
  promx_legaldeliveries?: number | null;
  promx_overname: string;
  promx_overnumber: number;
  promx_runs?: number | null;
  promx_wickets?: number | null;
}
