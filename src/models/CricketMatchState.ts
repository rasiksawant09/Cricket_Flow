import type { DataverseRecord } from "./DataverseRecord";

export interface CricketMatchState extends DataverseRecord<1 | 2 | 796280001> {
  promx_ballsremaining?: number | null;
  promx_cricketmatchstateid?: string | null;
  promx_currentballs?: number | null;
  promx_currentbowler?: string | null;
  promx_currentnonstriker?: string | null;
  promx_currentovers?: number | null;
  promx_currentrunrate?: number | null;
  promx_currentruns?: number | null;
  promx_currentstriker?: string | null;
  promx_currentwickets?: number | null;
  promx_innings?: string | null;
  promx_match?: string | null;
  promx_matchstatename: string;
  promx_requiredrunrate?: number | null;
  promx_runsrequired?: number | null;
  promx_target?: number | null;
}
