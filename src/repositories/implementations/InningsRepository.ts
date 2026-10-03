import type { DataClient } from "@microsoft/power-apps/data";
import type { CricketInnings } from "../../models/CricketInnings";
import type { IInningsRepository } from "../interfaces/IInningsRepository";
import {
  commonFields,
  createMapped,
  failed,
  fetchById,
  fetchPage,
  lookupFilter,
  optionalBoolean,
  optionalChoice,
  optionalNumber,
  optionalString,
  pageOptions,
  requiredLookup,
  requiredNumber,
  requiredString,
  updateMapped,
} from "./DataverseRepositorySupport";
import type { DataverseRow } from "./DataverseRepositorySupport";

const TABLE_NAME = "promx_cricketinnings";
const STATUS_CODES = [1, 2, 796280001, 796280002, 796280003] as const;
const INNINGS_TYPE_CODES = [796280000, 796280001] as const;
const SELECTED_COLUMNS = [
  "promx_balls",
  "_promx_battingteam_value",
  "_promx_bowlingteam_value",
  "promx_cricketinningsid",
  "promx_inningsname",
  "promx_inningsnumber",
  "promx_inningstype",
  "promx_issuperover",
  "_promx_match_value",
  "promx_overs",
  "promx_runs",
  "promx_target",
  "promx_wickets",
  "statecode",
  "statuscode",
] as const;
const WRITABLE_COLUMNS = [
  "promx_balls",
  "promx_battingteam",
  "promx_bowlingteam",
  "promx_inningsname",
  "promx_inningsnumber",
  "promx_inningstype",
  "promx_issuperover",
  "promx_match",
  "promx_overs",
  "promx_runs",
  "promx_target",
  "promx_wickets",
  "statecode",
  "statuscode",
] as const;
const LOOKUP_TARGETS = {
  promx_battingteam: "promx_crickettournamentteams",
  promx_bowlingteam: "promx_crickettournamentteams",
  promx_match: "promx_cricketmatchs",
} as const;

function mapInnings(row: DataverseRow): CricketInnings {
  return {
    ...commonFields(row, STATUS_CODES),
    promx_balls: optionalNumber(row, "promx_balls"),
    promx_battingteam: requiredLookup(row, "promx_battingteam"),
    promx_bowlingteam: requiredLookup(row, "promx_bowlingteam"),
    promx_cricketinningsid: optionalString(row, "promx_cricketinningsid"),
    promx_inningsname: requiredString(row, "promx_inningsname"),
    promx_inningsnumber: requiredNumber(row, "promx_inningsnumber"),
    promx_inningstype: optionalChoice(row, "promx_inningstype", INNINGS_TYPE_CODES),
    promx_issuperover: optionalBoolean(row, "promx_issuperover"),
    promx_match: requiredLookup(row, "promx_match"),
    promx_overs: optionalNumber(row, "promx_overs"),
    promx_runs: optionalNumber(row, "promx_runs"),
    promx_target: optionalNumber(row, "promx_target"),
    promx_wickets: optionalNumber(row, "promx_wickets"),
  };
}

export class InningsRepository implements IInningsRepository {
  private readonly client: DataClient;

  constructor(client: DataClient) {
    this.client = client;
  }

  getById(id: string): Promise<Result<CricketInnings>> {
    return fetchById(this.client, TABLE_NAME, id, SELECTED_COLUMNS, mapInnings);
  }

  getByMatch(matchId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketInnings>>> {
    try {
      return fetchPage(this.client, TABLE_NAME, pageOptions(SELECTED_COLUMNS, "promx_inningsnumber asc", pageSize, cursor, lookupFilter("promx_match", matchId)), mapInnings);
    } catch (error) {
      return Promise.resolve(failed(error, `Could not query ${TABLE_NAME} by match.`));
    }
  }

  create(model: CricketInnings): Promise<Result<CricketInnings>> {
    return createMapped(this.client, TABLE_NAME, model, WRITABLE_COLUMNS, mapInnings, LOOKUP_TARGETS);
  }

  update(model: CricketInnings): Promise<Result<CricketInnings>> {
    const id = model.promx_cricketinningsid;
    if (!id) {
      return Promise.resolve(failed(new Error("An innings ID is required for update."), "Could not update innings."));
    }
    return updateMapped(this.client, TABLE_NAME, id, model, WRITABLE_COLUMNS, SELECTED_COLUMNS, mapInnings, LOOKUP_TARGETS);
  }
}
