import type { DataClient } from "@microsoft/power-apps/data";
import type { CricketTournamentTeam } from "../../models/CricketTournamentTeam";
import type { ITournamentTeamRepository } from "../interfaces/ITournamentTeamRepository";
import {
  commonFields,
  createMapped,
  failed,
  fetchById,
  fetchPage,
  lookupFilter,
  optionalNumber,
  optionalString,
  pageOptions,
  requiredLookup,
  requiredString,
  updateMapped,
} from "./DataverseRepositorySupport";
import type { DataverseRow } from "./DataverseRepositorySupport";

const TABLE_NAME = "promx_crickettournamentteam";
const STATUS_CODES = [1, 2] as const;
const SELECTED_COLUMNS = [
  "promx_crickettournamentteamid",
  "promx_groupname",
  "promx_seednumber",
  "_promx_team_value",
  "_promx_tournament_value",
  "promx_tournamentteamname",
  "statecode",
  "statuscode",
] as const;
const WRITABLE_COLUMNS = [
  "promx_groupname",
  "promx_seednumber",
  "promx_team",
  "promx_tournament",
  "promx_tournamentteamname",
  "statecode",
  "statuscode",
] as const;
const LOOKUP_TARGETS = {
  promx_team: { entitySetName: "promx_cricketteams", navigationProperty: "promx_Team" },
  promx_tournament: { entitySetName: "promx_crickettournaments", navigationProperty: "promx_Tournament" },
} as const;

function mapTournamentTeam(row: DataverseRow): CricketTournamentTeam {
  return {
    ...commonFields(row, STATUS_CODES),
    promx_crickettournamentteamid: optionalString(row, "promx_crickettournamentteamid"),
    promx_groupname: optionalString(row, "promx_groupname"),
    promx_seednumber: optionalNumber(row, "promx_seednumber"),
    promx_team: requiredLookup(row, "promx_team"),
    promx_tournament: requiredLookup(row, "promx_tournament"),
    promx_tournamentteamname: requiredString(row, "promx_tournamentteamname"),
  };
}

export class TournamentTeamRepository implements ITournamentTeamRepository {
  private readonly client: DataClient;

  constructor(client: DataClient) {
    this.client = client;
  }

  getById(id: string): Promise<Result<CricketTournamentTeam>> {
    return fetchById(this.client, TABLE_NAME, id, SELECTED_COLUMNS, mapTournamentTeam);
  }

  getByTournament(
    tournamentId: string,
    pageSize?: number,
    cursor?: string,
  ): Promise<Result<RepositoryPage<CricketTournamentTeam>>> {
    try {
      return fetchPage(
        this.client,
        TABLE_NAME,
        pageOptions(SELECTED_COLUMNS, "promx_tournamentteamname asc", pageSize, cursor, lookupFilter("promx_tournament", tournamentId)),
        mapTournamentTeam,
      );
    } catch (error) {
      return Promise.resolve(failed(error, `Could not query ${TABLE_NAME} by tournament.`));
    }
  }

  create(model: CricketTournamentTeam): Promise<Result<CricketTournamentTeam>> {
    try {
      return createMapped(this.client, TABLE_NAME, model, WRITABLE_COLUMNS, mapTournamentTeam, LOOKUP_TARGETS);
    } catch (error) {
      return Promise.resolve(failed(error, `Could not create a ${TABLE_NAME} record.`));
    }
  }

  update(model: CricketTournamentTeam): Promise<Result<CricketTournamentTeam>> {
    const id = model.promx_crickettournamentteamid;
    if (!id) {
      return Promise.resolve(failed(new Error("A tournament team ID is required for update."), "Could not update a tournament team."));
    }
    try {
      return updateMapped(this.client, TABLE_NAME, id, model, WRITABLE_COLUMNS, SELECTED_COLUMNS, mapTournamentTeam, LOOKUP_TARGETS);
    } catch (error) {
      return Promise.resolve(failed(error, `Could not update ${TABLE_NAME} record ${id}.`));
    }
  }

  async delete(id: string): Promise<Result<void>> {
    try {
      const operation = await this.client.deleteRecordAsync(TABLE_NAME, id);
      if (!operation.success) {
        return failed(operation.error, `Could not delete ${TABLE_NAME} record ${id}.`);
      }
      return { success: true, data: undefined };
    } catch (error) {
      return failed(error, `Could not delete ${TABLE_NAME} record ${id}.`);
    }
  }
}
