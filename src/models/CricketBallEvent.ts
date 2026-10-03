import type { DataverseRecord } from "./DataverseRecord";

export interface CricketBallEvent extends DataverseRecord<1 | 2 | 796280001 | 796280002> {
  promx_balleventname: string;
  promx_ballnumber: number;
  promx_batterruns?: number | null;
  promx_boundarytype?: 796280000 | 796280001 | null;
  promx_bowler?: string | null;
  promx_correctionreason?: string | null;
  promx_cricketballeventid?: string | null;
  promx_deliverysequencenumber: number;
  promx_dismissaltype?: 796280000 | 796280001 | 796280002 | 796280003 | 796280004 | 796280005 | 796280006 | 796280007 | 796280008 | 796280009 | null;
  promx_dismissalvalid?: boolean | null;
  promx_dismissedplayer?: string | null;
  promx_eventtype?: 796280000 | 796280001 | 796280002 | 796280003 | 796280004 | 796280005 | 796280006 | null;
  promx_extraruns?: number | null;
  promx_innings: string;
  promx_isboundary?: boolean | null;
  promx_isfreehit?: boolean | null;
  promx_islegaldelivery?: boolean | null;
  promx_iswicket?: boolean | null;
  promx_match: string;
  promx_nonstriker?: string | null;
  promx_nonstrikerafterball?: string | null;
  promx_nonstrikerbeforeball?: string | null;
  promx_over: string;
  promx_parentballevent?: string | null;
  promx_striker?: string | null;
  promx_strikerafterball?: string | null;
  promx_strikerbeforeball?: string | null;
  promx_totalruns?: number | null;
}
