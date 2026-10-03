import type { DataverseRecord } from "./DataverseRecord";

export interface CricketBatterStatistic extends DataverseRecord<1 | 2> {
  promx_ballsfaced?: number | null;
  promx_batterstatisticsname: string;
  promx_cricketbatterstatisticid?: string | null;
  promx_fours?: number | null;
  promx_isdismissed?: boolean | null;
  promx_match?: string | null;
  promx_player?: string | null;
  promx_runs?: number | null;
  promx_sixes?: number | null;
  promx_strikerate?: number | null;
}
