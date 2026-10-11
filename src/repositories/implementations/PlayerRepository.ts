import type { DataClient, IOperationOptions, IOperationResult } from "@microsoft/power-apps/data";
import type { CricketPlayer } from "../../models/CricketPlayer";
import type { DataverseRecord } from "../../models/DataverseRecord";
import type { IPlayerRepository } from "../interfaces/IPlayerRepository";
import { deleteById } from "./DataverseRepositorySupport";

type DataverseRow = Record<string, unknown>;

const TABLE_NAME = "promx_cricketplayer";
const STATUS_CODES = [1, 2] as const;
const GENDER_CODES = [796280000, 796280001, 796280002] as const;
const SOURCE_CODES = [796280000, 796280001, 796280002] as const;
const SELECTED_COLUMNS = [
  "promx_cricketplayer1",
  "promx_cricketplayerid",
  "promx_emailaddress",
  "promx_employeeid",
  "promx_gender",
  "promx_source",
  "promx_sourcereferenceid",
  "statecode",
  "statuscode",
] as const;
const WRITABLE_COLUMNS = [
  "promx_cricketplayer1",
  "promx_emailaddress",
  "promx_employeeid",
  "promx_gender",
  "promx_source",
  "promx_sourcereferenceid",
] as const;

function asError(error: unknown, fallback: string): Error {
  if (error instanceof Error) {
    return error;
  }

  if (error === undefined || error === null) {
    return new Error(fallback);
  }

  if (typeof error === "string") {
    return new Error(error || fallback);
  }

  try {
    return new Error(JSON.stringify(error) ?? fallback);
  } catch {
    return new Error(fallback);
  }
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

function requiredString(row: DataverseRow, column: string): string {
  const value = optionalString(row, column);
  if (value === undefined || value === null) {
    throw new Error(`Required Dataverse column ${column} was not returned.`);
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

function requiredChoice<T extends number>(row: DataverseRow, column: string, choices: readonly T[]): T {
  const value = optionalChoice(row, column, choices);
  if (value === undefined || value === null) {
    throw new Error(`Required Dataverse choice ${column} was not returned.`);
  }
  return value;
}

function commonFields(row: DataverseRow): Pick<DataverseRecord<1 | 2>, "statecode" | "statuscode"> {
  return {
    statecode: optionalChoice(row, "statecode", [0, 1] as const),
    statuscode: optionalChoice(row, "statuscode", STATUS_CODES),
  };
}

function mapPlayer(row: DataverseRow): CricketPlayer {
  return {
    ...commonFields(row),
    promx_active: optionalBoolean(row, "promx_active"),
    promx_cricketplayer1: requiredString(row, "promx_cricketplayer1"),
    promx_cricketplayerid: optionalString(row, "promx_cricketplayerid"),
    promx_emailaddress: optionalString(row, "promx_emailaddress"),
    promx_employeeid: optionalString(row, "promx_employeeid"),
    promx_gender: requiredChoice(row, "promx_gender", GENDER_CODES),
    promx_source: optionalChoice(row, "promx_source", SOURCE_CODES),
    promx_sourcereferenceid: optionalString(row, "promx_sourcereferenceid"),
  };
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

function toPayload(model: CricketPlayer): Record<string, unknown> {
  const values = model as unknown as Record<string, unknown>;
  const payload: Record<string, unknown> = {};
  for (const column of WRITABLE_COLUMNS) {
    if (values[column] !== undefined) {
      payload[column] = values[column];
    }
  }
  return payload;
}

export class PlayerRepository implements IPlayerRepository {
  private readonly client: DataClient;

  constructor(client: DataClient) {
    this.client = client;
  }

  async getById(id: string): Promise<Result<CricketPlayer>> {
    try {
      const operation = await this.client.retrieveRecordAsync<DataverseRow>(TABLE_NAME, id, {
        select: [...SELECTED_COLUMNS],
      });
      return mapOperation(operation, mapPlayer);
    } catch (error) {
      return failed(error, `Could not retrieve ${TABLE_NAME} record ${id}.`);
    }
  }

  async getAll(pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketPlayer>>> {
    const options: IOperationOptions = {
      select: [...SELECTED_COLUMNS],
      orderBy: ["promx_cricketplayer1 asc"],
    };
    if (pageSize !== undefined) {
      options.maxPageSize = pageSize;
    }
    if (cursor !== undefined) {
      options.skipToken = cursor;
    }

    try {
      const operation = await this.client.retrieveMultipleRecordsAsync<DataverseRow>(TABLE_NAME, options);
      return mapPage(operation, mapPlayer);
    } catch (error) {
      return failed(error, `Could not retrieve a ${TABLE_NAME} page.`);
    }
  }

  async create(model: CricketPlayer): Promise<Result<CricketPlayer>> {
    try {
      const operation = await this.client.createRecordAsync<Record<string, unknown>, DataverseRow>(
        TABLE_NAME,
        toPayload(model),
      );
      return mapOperation(operation, mapPlayer);
    } catch (error) {
      return failed(error, `Could not create a ${TABLE_NAME} record.`);
    }
  }

  async update(model: CricketPlayer): Promise<Result<CricketPlayer>> {
    const id = model.promx_cricketplayerid;
    if (!id) {
      return failed(new Error("A player ID is required for update."), "Could not update a player.");
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

  async updateStatus(
    id: string,
    statusCode: NonNullable<CricketPlayer["statuscode"]>,
  ): Promise<Result<CricketPlayer>> {
    try {
      const operation = await this.client.updateRecordAsync<Record<string, unknown>, DataverseRow>(
        TABLE_NAME,
        id,
        { statuscode: statusCode, statecode: statusCode === 2 ? 1 : 0 },
      );
      if (!operation.success) {
        return failed(operation.error, `Could not update status for ${TABLE_NAME} record ${id}.`);
      }
      return this.getById(id);
    } catch (error) {
      return failed(error, `Could not update status for ${TABLE_NAME} record ${id}.`);
    }
  }

  delete(id: string): Promise<Result<void>> {
    return deleteById(this.client, TABLE_NAME, id);
  }
}
