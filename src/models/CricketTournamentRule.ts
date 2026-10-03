import type { DataverseRecord } from "./DataverseRecord";

export interface CricketTournamentRule extends DataverseRecord<1 | 2> {
  promx_configurationjson: string;
  promx_crickettournamentruleid?: string | null;
  promx_description?: string | null;
  promx_enabled?: boolean | null;
  promx_rulecategory?: 796280000 | 796280001 | 796280002 | 796280003 | 796280004 | null;
  promx_rulecode: string;
  promx_rulename: string;
  promx_tournament: string;
}
