import type { DataClient, IOperationOptions, IOperationResult } from "@microsoft/power-apps/data";
import type { CricketTournament } from "../../models/CricketTournament";
import type { DataverseRecord } from "../../models/DataverseRecord";
import type { ITournamentRepository } from "../interfaces/ITournamentRepository";

type DataverseRow = Record<string, unknown>;

const TABLE_NAME = "promx_crickettournament";
const STATUS_CODES = [1, 2, 796280001, 796280002] as const;
const SELECTED_COLUMNS = [
  "promx_crickettournamentid",
  "promx_auctionintegrationenabled",
  "promx_description",
  "promx_enddate",
  "promx_oversperinnings",
  "promx_playersperteam",
  "promx_pointsforloss",
  "promx_pointsfortie",
  "promx_pointsforwin",
  "promx_startdate",
  "promx_tournamentname",
  "statecode",
  "statuscode",
];
const WRITABLE_COLUMNS = [
  "promx_auctionintegrationenabled",
  "promx_description",
  "promx_enddate",
  "promx_oversperinnings",
  "promx_playersperteam",
  "promx_pointsforloss",
  "promx_pointsfortie",
  "promx_pointsforwin",
  "promx_startdate",
  "promx_tournamentname",
] as const;

function asError(error: unknown, fallback: string): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === "string") {
    return new Error(error);
  }

  return new Error(JSON.stringify(error) ?? fallback);
}

function failed<T>(error: unknown, fallback: string): Result<T> {
  return { success: false, error: asError(error, fallback) };
}

function optionalString(row: DataverseRow, column: string): string | null | undefined {
  const value = row[column];
  if (value === undefined || value === null) {
    return value;
  }
  if (typeof value !== "string") {
    throw new Error(`Expected ${column} to be a string.`);
  }
  return value;
}

function optionalNumber(row: DataverseRow, column: string): number | null | undefined {
  const value = row[column];
  if (value === undefined || value === null) {
    return value;
  }
  if (typeof value !== "number") {
    throw new Error(`Expected ${column} to be a number.`);
  }
  return value;
}

function optionalBoolean(row: DataverseRow, column: string): boolean | null | undefined {
  const value = row[column];
  if (value === undefined || value === null) {
    return value;
  }
  if (typeof value !== "boolean") {
    throw new Error(`Expected ${column} to be a boolean.`);
  }
  return value;
}

function optionalChoice<T extends number>(
  row: DataverseRow,
  column: string,
  choices: readonly T[],
): T | null | undefined {
  const value = row[column];
  if (value === undefined || value === null) {
    return value;
  }
  if (typeof value !== "number" || !choices.includes(value as T)) {
    throw new Error(`Unexpected choice value for ${column}.`);
  }
  return value as T;
}

function commonFields(
  row: DataverseRow,
): Pick<DataverseRecord<(typeof STATUS_CODES)[number]>, "statecode" | "statuscode"> {
  return {
    statecode: optionalChoice(row, "statecode", [0, 1] as const),
    statuscode: optionalChoice(row, "statuscode", STATUS_CODES),
  };
}

function mapTournament(row: DataverseRow): CricketTournament {
  return {
    ...commonFields(row),
    promx_crickettournamentid: optionalString(row, "promx_crickettournamentid"),
    promx_auctionintegrationenabled: optionalBoolean(row, "promx_auctionintegrationenabled"),
    promx_description: optionalString(row, "promx_description"),
    promx_enddate: optionalString(row, "promx_enddate"),
    promx_oversperinnings: requiredNumber(row, "promx_oversperinnings"),
    promx_playersperteam: requiredNumber(row, "promx_playersperteam"),
    promx_pointsforloss: optionalNumber(row, "promx_pointsforloss"),
    promx_pointsfortie: optionalNumber(row, "promx_pointsfortie"),
    promx_pointsforwin: optionalNumber(row, "promx_pointsforwin"),
    promx_startdate: optionalString(row, "promx_startdate"),
    promx_tournamentname: requiredString(row, "promx_tournamentname"),
  };
}

function requiredString(row: DataverseRow, column: string): string {
  const value = optionalString(row, column);
  if (value === undefined || value === null) {
    throw new Error(`Required Dataverse column ${column} was not returned.`);
  }
  return value;
}

function requiredNumber(row: DataverseRow, column: string): number {
  const value = optionalNumber(row, column);
  if (value === undefined || value === null) {
    throw new Error(`Required Dataverse column ${column} was not returned.`);
  }
  return value;
}

