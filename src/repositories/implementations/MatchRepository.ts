import type { DataClient } from "@microsoft/power-apps/data";
import type { CricketMatch } from "../../models/CricketMatch";
import type { IMatchRepository } from "../interfaces/IMatchRepository";
import {
  commonFields,
  createMapped,
  failed,
  fetchById,
  fetchPage,
  lookupFilter,
  optionalChoice,
  optionalLookup,
  optionalNumber,
  optionalString,
  pageOptions,
  requiredLookup,
  updateMapped,
  updateStatusAndFetch,
} from "./DataverseRepositorySupport";
import type { DataverseRow } from "./DataverseRepositorySupport";

const TABLE_NAME = "promx_cricketmatch";
const STATUS_CODES = [1, 2, 796280001, 796280002, 796280003, 796280004, 796280005, 796280006, 796280007, 796280008] as const;
const INACTIVE_STATUSES = [2, 796280006, 796280007, 796280008] as const;
const MATCH_STAGE_CODES = [796280000, 796280001, 796280002, 796280003, 796280004, 796280005] as const;
const RESULT_TYPE_CODES = [796280000, 796280001, 796280002, 796280003, 796280004] as const;
const TOSS_DECISION_CODES = [796280000, 796280001] as const;
const SELECTED_COLUMNS = [
  "promx_cricketmatchid",
  "_promx_loser_value",
  "promx_matchname",
  "promx_matchnumber",
  "promx_matchstage",
  "promx_remarks",
  "promx_resulttype",
  "promx_scheduleddatetime",
  "_promx_teama_value",
  "_promx_teamb_value",
  "promx_tossdecision",
  "_promx_tosswinner_value",
  "_promx_tournament_value",
  "_promx_winner_value",
  "statecode",
  "statuscode",
] as const;
const WRITABLE_COLUMNS = [
  "promx_loser",
  "promx_matchname",
  "promx_matchnumber",
  "promx_matchstage",
  "promx_remarks",
  "promx_resulttype",
  "promx_scheduleddatetime",
  "promx_teama",
  "promx_teamb",
  "promx_tossdecision",
  "promx_tosswinner",
  "promx_tournament",
  "promx_winner",
  "statecode",
  "statuscode",
] as const;
const LOOKUP_TARGETS = {
  promx_loser: { entitySetName: "promx_crickettournamentteams", navigationProperty: "promx_Loser" },
  promx_teama: { entitySetName: "promx_crickettournamentteams", navigationProperty: "promx_TeamA" },
  promx_teamb: { entitySetName: "promx_crickettournamentteams", navigationProperty: "promx_TeamB" },
  promx_tosswinner: { entitySetName: "promx_crickettournamentteams", navigationProperty: "promx_TossWinner" },
  promx_tournament: { entitySetName: "promx_crickettournaments", navigationProperty: "promx_Tournament" },
  promx_winner: { entitySetName: "promx_crickettournamentteams", navigationProperty: "promx_Winner" },
} as const;

function mapMatch(row: DataverseRow): CricketMatch {
  return {
    ...commonFields(row, STATUS_CODES),
    promx_cricketmatchid: optionalString(row, "promx_cricketmatchid"),
    promx_loser: optionalLookup(row, "promx_loser"),
    promx_matchname: optionalString(row, "promx_matchname"),
    promx_matchnumber: optionalNumber(row, "promx_matchnumber"),
    promx_matchstage: optionalChoice(row, "promx_matchstage", MATCH_STAGE_CODES),
    promx_remarks: optionalString(row, "promx_remarks"),
    promx_resulttype: optionalChoice(row, "promx_resulttype", RESULT_TYPE_CODES),
    promx_scheduleddatetime: optionalString(row, "promx_scheduleddatetime"),
    promx_teama: requiredLookup(row, "promx_teama"),
    promx_teamb: requiredLookup(row, "promx_teamb"),
    promx_tossdecision: optionalChoice(row, "promx_tossdecision", TOSS_DECISION_CODES),
    promx_tosswinner: optionalLookup(row, "promx_tosswinner"),
    promx_tournament: requiredLookup(row, "promx_tournament"),
    promx_winner: optionalLookup(row, "promx_winner"),
  };
}

export class MatchRepository implements IMatchRepository {
  private readonly client: DataClient;

  constructor(client: DataClient) {
    this.client = client;
  }

  getById(id: string): Promise<Result<CricketMatch>> {
    return fetchById(this.client, TABLE_NAME, id, SELECTED_COLUMNS, mapMatch);
  }

  getAll(pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketMatch>>> {
    try {
      return fetchPage(
        this.client,
        TABLE_NAME,
        pageOptions(SELECTED_COLUMNS, "promx_scheduleddatetime asc", pageSize, cursor),
        mapMatch,
      );
    } catch (error) {
      return Promise.resolve(failed(error, `Could not retrieve a ${TABLE_NAME} page.`));
    }
  }

  getByTournament(tournamentId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketMatch>>> {
    try {
      return fetchPage(this.client, TABLE_NAME, pageOptions(SELECTED_COLUMNS, "promx_scheduleddatetime asc", pageSize, cursor, lookupFilter("promx_tournament", tournamentId)), mapMatch);
    } catch (error) {
      return Promise.resolve(failed(error, `Could not query ${TABLE_NAME} by tournament.`));
    }
  }

  getUpcoming(pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketMatch>>> {
    const now = new Date().toISOString();
    const filter = `statecode eq 0 and promx_scheduleddatetime ne null and promx_scheduleddatetime ge ${now} and (statuscode eq 1 or statuscode eq 796280001)`;
    return fetchPage(this.client, TABLE_NAME, pageOptions(SELECTED_COLUMNS, "promx_scheduleddatetime asc", pageSize, cursor, filter), mapMatch);
  }

  getLive(pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketMatch>>> {
    return fetchPage(
      this.client,
      TABLE_NAME,
      pageOptions(SELECTED_COLUMNS, "promx_scheduleddatetime asc", pageSize, cursor, "statuscode eq 796280002 or statuscode eq 796280005"),
      mapMatch,
    );
  }

  create(model: CricketMatch): Promise<Result<CricketMatch>> {
    return createMapped(this.client, TABLE_NAME, model, WRITABLE_COLUMNS, mapMatch, LOOKUP_TARGETS, INACTIVE_STATUSES);
  }

  update(model: CricketMatch): Promise<Result<CricketMatch>> {
    const id = model.promx_cricketmatchid;
    if (!id) {
      return Promise.resolve(failed(new Error("A match ID is required for update."), "Could not update a match."));
    }
    return updateMapped(this.client, TABLE_NAME, id, model, WRITABLE_COLUMNS, SELECTED_COLUMNS, mapMatch, LOOKUP_TARGETS, INACTIVE_STATUSES);
  }

  updateStatus(id: string, statusCode: NonNullable<CricketMatch["statuscode"]>): Promise<Result<CricketMatch>> {
    return updateStatusAndFetch(this.client, TABLE_NAME, id, statusCode, SELECTED_COLUMNS, mapMatch, INACTIVE_STATUSES);
  }
}
