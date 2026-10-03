import type { DataClient } from "@microsoft/power-apps/data";
import type { CricketBallEvent } from "../../models/CricketBallEvent";
import type { IBallEventRepository } from "../interfaces/IBallEventRepository";
import {
  commonFields,
  createMapped,
  failed,
  fetchById,
  fetchPage,
  lookupFilter,
  optionalBoolean,
  optionalChoice,
  optionalLookup,
  optionalNumber,
  optionalString,
  pageOptions,
  requiredLookup,
  requiredNumber,
  requiredString,
} from "./DataverseRepositorySupport";
import type { DataverseRow } from "./DataverseRepositorySupport";

const TABLE_NAME = "promx_cricketballevent";
const STATUS_CODES = [1, 2, 796280001, 796280002] as const;
const BOUNDARY_TYPE_CODES = [796280000, 796280001] as const;
const DISMISSAL_TYPE_CODES = [796280000, 796280001, 796280002, 796280003, 796280004, 796280005, 796280006, 796280007, 796280008, 796280009] as const;
const EVENT_TYPE_CODES = [796280000, 796280001, 796280002, 796280003, 796280004, 796280005, 796280006] as const;
const SELECTED_COLUMNS = [
  "promx_balleventname",
  "promx_ballnumber",
  "promx_batterruns",
  "promx_boundarytype",
  "_promx_bowler_value",
  "promx_correctionreason",
  "promx_cricketballeventid",
  "promx_deliverysequencenumber",
  "promx_dismissaltype",
  "promx_dismissalvalid",
  "_promx_dismissedplayer_value",
  "promx_eventtype",
  "promx_extraruns",
  "_promx_innings_value",
  "promx_isboundary",
  "promx_isfreehit",
  "promx_islegaldelivery",
  "promx_iswicket",
  "_promx_match_value",
  "_promx_nonstriker_value",
  "_promx_nonstrikerafterball_value",
  "_promx_nonstrikerbeforeball_value",
  "_promx_over_value",
  "_promx_parentballevent_value",
  "_promx_striker_value",
  "_promx_strikerafterball_value",
  "_promx_strikerbeforeball_value",
  "promx_totalruns",
  "statecode",
  "statuscode",
] as const;
const WRITABLE_COLUMNS = [
  "promx_balleventname",
  "promx_ballnumber",
  "promx_batterruns",
  "promx_boundarytype",
  "promx_bowler",
  "promx_correctionreason",
  "promx_deliverysequencenumber",
  "promx_dismissaltype",
  "promx_dismissalvalid",
  "promx_dismissedplayer",
  "promx_eventtype",
  "promx_extraruns",
  "promx_innings",
  "promx_isboundary",
  "promx_isfreehit",
  "promx_islegaldelivery",
  "promx_iswicket",
  "promx_match",
  "promx_nonstriker",
  "promx_nonstrikerafterball",
  "promx_nonstrikerbeforeball",
  "promx_over",
  "promx_parentballevent",
  "promx_striker",
  "promx_strikerafterball",
  "promx_strikerbeforeball",
  "promx_totalruns",
] as const;
const LOOKUP_TARGETS = {
  promx_bowler: "promx_cricketmatchplayers",
  promx_dismissedplayer: "promx_cricketmatchplayers",
  promx_innings: "promx_cricketinningses",
  promx_match: "promx_cricketmatchs",
  promx_nonstriker: "promx_cricketmatchplayers",
  promx_nonstrikerafterball: "promx_cricketmatchplayers",
  promx_nonstrikerbeforeball: "promx_cricketmatchplayers",
  promx_over: "promx_cricketovers",
  promx_parentballevent: "promx_cricketballevents",
  promx_striker: "promx_cricketmatchplayers",
  promx_strikerafterball: "promx_cricketmatchplayers",
  promx_strikerbeforeball: "promx_cricketmatchplayers",
} as const;