function mapOperation<T>(
  operation: IOperationResult<DataverseRow>,
  mapper: (row: DataverseRow) => T,
): Result<T> {
  if (!operation.success) {
    return failed(operation.error, `Dataverse request failed for ${TABLE_NAME}.`);
  }

  try {
    return { success: true, data: mapper(operation.data) };
  } catch (error) {
    return failed(error, `Could not map a ${TABLE_NAME} record.`);
  }
}

function mapPage<T>(
  operation: IOperationResult<DataverseRow[]>,
  mapper: (row: DataverseRow) => T,
): Result<RepositoryPage<T>> {
  if (!operation.success) {
    return failed(operation.error, `Dataverse request failed for ${TABLE_NAME}.`);
  }

  try {
    const page: RepositoryPage<T> = { items: operation.data.map(mapper) };
    if (operation.skipToken !== undefined) {
      page.nextCursor = operation.skipToken;
    }
    return { success: true, data: page };
  } catch (error) {
    return failed(error, `Could not map a ${TABLE_NAME} page.`);
  }
}

function toPayload(model: CricketTournament): Record<string, unknown> {
  const values = model as unknown as Record<string, unknown>;
  const payload: Record<string, unknown> = {};
  for (const column of WRITABLE_COLUMNS) {
    if (values[column] !== undefined) {
      payload[column] = values[column];
    }
  }
  return payload;
}

export class TournamentRepository implements ITournamentRepository {
  private readonly client: DataClient;

  constructor(client: DataClient) {
    this.client = client;
  }

  async getById(id: string): Promise<Result<CricketTournament>> {
    try {
      const operation = await this.client.retrieveRecordAsync<DataverseRow>(TABLE_NAME, id, {
        select: SELECTED_COLUMNS,
      });
      return mapOperation(operation, mapTournament);
    } catch (error) {
      return failed(error, `Could not retrieve ${TABLE_NAME} record ${id}.`);
    }
  }

  getAll(pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketTournament>>> {
    return this.getPage(pageSize, cursor);
  }

  getActive(pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketTournament>>> {
    return this.getPage(pageSize, cursor, "statecode eq 0");
  }

  async create(model: CricketTournament): Promise<Result<CricketTournament>> {
    try {
      const operation = await this.client.createRecordAsync<Record<string, unknown>, DataverseRow>(
        TABLE_NAME,
        toPayload(model),
      );
      return mapOperation(operation, mapTournament);
    } catch (error) {
      return failed(error, `Could not create a ${TABLE_NAME} record.`);
    }
  }

  async update(model: CricketTournament): Promise<Result<CricketTournament>> {
    const id = model.promx_crickettournamentid;
    if (!id) {
      return failed(new Error("A tournament ID is required for update."), "Could not update a tournament.");
    }

    try {
      const operation = await this.client.updateRecordAsync<Record<string, unknown>, DataverseRow>(
        TABLE_NAME,
        id,
        toPayload(model),
      );
      if (!operation.success) {
        return failed(operation.error, `Could not update ${TABLE_NAME} record ${id}.`);
      }
      return this.getById(id);
    } catch (error) {
      return failed(error, `Could not update ${TABLE_NAME} record ${id}.`);
    }
  }

  async updateStatus(id: string, statusCode: number): Promise<Result<CricketTournament>> {
    try {
      const operation = await this.client.updateRecordAsync<Record<string, unknown>, DataverseRow>(
        TABLE_NAME,
        id,
        { statuscode: statusCode },
      );
      if (!operation.success) {
        return failed(operation.error, `Could not update status for ${TABLE_NAME} record ${id}.`);
      }
      return this.getById(id);
    } catch (error) {
      return failed(error, `Could not update status for ${TABLE_NAME} record ${id}.`);
    }
  }

  private async getPage(
    pageSize?: number,
    cursor?: string,
    filter?: string,
  ): Promise<Result<RepositoryPage<CricketTournament>>> {
    const options: IOperationOptions = {
      select: SELECTED_COLUMNS,
      orderBy: ["promx_tournamentname asc"],
    };
    if (pageSize !== undefined) {
      options.maxPageSize = pageSize;
    }
    if (cursor !== undefined) {
      options.skipToken = cursor;
    }
    if (filter !== undefined) {
      options.filter = filter;
    }

    try {
      const operation = await this.client.retrieveMultipleRecordsAsync<DataverseRow>(TABLE_NAME, options);
      return mapPage(operation, mapTournament);
    } catch (error) {
      return failed(error, `Could not retrieve a ${TABLE_NAME} page.`);
    }
  }
}
