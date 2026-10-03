import type { DataClient } from "@microsoft/power-apps/data";
import type { CricketBatterStatistic } from "../../models/CricketBatterStatistic";
import type { IBatterStatisticRepository } from "../interfaces/IBatterStatisticRepository";
import {
  commonFields,
  createMapped,
  failed,
  fetchPage,
  findExistingId,
  lookupFilter,
  optionalBoolean,
  optionalNumber,
  optionalLookup,
  optionalString,
  pageOptions,
  requiredString,
  updateMapped,
} from "./DataverseRepositorySupport";
import type { DataverseRow } from "./DataverseRepositorySupport";

const TABLE_NAME = "promx_cricketbatterstatistic";
const STATUS_CODES = [1, 2] as const;
const SELECTED_COLUMNS = [
  "promx_ballsfaced",
  "promx_batterstatisticsname",
  "promx_cricketbatterstatisticid",
  "promx_fours",
  "promx_isdismissed",
  "_promx_match_value",
  "_promx_player_value",
  "promx_runs",
  "promx_sixes",
  "promx_strikerate",
  "statecode",
  "statuscode",
] as const;
const WRITABLE_COLUMNS = [
  "promx_ballsfaced",
  "promx_batterstatisticsname",
  "promx_fours",
  "promx_isdismissed",
  "promx_match",
  "promx_player",
  "promx_runs",
  "promx_sixes",
  "promx_strikerate",
  "statecode",
  "statuscode",
] as const;
const LOOKUP_TARGETS = {
  promx_match: "promx_cricketmatchs",
  promx_player: "promx_cricketmatchplayers",
} as const;

function mapBatterStatistic(row: DataverseRow): CricketBatterStatistic {
  return {
    ...commonFields(row, STATUS_CODES),
    promx_ballsfaced: optionalNumber(row, "promx_ballsfaced"),
    promx_batterstatisticsname: requiredString(row, "promx_batterstatisticsname"),
    promx_cricketbatterstatisticid: optionalString(row, "promx_cricketbatterstatisticid"),
    promx_fours: optionalNumber(row, "promx_fours"),
    promx_isdismissed: optionalBoolean(row, "promx_isdismissed"),
    promx_match: optionalLookup(row, "promx_match"),
    promx_player: optionalLookup(row, "promx_player"),
    promx_runs: optionalNumber(row, "promx_runs"),
    promx_sixes: optionalNumber(row, "promx_sixes"),
    promx_strikerate: optionalNumber(row, "promx_strikerate"),
  };
}

export class BatterStatisticRepository implements IBatterStatisticRepository {
  private readonly client: DataClient;

  constructor(client: DataClient) {
    this.client = client;
  }

  getByMatch(matchId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketBatterStatistic>>> {
    try {
      return fetchPage(this.client, TABLE_NAME, pageOptions(SELECTED_COLUMNS, "promx_batterstatisticsname asc", pageSize, cursor, lookupFilter("promx_match", matchId)), mapBatterStatistic);
    } catch (error) {
      return Promise.resolve(failed(error, `Could not query ${TABLE_NAME} by match.`));
    }
  }

  getByPlayer(matchPlayerId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketBatterStatistic>>> {
    try {
      return fetchPage(this.client, TABLE_NAME, pageOptions(SELECTED_COLUMNS, "promx_batterstatisticsname asc", pageSize, cursor, lookupFilter("promx_player", matchPlayerId)), mapBatterStatistic);
    } catch (error) {
      return Promise.resolve(failed(error, `Could not query ${TABLE_NAME} by player.`));
    }
  }

  async upsert(model: CricketBatterStatistic): Promise<Result<CricketBatterStatistic>> {
    const id = model.promx_cricketbatterstatisticid;
    if (id) {
      return updateMapped(this.client, TABLE_NAME, id, model, WRITABLE_COLUMNS, SELECTED_COLUMNS, mapBatterStatistic, LOOKUP_TARGETS);
    }
    if (!model.promx_match || !model.promx_player) {
      return createMapped(this.client, TABLE_NAME, model, WRITABLE_COLUMNS, mapBatterStatistic, LOOKUP_TARGETS);
    }
    try {
      const filter = `${lookupFilter("promx_match", model.promx_match)} and ${lookupFilter("promx_player", model.promx_player)}`;
      const existingId = await findExistingId(this.client, TABLE_NAME, "promx_cricketbatterstatisticid", filter);
      if (!existingId.success) {
        return existingId;
      }
      if (existingId.data) {
        return updateMapped(this.client, TABLE_NAME, existingId.data, model, WRITABLE_COLUMNS, SELECTED_COLUMNS, mapBatterStatistic, LOOKUP_TARGETS);
      }
      return createMapped(this.client, TABLE_NAME, model, WRITABLE_COLUMNS, mapBatterStatistic, LOOKUP_TARGETS);
    } catch (error) {
      return failed(error, `Could not upsert a ${TABLE_NAME} record.`);
    }
  }
}
