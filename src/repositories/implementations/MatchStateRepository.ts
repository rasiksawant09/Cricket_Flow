import type { DataClient } from "@microsoft/power-apps/data";
import type { CricketMatchState } from "../../models/CricketMatchState";
import type { IMatchStateRepository } from "../interfaces/IMatchStateRepository";
import {
  commonFields,
  createMapped,
  failed,
  fetchPage,
  findExistingId,
  lookupFilter,
  optionalLookup,
  optionalNumber,
  optionalString,
  pageOptions,
  requiredString,
  updateMapped,
} from "./DataverseRepositorySupport";
import type { DataverseRow } from "./DataverseRepositorySupport";

const TABLE_NAME = "promx_cricketmatchstate";
const STATUS_CODES = [1, 2, 796280001] as const;
const SELECTED_COLUMNS = [
  "promx_ballsremaining",
  "promx_cricketmatchstateid",
  "promx_currentballs",
  "_promx_currentbowler_value",
  "_promx_currentnonstriker_value",
  "promx_currentovers",
  "promx_currentrunrate",
  "promx_currentruns",
  "_promx_currentstriker_value",
  "promx_currentwickets",
  "_promx_innings_value",
  "_promx_match_value",
  "promx_matchstatename",
  "promx_requiredrunrate",
  "promx_runsrequired",
  "promx_target",
  "statecode",
  "statuscode",
] as const;
const WRITABLE_COLUMNS = [
  "promx_ballsremaining",
  "promx_currentballs",
  "promx_currentbowler",
  "promx_currentnonstriker",
  "promx_currentovers",
  "promx_currentrunrate",
  "promx_currentruns",
  "promx_currentstriker",
  "promx_currentwickets",
  "promx_innings",
  "promx_match",
  "promx_matchstatename",
  "promx_requiredrunrate",
  "promx_runsrequired",
  "promx_target",
  "statecode",
  "statuscode",
] as const;
const LOOKUP_TARGETS = {
  promx_currentbowler: { entitySetName: "promx_cricketmatchplayers", navigationProperty: "promx_CurrentBowler" },
  promx_currentnonstriker: { entitySetName: "promx_cricketmatchplayers", navigationProperty: "promx_CurrentNonStriker" },
  promx_currentstriker: { entitySetName: "promx_cricketmatchplayers", navigationProperty: "promx_CurrentStriker" },
  promx_innings: { entitySetName: "promx_cricketinningses", navigationProperty: "promx_Innings" },
  promx_match: { entitySetName: "promx_cricketmatchs", navigationProperty: "promx_Match" },
} as const;

function mapMatchState(row: DataverseRow): CricketMatchState {
  return {
    ...commonFields(row, STATUS_CODES),
    promx_ballsremaining: optionalNumber(row, "promx_ballsremaining"),
    promx_cricketmatchstateid: optionalString(row, "promx_cricketmatchstateid"),
    promx_currentballs: optionalNumber(row, "promx_currentballs"),
    promx_currentbowler: optionalLookup(row, "promx_currentbowler"),
    promx_currentnonstriker: optionalLookup(row, "promx_currentnonstriker"),
    promx_currentovers: optionalNumber(row, "promx_currentovers"),
    promx_currentrunrate: optionalNumber(row, "promx_currentrunrate"),
    promx_currentruns: optionalNumber(row, "promx_currentruns"),
    promx_currentstriker: optionalLookup(row, "promx_currentstriker"),
    promx_currentwickets: optionalNumber(row, "promx_currentwickets"),
    promx_innings: optionalLookup(row, "promx_innings"),
    promx_match: optionalLookup(row, "promx_match"),
    promx_matchstatename: requiredString(row, "promx_matchstatename"),
    promx_requiredrunrate: optionalNumber(row, "promx_requiredrunrate"),
    promx_runsrequired: optionalNumber(row, "promx_runsrequired"),
    promx_target: optionalNumber(row, "promx_target"),
  };
}

export class MatchStateRepository implements IMatchStateRepository {
  private readonly client: DataClient;

  constructor(client: DataClient) {
    this.client = client;
  }

  getByMatch(matchId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketMatchState>>> {
    try {
      return fetchPage(this.client, TABLE_NAME, pageOptions(SELECTED_COLUMNS, "promx_matchstatename asc", pageSize, cursor, lookupFilter("promx_match", matchId)), mapMatchState);
    } catch (error) {
      return Promise.resolve(failed(error, `Could not query ${TABLE_NAME} by match.`));
    }
  }

  getByInnings(inningsId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketMatchState>>> {
    try {
      return fetchPage(this.client, TABLE_NAME, pageOptions(SELECTED_COLUMNS, "promx_matchstatename asc", pageSize, cursor, lookupFilter("promx_innings", inningsId)), mapMatchState);
    } catch (error) {
      return Promise.resolve(failed(error, `Could not query ${TABLE_NAME} by innings.`));
    }
  }

  async upsert(model: CricketMatchState): Promise<Result<CricketMatchState>> {
    const id = model.promx_cricketmatchstateid;
    if (id) {
      return updateMapped(this.client, TABLE_NAME, id, model, WRITABLE_COLUMNS, SELECTED_COLUMNS, mapMatchState, LOOKUP_TARGETS);
    }

    const filters: string[] = [];
    try {
      if (model.promx_match) {
        filters.push(lookupFilter("promx_match", model.promx_match));
      }
      if (model.promx_innings) {
        filters.push(lookupFilter("promx_innings", model.promx_innings));
      }
      if (filters.length === 0) {
        return createMapped(this.client, TABLE_NAME, model, WRITABLE_COLUMNS, mapMatchState, LOOKUP_TARGETS);
      }
      const existingId = await findExistingId(this.client, TABLE_NAME, "promx_cricketmatchstateid", filters.join(" and "));
      if (!existingId.success) {
        return existingId;
      }
      if (existingId.data) {
        return updateMapped(this.client, TABLE_NAME, existingId.data, model, WRITABLE_COLUMNS, SELECTED_COLUMNS, mapMatchState, LOOKUP_TARGETS);
      }
      return createMapped(this.client, TABLE_NAME, model, WRITABLE_COLUMNS, mapMatchState, LOOKUP_TARGETS);
    } catch (error) {
      return failed(error, `Could not upsert a ${TABLE_NAME} record.`);
    }
  }
}
