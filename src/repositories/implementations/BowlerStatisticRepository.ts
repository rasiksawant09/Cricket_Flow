import type { DataClient } from "@microsoft/power-apps/data";
import type { CricketBowlerStatistic } from "../../models/CricketBowlerStatistic";
import type { IBowlerStatisticRepository } from "../interfaces/IBowlerStatisticRepository";
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

const TABLE_NAME = "promx_cricketbowlerstatistic";
const STATUS_CODES = [1, 2] as const;
const SELECTED_COLUMNS = [
  "promx_bowlerstatisticsname",
  "promx_cricketbowlerstatisticid",
  "promx_economy",
  "promx_maidens",
  "_promx_match_value",
  "promx_overs",
  "_promx_player_value",
  "promx_runsconceded",
  "promx_wickets",
  "statecode",
  "statuscode",
] as const;
const WRITABLE_COLUMNS = [
  "promx_bowlerstatisticsname",
  "promx_economy",
  "promx_maidens",
  "promx_match",
  "promx_overs",
  "promx_player",
  "promx_runsconceded",
  "promx_wickets",
  "statecode",
  "statuscode",
] as const;
const LOOKUP_TARGETS = {
  promx_match: "promx_cricketmatchs",
  promx_player: "promx_cricketmatchplayers",
} as const;

function mapBowlerStatistic(row: DataverseRow): CricketBowlerStatistic {
  return {
    ...commonFields(row, STATUS_CODES),
    promx_bowlerstatisticsname: requiredString(row, "promx_bowlerstatisticsname"),
    promx_cricketbowlerstatisticid: optionalString(row, "promx_cricketbowlerstatisticid"),
    promx_economy: optionalNumber(row, "promx_economy"),
    promx_maidens: optionalNumber(row, "promx_maidens"),
    promx_match: optionalLookup(row, "promx_match"),
    promx_overs: optionalNumber(row, "promx_overs"),
    promx_player: optionalLookup(row, "promx_player"),
    promx_runsconceded: optionalNumber(row, "promx_runsconceded"),
    promx_wickets: optionalNumber(row, "promx_wickets"),
  };
}

export class BowlerStatisticRepository implements IBowlerStatisticRepository {
  private readonly client: DataClient;

  constructor(client: DataClient) {
    this.client = client;
  }

  getByMatch(matchId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketBowlerStatistic>>> {
    try {
      return fetchPage(this.client, TABLE_NAME, pageOptions(SELECTED_COLUMNS, "promx_bowlerstatisticsname asc", pageSize, cursor, lookupFilter("promx_match", matchId)), mapBowlerStatistic);
    } catch (error) {
      return Promise.resolve(failed(error, `Could not query ${TABLE_NAME} by match.`));
    }
  }

  getByPlayer(matchPlayerId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketBowlerStatistic>>> {
    try {
      return fetchPage(this.client, TABLE_NAME, pageOptions(SELECTED_COLUMNS, "promx_bowlerstatisticsname asc", pageSize, cursor, lookupFilter("promx_player", matchPlayerId)), mapBowlerStatistic);
    } catch (error) {
      return Promise.resolve(failed(error, `Could not query ${TABLE_NAME} by player.`));
    }
  }

  async upsert(model: CricketBowlerStatistic): Promise<Result<CricketBowlerStatistic>> {
    const id = model.promx_cricketbowlerstatisticid;
    if (id) {
      return updateMapped(this.client, TABLE_NAME, id, model, WRITABLE_COLUMNS, SELECTED_COLUMNS, mapBowlerStatistic, LOOKUP_TARGETS);
    }
    if (!model.promx_match || !model.promx_player) {
      return createMapped(this.client, TABLE_NAME, model, WRITABLE_COLUMNS, mapBowlerStatistic, LOOKUP_TARGETS);
    }
    try {
      const filter = `${lookupFilter("promx_match", model.promx_match)} and ${lookupFilter("promx_player", model.promx_player)}`;
      const existingId = await findExistingId(this.client, TABLE_NAME, "promx_cricketbowlerstatisticid", filter);
      if (!existingId.success) {
        return existingId;
      }
      if (existingId.data) {
        return updateMapped(this.client, TABLE_NAME, existingId.data, model, WRITABLE_COLUMNS, SELECTED_COLUMNS, mapBowlerStatistic, LOOKUP_TARGETS);
      }
      return createMapped(this.client, TABLE_NAME, model, WRITABLE_COLUMNS, mapBowlerStatistic, LOOKUP_TARGETS);
    } catch (error) {
      return failed(error, `Could not upsert a ${TABLE_NAME} record.`);
    }
  }
}
