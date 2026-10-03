import type { DataverseRecord } from "./DataverseRecord";

export interface CricketBowlerStatistic extends DataverseRecord<1 | 2> {
  promx_bowlerstatisticsname: string;
  promx_cricketbowlerstatisticid?: string | null;
  promx_economy?: number | null;
  promx_maidens?: number | null;
  promx_match?: string | null;
  promx_overs?: number | null;
  promx_player?: string | null;
  promx_runsconceded?: number | null;
  promx_wickets?: number | null;
}
