import type { DataClient } from "@microsoft/power-apps/data";
import type { CricketMatchPlayer } from "../../models/CricketMatchPlayer";
import type { IMatchPlayerRepository } from "../interfaces/IMatchPlayerRepository";
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
  requiredString,
  updateMapped,
} from "./DataverseRepositorySupport";
import type { DataverseRow } from "./DataverseRepositorySupport";

const TABLE_NAME = "promx_cricketmatchplayer";
const STATUS_CODES = [1, 2] as const;
const GENDER_CODES = [796280000, 796280001, 796280002] as const;
const PLAYER_CATEGORY_CODES = [796280000, 796280001, 796280002, 796280003] as const;
const SELECTED_COLUMNS = [
  "promx_cricketmatchplayerid",
  "promx_gendersnapshot",
  "promx_iscaptain",
  "promx_isplaying",
  "promx_iswicketkeeper",
  "promx_jerseynumbersnapshot",
  "_promx_match_value",
  "promx_matchplayername",
  "promx_playercategorysnapshot",
  "promx_playernamesnapshot",
  "promx_teamsnapshot",
  "_promx_tournamentplayer_value",
  "statecode",
  "statuscode",
] as const;
const WRITABLE_COLUMNS = [
  "promx_gendersnapshot",
  "promx_iscaptain",
  "promx_isplaying",
  "promx_iswicketkeeper",
  "promx_jerseynumbersnapshot",
  "promx_match",
  "promx_matchplayername",
  "promx_playercategorysnapshot",
  "promx_playernamesnapshot",
  "promx_teamsnapshot",
  "promx_tournamentplayer",
  "statecode",
  "statuscode",
] as const;
const LOOKUP_TARGETS = {
  promx_match: { entitySetName: "promx_cricketmatchs", navigationProperty: "promx_Match" },
  promx_tournamentplayer: { entitySetName: "promx_crickettournamentplayers", navigationProperty: "promx_TournamentPlayer" },
} as const;

function mapMatchPlayer(row: DataverseRow): CricketMatchPlayer {
  return {
    ...commonFields(row, STATUS_CODES),
    promx_cricketmatchplayerid: optionalString(row, "promx_cricketmatchplayerid"),
    promx_gendersnapshot: optionalChoice(row, "promx_gendersnapshot", GENDER_CODES),
    promx_iscaptain: optionalBoolean(row, "promx_iscaptain"),
    promx_isplaying: optionalBoolean(row, "promx_isplaying"),
    promx_iswicketkeeper: optionalBoolean(row, "promx_iswicketkeeper"),
    promx_jerseynumbersnapshot: optionalNumber(row, "promx_jerseynumbersnapshot"),
    promx_match: requiredLookup(row, "promx_match"),
    promx_matchplayername: optionalString(row, "promx_matchplayername"),
    promx_playercategorysnapshot: optionalChoice(row, "promx_playercategorysnapshot", PLAYER_CATEGORY_CODES),
    promx_playernamesnapshot: requiredString(row, "promx_playernamesnapshot"),
    promx_teamsnapshot: requiredString(row, "promx_teamsnapshot"),
    promx_tournamentplayer: requiredLookup(row, "promx_tournamentplayer"),
  };
}

export class MatchPlayerRepository implements IMatchPlayerRepository {
  private readonly client: DataClient;

  constructor(client: DataClient) {
    this.client = client;
  }

  getById(id: string): Promise<Result<CricketMatchPlayer>> {
    return fetchById(this.client, TABLE_NAME, id, SELECTED_COLUMNS, mapMatchPlayer);
  }

  getByMatch(matchId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketMatchPlayer>>> {
    try {
      return fetchPage(this.client, TABLE_NAME, pageOptions(SELECTED_COLUMNS, "promx_playernamesnapshot asc", pageSize, cursor, lookupFilter("promx_match", matchId)), mapMatchPlayer);
    } catch (error) {
      return Promise.resolve(failed(error, `Could not query ${TABLE_NAME} by match.`));
    }
  }

  create(model: CricketMatchPlayer): Promise<Result<CricketMatchPlayer>> {
    return createMapped(this.client, TABLE_NAME, model, WRITABLE_COLUMNS, mapMatchPlayer, LOOKUP_TARGETS);
  }

  update(model: CricketMatchPlayer): Promise<Result<CricketMatchPlayer>> {
    const id = model.promx_cricketmatchplayerid;
    if (!id) {
      return Promise.resolve(failed(new Error("A match player ID is required for update."), "Could not update a match player."));
    }
    return updateMapped(this.client, TABLE_NAME, id, model, WRITABLE_COLUMNS, SELECTED_COLUMNS, mapMatchPlayer, LOOKUP_TARGETS);
  }
}
