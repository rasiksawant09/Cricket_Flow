import type { DataverseRecord } from "./DataverseRecord";

export interface CricketTeam extends DataverseRecord<1 | 2> {
  promx_cricketteamid?: string | null;
  promx_description?: string | null;
  promx_source?: 796280000 | 796280001 | 796280002 | null;
  promx_source_reference_id?: string | null;
  promx_teamcolor?: string | null;
  promx_teamlogo?: string | null;
  promx_teamname: string;
  promx_teamshortname: string;
}
