import type { DataverseRecord } from "./DataverseRecord";

export interface CricketTeam extends DataverseRecord<1 | 2> {
  promx_cricketteamid?: string | null;
  promx_description?: string | null;
  promx_teamcolor?: string | null;
  promx_teamlogo?: string | null;
  promx_teamname: string;
  promx_teamshortname: string;
}
