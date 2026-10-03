import type { DataClient } from "@microsoft/power-apps/data";
import type { CricketOver } from "../../models/CricketOver";
import type { IOverRepository } from "../interfaces/IOverRepository";
import {
  commonFields,
  createMapped,
  failed,
  fetchById,
  fetchPage,
  lookupFilter,
  optionalLookup,
  optionalNumber,
  optionalString,
  pageOptions,
  requiredLookup,
  requiredNumber,
  requiredString,
  updateMapped,
} from "./DataverseRepositorySupport";
import type { DataverseRow } from "./DataverseRepositorySupport";

const TABLE_NAME = "promx_cricketover";
const STATUS_CODES = [1, 2, 796280001] as const;
const SELECTED_COLUMNS = [
  "_promx_bowler_value",
  "promx_cricketoverid",
  "_promx_innings_value",
  "promx_legaldeliveries",
  "promx_overname",
  "promx_overnumber",
  "promx_runs",
  "promx_wickets",
  "statecode",
  "statuscode",
] as const;
const WRITABLE_COLUMNS = [
  "promx_bowler",
  "promx_innings",
  "promx_legaldeliveries",
  "promx_overname",
  "promx_overnumber",
  "promx_runs",
  "promx_wickets",
  "statecode",
  "statuscode",
] as const;
const LOOKUP_TARGETS = {
  promx_bowler: "promx_cricketmatchplayers",
  promx_innings: "promx_cricketinningses",
} as const;

function mapOver(row: DataverseRow): CricketOver {
  return {
    ...commonFields(row, STATUS_CODES),
    promx_bowler: optionalLookup(row, "promx_bowler"),
    promx_cricketoverid: optionalString(row, "promx_cricketoverid"),
    promx_innings: requiredLookup(row, "promx_innings"),
    promx_legaldeliveries: optionalNumber(row, "promx_legaldeliveries"),
    promx_overname: requiredString(row, "promx_overname"),
    promx_overnumber: requiredNumber(row, "promx_overnumber"),
    promx_runs: optionalNumber(row, "promx_runs"),
    promx_wickets: optionalNumber(row, "promx_wickets"),
  };
}

export class OverRepository implements IOverRepository {
  private readonly client: DataClient;

  constructor(client: DataClient) {
    this.client = client;
  }

  getById(id: string): Promise<Result<CricketOver>> {
    return fetchById(this.client, TABLE_NAME, id, SELECTED_COLUMNS, mapOver);
  }

  getByInnings(inningsId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketOver>>> {
    try {
      return fetchPage(this.client, TABLE_NAME, pageOptions(SELECTED_COLUMNS, "promx_overnumber asc", pageSize, cursor, lookupFilter("promx_innings", inningsId)), mapOver);
    } catch (error) {
      return Promise.resolve(failed(error, `Could not query ${TABLE_NAME} by innings.`));
    }
  }

  create(model: CricketOver): Promise<Result<CricketOver>> {
    return createMapped(this.client, TABLE_NAME, model, WRITABLE_COLUMNS, mapOver, LOOKUP_TARGETS);
  }

  update(model: CricketOver): Promise<Result<CricketOver>> {
    const id = model.promx_cricketoverid;
    if (!id) {
      return Promise.resolve(failed(new Error("An over ID is required for update."), "Could not update an over."));
    }
    return updateMapped(this.client, TABLE_NAME, id, model, WRITABLE_COLUMNS, SELECTED_COLUMNS, mapOver, LOOKUP_TARGETS);
  }
}
