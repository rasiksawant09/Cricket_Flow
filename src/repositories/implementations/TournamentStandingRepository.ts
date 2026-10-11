import type { DataClient } from "@microsoft/power-apps/data";
import type { CricketTournamentStanding } from "../../models/CricketTournamentStanding";
import type { ITournamentStandingRepository } from "../interfaces/ITournamentStandingRepository";
import {
  commonFields,
  createMapped,
  failed,
  fetchPage,
  findExistingId,
  lookupFilter,
  optionalNumber,
  optionalString,
  pageOptions,
  requiredLookup,
  requiredString,
  updateMapped,
} from "./DataverseRepositorySupport";
import type { DataverseRow } from "./DataverseRepositorySupport";

const TABLE_NAME = "promx_crickettournamentstanding";
const STATUS_CODES = [1, 2] as const;
const SELECTED_COLUMNS = [
  "promx_crickettournamentstandingid",
  "promx_matcheslost",
  "promx_matchesplayed",
  "promx_matchestied",
  "promx_matcheswon",
  "promx_netrunrate",
  "promx_noresult",
  "promx_oversbowled",
  "promx_oversfaced",
  "promx_points",
  "promx_runsconceded",
  "promx_runsscored",
  "promx_standingname",
  "_promx_tournament_value",
  "_promx_tournamentteam_value",
  "statecode",
  "statuscode",
] as const;
const WRITABLE_COLUMNS = [
  "promx_matcheslost",
  "promx_matchesplayed",
  "promx_matchestied",
  "promx_matcheswon",
  "promx_netrunrate",
  "promx_noresult",
  "promx_oversbowled",
  "promx_oversfaced",
  "promx_points",
  "promx_runsconceded",
  "promx_runsscored",
  "promx_standingname",
  "promx_tournament",
  "promx_tournamentteam",
  "statecode",
  "statuscode",
] as const;
const LOOKUP_TARGETS = {
  promx_tournament: { entitySetName: "promx_crickettournaments", navigationProperty: "promx_Tournament" },
  promx_tournamentteam: { entitySetName: "promx_crickettournamentteams", navigationProperty: "promx_TournamentTeam" },
} as const;

function mapTournamentStanding(row: DataverseRow): CricketTournamentStanding {
  return {
    ...commonFields(row, STATUS_CODES),
    promx_crickettournamentstandingid: optionalString(row, "promx_crickettournamentstandingid"),
    promx_tournament: requiredLookup(row, "promx_tournament"),
    promx_tournamentteam: requiredLookup(row, "promx_tournamentteam"),
    promx_matcheslost: optionalNumber(row, "promx_matcheslost"),
    promx_matchesplayed: optionalNumber(row, "promx_matchesplayed"),
    promx_matchestied: optionalNumber(row, "promx_matchestied"),
    promx_matcheswon: optionalNumber(row, "promx_matcheswon"),
    promx_netrunrate: optionalNumber(row, "promx_netrunrate"),
    promx_noresult: optionalNumber(row, "promx_noresult"),
    promx_oversbowled: optionalNumber(row, "promx_oversbowled"),
    promx_oversfaced: optionalNumber(row, "promx_oversfaced"),
    promx_points: optionalNumber(row, "promx_points"),
    promx_runsconceded: optionalNumber(row, "promx_runsconceded"),
    promx_runsscored: optionalNumber(row, "promx_runsscored"),
    promx_standingname: requiredString(row, "promx_standingname"),
  };
}

export class TournamentStandingRepository implements ITournamentStandingRepository {
  private readonly client: DataClient;

  constructor(client: DataClient) {
    this.client = client;
  }

  getByTournament(tournamentId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketTournamentStanding>>> {
    try {
      return fetchPage(this.client, TABLE_NAME, pageOptions(SELECTED_COLUMNS, "promx_standingname asc", pageSize, cursor, lookupFilter("promx_tournament", tournamentId)), mapTournamentStanding);
    } catch (error) {
      return Promise.resolve(failed(error, `Could not query ${TABLE_NAME} by tournament.`));
    }
  }

  getByTournamentTeam(tournamentTeamId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketTournamentStanding>>> {
    try {
      return fetchPage(this.client, TABLE_NAME, pageOptions(SELECTED_COLUMNS, "promx_standingname asc", pageSize, cursor, lookupFilter("promx_tournamentteam", tournamentTeamId)), mapTournamentStanding);
    } catch (error) {
      return Promise.resolve(failed(error, `Could not query ${TABLE_NAME} by tournament team.`));
    }
  }

  async upsert(model: CricketTournamentStanding): Promise<Result<CricketTournamentStanding>> {
    const id = model.promx_crickettournamentstandingid;
    if (id) {
      return updateMapped(this.client, TABLE_NAME, id, model, WRITABLE_COLUMNS, SELECTED_COLUMNS, mapTournamentStanding, LOOKUP_TARGETS);
    }
    try {
      const filter = `${lookupFilter("promx_tournament", model.promx_tournament)} and ${lookupFilter("promx_tournamentteam", model.promx_tournamentteam)}`;
      const existingId = await findExistingId(this.client, TABLE_NAME, "promx_crickettournamentstandingid", filter);
      if (!existingId.success) {
        return existingId;
      }
      if (existingId.data) {
        return updateMapped(this.client, TABLE_NAME, existingId.data, model, WRITABLE_COLUMNS, SELECTED_COLUMNS, mapTournamentStanding, LOOKUP_TARGETS);
      }
      return createMapped(this.client, TABLE_NAME, model, WRITABLE_COLUMNS, mapTournamentStanding, LOOKUP_TARGETS);
    } catch (error) {
      return failed(error, `Could not upsert a ${TABLE_NAME} record.`);
    }
  }
}
