import type { DataClient } from "@microsoft/power-apps/data";
import type { CricketTournamentPlayer } from "../../models/CricketTournamentPlayer";
import type { ITournamentPlayerRepository } from "../interfaces/ITournamentPlayerRepository";
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

const TABLE_NAME = "promx_crickettournamentplayer";
const STATUS_CODES = [1, 2] as const;
const PLAYER_CATEGORY_CODES = [796280000, 796280001, 796280002, 796280003] as const;
const SELECTED_COLUMNS = [
  "promx_age",
  "promx_crickettournamentplayerid",
  "promx_iscaptain",
  "promx_isvicecaptain",
  "promx_jerseynumber",
  "_promx_player_value",
  "promx_playercategory",
  "_promx_tournament_value",
  "promx_tournamentplayername",
  "_promx_tournamentteam_value",
  "statecode",
  "statuscode",
] as const;
const WRITABLE_COLUMNS = [
  "promx_age",
  "promx_iscaptain",
  "promx_isvicecaptain",
  "promx_jerseynumber",
  "promx_player",
  "promx_playercategory",
  "promx_tournament",
  "promx_tournamentplayername",
  "promx_tournamentteam",
  "statecode",
  "statuscode",
] as const;
const LOOKUP_TARGETS = {
  promx_player: "promx_cricketplayers",
  promx_tournament: "promx_crickettournaments",
  promx_tournamentteam: "promx_crickettournamentteams",
} as const;

function mapTournamentPlayer(row: DataverseRow): CricketTournamentPlayer {
  return {
    ...commonFields(row, STATUS_CODES),
    promx_age: optionalNumber(row, "promx_age"),
    promx_crickettournamentplayerid: optionalString(row, "promx_crickettournamentplayerid"),
    promx_iscaptain: optionalBoolean(row, "promx_iscaptain"),
    promx_isvicecaptain: optionalBoolean(row, "promx_isvicecaptain"),
    promx_jerseynumber: optionalNumber(row, "promx_jerseynumber"),
    promx_player: requiredLookup(row, "promx_player"),
    promx_playercategory: optionalChoice(row, "promx_playercategory", PLAYER_CATEGORY_CODES),
    promx_tournament: requiredLookup(row, "promx_tournament"),
    promx_tournamentplayername: requiredString(row, "promx_tournamentplayername"),
    promx_tournamentteam: requiredLookup(row, "promx_tournamentteam"),
  };
}

export class TournamentPlayerRepository implements ITournamentPlayerRepository {
  private readonly client: DataClient;

  constructor(client: DataClient) {
    this.client = client;
  }

  getById(id: string): Promise<Result<CricketTournamentPlayer>> {
    return fetchById(this.client, TABLE_NAME, id, SELECTED_COLUMNS, mapTournamentPlayer);
  }

  getByTournament(tournamentId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketTournamentPlayer>>> {
    try {
      return fetchPage(this.client, TABLE_NAME, pageOptions(SELECTED_COLUMNS, "promx_tournamentplayername asc", pageSize, cursor, lookupFilter("promx_tournament", tournamentId)), mapTournamentPlayer);
    } catch (error) {
      return Promise.resolve(failed(error, `Could not query ${TABLE_NAME} by tournament.`));
    }
  }

  getByTournamentTeam(tournamentTeamId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketTournamentPlayer>>> {
    try {
      return fetchPage(this.client, TABLE_NAME, pageOptions(SELECTED_COLUMNS, "promx_tournamentplayername asc", pageSize, cursor, lookupFilter("promx_tournamentteam", tournamentTeamId)), mapTournamentPlayer);
    } catch (error) {
      return Promise.resolve(failed(error, `Could not query ${TABLE_NAME} by tournament team.`));
    }
  }

  create(model: CricketTournamentPlayer): Promise<Result<CricketTournamentPlayer>> {
    try {
      return createMapped(this.client, TABLE_NAME, model, WRITABLE_COLUMNS, mapTournamentPlayer, LOOKUP_TARGETS);
    } catch (error) {
      return Promise.resolve(failed(error, `Could not create a ${TABLE_NAME} record.`));
    }
  }

  update(model: CricketTournamentPlayer): Promise<Result<CricketTournamentPlayer>> {
    const id = model.promx_crickettournamentplayerid;
    if (!id) {
      return Promise.resolve(failed(new Error("A tournament player ID is required for update."), "Could not update a tournament player."));
    }
    try {
      return updateMapped(this.client, TABLE_NAME, id, model, WRITABLE_COLUMNS, SELECTED_COLUMNS, mapTournamentPlayer, LOOKUP_TARGETS);
    } catch (error) {
      return Promise.resolve(failed(error, `Could not update ${TABLE_NAME} record ${id}.`));
    }
  }
}
