import type { DataverseRecord } from "./DataverseRecord";

export interface CricketPlayer extends DataverseRecord<1 | 2> {
  promx_active?: boolean | null;
  promx_cricketplayer1: string;
  promx_cricketplayerid?: string | null;
  promx_emailaddress?: string | null;
  promx_employeeid?: string | null;
  promx_gender: 796280000 | 796280001 | 796280002;
  promx_source?: 796280000 | 796280001 | 796280002 | null;
  promx_sourcereferenceid?: string | null;
}
