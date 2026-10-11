import type { DataClient } from "@microsoft/power-apps/data";
import type { CricketTeam } from "../../models/CricketTeam";
import type { ITeamRepository } from "../interfaces/ITeamRepository";
import {
  commonFields,
  createMapped,
  deleteById,
  failed,
  fetchById,
  fetchPage,
  optionalChoice,
  optionalString,
  pageOptions,
  updateMapped,
  updateStatusAndFetch,
} from "./DataverseRepositorySupport";
import type { DataverseRow } from "./DataverseRepositorySupport";

const TABLE_NAME = "promx_cricketteam";
const STATUS_CODES = [1, 2] as const;
const SOURCE_CODES = [796280000, 796280001, 796280002] as const;
const SELECTED_COLUMNS = [
  "promx_cricketteamid",
  "promx_description",
  "promx_source",
  "promx_source_reference_id",
  "promx_teamcolor",
  "promx_teamlogo",
  "promx_teamname",
  "promx_teamshortname",
  "statecode",
  "statuscode",
] as const;
const WRITABLE_COLUMNS = [
  "promx_description",
  "promx_source",
  "promx_source_reference_id",
  "promx_teamcolor",
  "promx_teamlogo",
  "promx_teamname",
  "promx_teamshortname",
] as const;

function mapTeam(row: DataverseRow): CricketTeam {
  return {
    ...commonFields(row, STATUS_CODES),
    promx_cricketteamid: optionalString(row, "promx_cricketteamid"),
    promx_description: optionalString(row, "promx_description"),
    promx_source: optionalChoice(row, "promx_source", SOURCE_CODES),
    promx_source_reference_id: optionalString(row, "promx_source_reference_id"),
    promx_teamcolor: optionalString(row, "promx_teamcolor"),
    promx_teamlogo: optionalString(row, "promx_teamlogo"),
    promx_teamname: requiredString(row, "promx_teamname"),
    promx_teamshortname: requiredString(row, "promx_teamshortname"),
  };
}

function requiredString(row: DataverseRow, column: string): string {
  const value = optionalString(row, column);
  if (value === undefined || value === null) {
    throw new Error(`Required Dataverse column ${column} was not returned.`);
  }
  return value;
}

export class TeamRepository implements ITeamRepository {
  private readonly client: DataClient;

  constructor(client: DataClient) {
    this.client = client;
  }

  getById(id: string): Promise<Result<CricketTeam>> {
    return fetchById(this.client, TABLE_NAME, id, SELECTED_COLUMNS, mapTeam);
  }

  getAll(pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketTeam>>> {
    return fetchPage(
      this.client,
      TABLE_NAME,
      pageOptions(SELECTED_COLUMNS, "promx_teamname asc", pageSize, cursor),
      mapTeam,
    );
  }

  create(model: CricketTeam): Promise<Result<CricketTeam>> {
    return createMapped(this.client, TABLE_NAME, model, WRITABLE_COLUMNS, mapTeam);
  }

  update(model: CricketTeam): Promise<Result<CricketTeam>> {
    const id = model.promx_cricketteamid;
    if (!id) {
      return Promise.resolve(failed(new Error("A team ID is required for update."), "Could not update a team."));
    }
    return updateMapped(this.client, TABLE_NAME, id, model, WRITABLE_COLUMNS, SELECTED_COLUMNS, mapTeam);
  }

  updateStatus(id: string, statusCode: NonNullable<CricketTeam["statuscode"]>): Promise<Result<CricketTeam>> {
    return updateStatusAndFetch(this.client, TABLE_NAME, id, statusCode, SELECTED_COLUMNS, mapTeam);
  }

  delete(id: string): Promise<Result<void>> {
    return deleteById(this.client, TABLE_NAME, id);
  }
}