function mapBallEvent(row: DataverseRow): CricketBallEvent {
  return {
    ...commonFields(row, STATUS_CODES),
    promx_balleventname: requiredString(row, "promx_balleventname"),
    promx_ballnumber: requiredNumber(row, "promx_ballnumber"),
    promx_batterruns: optionalNumber(row, "promx_batterruns"),
    promx_boundarytype: optionalChoice(row, "promx_boundarytype", BOUNDARY_TYPE_CODES),
    promx_bowler: optionalLookup(row, "promx_bowler"),
    promx_correctionreason: optionalString(row, "promx_correctionreason"),
    promx_cricketballeventid: optionalString(row, "promx_cricketballeventid"),
    promx_deliverysequencenumber: requiredNumber(row, "promx_deliverysequencenumber"),
    promx_dismissaltype: optionalChoice(row, "promx_dismissaltype", DISMISSAL_TYPE_CODES),
    promx_dismissalvalid: optionalBoolean(row, "promx_dismissalvalid"),
    promx_dismissedplayer: optionalLookup(row, "promx_dismissedplayer"),
    promx_eventtype: optionalChoice(row, "promx_eventtype", EVENT_TYPE_CODES),
    promx_extraruns: optionalNumber(row, "promx_extraruns"),
    promx_innings: requiredLookup(row, "promx_innings"),
    promx_isboundary: optionalBoolean(row, "promx_isboundary"),
    promx_isfreehit: optionalBoolean(row, "promx_isfreehit"),
    promx_islegaldelivery: optionalBoolean(row, "promx_islegaldelivery"),
    promx_iswicket: optionalBoolean(row, "promx_iswicket"),
    promx_match: requiredLookup(row, "promx_match"),
    promx_nonstriker: optionalLookup(row, "promx_nonstriker"),
    promx_nonstrikerafterball: optionalLookup(row, "promx_nonstrikerafterball"),
    promx_nonstrikerbeforeball: optionalLookup(row, "promx_nonstrikerbeforeball"),
    promx_over: requiredLookup(row, "promx_over"),
    promx_parentballevent: optionalLookup(row, "promx_parentballevent"),
    promx_striker: optionalLookup(row, "promx_striker"),
    promx_strikerafterball: optionalLookup(row, "promx_strikerafterball"),
    promx_strikerbeforeball: optionalLookup(row, "promx_strikerbeforeball"),
    promx_totalruns: optionalNumber(row, "promx_totalruns"),
  };
}

export class BallEventRepository implements IBallEventRepository {
  private readonly client: DataClient;

  constructor(client: DataClient) {
    this.client = client;
  }

  getById(id: string): Promise<Result<CricketBallEvent>> {
    return fetchById(this.client, TABLE_NAME, id, SELECTED_COLUMNS, mapBallEvent);
  }

  getByMatch(matchId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketBallEvent>>> {
    try {
      return fetchPage(this.client, TABLE_NAME, pageOptions(SELECTED_COLUMNS, "promx_deliverysequencenumber asc", pageSize, cursor, lookupFilter("promx_match", matchId)), mapBallEvent);
    } catch (error) {
      return Promise.resolve(failed(error, `Could not query ${TABLE_NAME} by match.`));
    }
  }

  getByInnings(inningsId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketBallEvent>>> {
    try {
      return fetchPage(this.client, TABLE_NAME, pageOptions(SELECTED_COLUMNS, "promx_deliverysequencenumber asc", pageSize, cursor, lookupFilter("promx_innings", inningsId)), mapBallEvent);
    } catch (error) {
      return Promise.resolve(failed(error, `Could not query ${TABLE_NAME} by innings.`));
    }
  }

  getByOver(overId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketBallEvent>>> {
    try {
      return fetchPage(this.client, TABLE_NAME, pageOptions(SELECTED_COLUMNS, "promx_deliverysequencenumber asc", pageSize, cursor, lookupFilter("promx_over", overId)), mapBallEvent);
    } catch (error) {
      return Promise.resolve(failed(error, `Could not query ${TABLE_NAME} by over.`));
    }
  }

  createEvent(model: CricketBallEvent): Promise<Result<CricketBallEvent>> {
    return createMapped(this.client, TABLE_NAME, model, WRITABLE_COLUMNS, mapBallEvent, LOOKUP_TARGETS);
  }
}
