import type { DataClient, IOperationOptions, IOperationResult } from "@microsoft/power-apps/data";
import type { DataverseRecord } from "../../models/DataverseRecord";

export type DataverseRow = Record<string, unknown>;
interface LookupTarget {
  entitySetName: string;
  navigationProperty: string;
}
type LookupTargets = Readonly<Record<string, string | LookupTarget>>;
type RowMapper<T> = (row: DataverseRow) => T;

export function asError(error: unknown, fallback: string): Error {
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

export function failed<T>(error: unknown, fallback: string): Result<T> {
  return { success: false, error: asError(error, fallback) };
}

export function optionalString(row: DataverseRow, column: string): string | null | undefined {
  const value = row[column];
  if (value === undefined || value === null) {
    return value;
  }
  if (typeof value !== "string") {
    throw new Error(`Expected ${column} to be a string.`);
  }
  return value;
}

export function optionalLookup(row: DataverseRow, column: string): string | null | undefined {
  const apiColumn = `_${column}_value`;
  const value = Object.prototype.hasOwnProperty.call(row, apiColumn) ? row[apiColumn] : row[column];
  if (value === undefined || value === null) {
    return value;
  }
  if (typeof value !== "string") {
    throw new Error(`Expected lookup ${column} to be a GUID string.`);
  }
  return value;
}

export function requiredLookup(row: DataverseRow, column: string): string {
  const value = optionalLookup(row, column);
  if (value === undefined || value === null) {
    throw new Error(`Required Dataverse lookup ${column} was not returned.`);
  }
  return value;
}

export function requiredString(row: DataverseRow, column: string): string {
  const value = optionalString(row, column);
  if (value === undefined || value === null) {
    throw new Error(`Required Dataverse column ${column} was not returned.`);
  }
  return value;
}

export function optionalNumber(row: DataverseRow, column: string): number | null | undefined {
  const value = row[column];
  if (value === undefined || value === null) {
    return value;
  }
  if (typeof value !== "number") {
    throw new Error(`Expected ${column} to be a number.`);
  }
  return value;
}

export function requiredNumber(row: DataverseRow, column: string): number {
  const value = optionalNumber(row, column);
  if (value === undefined || value === null) {
    throw new Error(`Required Dataverse column ${column} was not returned.`);
  }
  return value;
}

export function optionalBoolean(row: DataverseRow, column: string): boolean | null | undefined {
  const value = row[column];
  if (value === undefined || value === null) {
    return value;
  }
  if (typeof value !== "boolean") {
    throw new Error(`Expected ${column} to be a boolean.`);
  }
  return value;
}

export function optionalChoice<T extends number>(
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

export function requiredChoice<T extends number>(
  row: DataverseRow,
  column: string,
  choices: readonly T[],
): T {
  const value = optionalChoice(row, column, choices);
  if (value === undefined || value === null) {
    throw new Error(`Required Dataverse choice ${column} was not returned.`);
  }
  return value;
}

export function commonFields<TStatusCode extends number>(
  row: DataverseRow,
  statusCodes: readonly TStatusCode[],
): Pick<DataverseRecord<TStatusCode>, "statecode" | "statuscode"> {
  return {
    statecode: optionalChoice(row, "statecode", [0, 1] as const),
    statuscode: optionalChoice(row, "statuscode", statusCodes),
  };
}

export function mapOperation<T>(
  operation: IOperationResult<DataverseRow>,
  tableName: string,
  mapper: RowMapper<T>,
): Result<T> {
  if (!operation.success) {
    return failed(operation.error, `Dataverse request failed for ${tableName}.`);
  }
  try {
    return { success: true, data: mapper(operation.data) };
  } catch (error) {
    return failed(error, `Could not map a ${tableName} record.`);
  }
}

export function mapPage<T>(
  operation: IOperationResult<DataverseRow[]>,
  tableName: string,
  mapper: RowMapper<T>,
): Result<RepositoryPage<T>> {
  if (!operation.success) {
    return failed(operation.error, `Dataverse request failed for ${tableName}.`);
  }
  try {
    const page: RepositoryPage<T> = { items: operation.data.map(mapper) };
    if (operation.skipToken !== undefined) {
      page.nextCursor = operation.skipToken;
    }
    return { success: true, data: page };
  } catch (error) {
    return failed(error, `Could not map a ${tableName} page.`);
  }
}

export function pageOptions(
  selectedColumns: readonly string[],
  orderBy: string,
  pageSize?: number,
  cursor?: string,
  filter?: string,
): IOperationOptions {
  const options: IOperationOptions = {
    select: [...selectedColumns],
    orderBy: [orderBy],
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
  return options;
}

export function lookupFilter(column: string, id: string): string {
  const normalizedId = id.replace(/[{}]/g, "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalizedId)) {
    throw new Error(`Invalid GUID supplied for lookup ${column}.`);
  }
  return `_${column}_value eq ${normalizedId}`;
}

export function toPayload<TModel extends object>(
  model: TModel,
  writableColumns: readonly string[],
  lookupTargets: LookupTargets = {},
  inactiveStatuses: readonly number[] = [2],
): Record<string, unknown> {
  const values = model as unknown as Record<string, unknown>;
  const payload: Record<string, unknown> = {};
  for (const column of writableColumns) {
    const value = values[column];
    if (value === undefined) {
      continue;
    }
    const target = lookupTargets[column];
    const entitySet = typeof target === "string" ? target : target?.entitySetName;
    const navigationProperty = typeof target === "string" ? column : target?.navigationProperty;
    if (entitySet !== undefined && navigationProperty !== undefined && typeof value === "string") {
      const normalizedId = value.replace(/[{}]/g, "");
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalizedId)) {
        throw new Error(`Invalid GUID supplied for lookup ${column}.`);
      }
      payload[`${navigationProperty}@odata.bind`] = `/${entitySet}(${normalizedId})`;
    } else if (entitySet !== undefined && navigationProperty !== undefined && value === null) {
      payload[`${navigationProperty}@odata.bind`] = null;
    } else {
      payload[column] = value;
    }
  }
  // Dataverse rejects a statuscode that doesn't belong to the statecode sent, so derive the state from the status.
  if (typeof payload.statuscode === "number") {
    payload.statecode = inactiveStatuses.includes(payload.statuscode) ? 1 : 0;
  }
  return payload;
}

export function fetchById<T>(
  client: DataClient,
  tableName: string,
  id: string,
  selectedColumns: readonly string[],
  mapper: RowMapper<T>,
): Promise<Result<T>> {
  return executeRecord(
    () => client.retrieveRecordAsync<DataverseRow>(tableName, id, { select: [...selectedColumns] }),
    tableName,
    mapper,
  );
}

export async function fetchPage<T>(
  client: DataClient,
  tableName: string,
  options: IOperationOptions,
  mapper: RowMapper<T>,
): Promise<Result<RepositoryPage<T>>> {
  try {
    const operation = await client.retrieveMultipleRecordsAsync<DataverseRow>(tableName, options);
    return mapPage(operation, tableName, mapper);
  } catch (error) {
    return failed(error, `Could not retrieve a ${tableName} page.`);
  }
}

export async function createMapped<TModel extends object, TResult>(
  client: DataClient,
  tableName: string,
  model: TModel,
  writableColumns: readonly string[],
  mapper: RowMapper<TResult>,
  lookupTargets?: LookupTargets,
  inactiveStatuses?: readonly number[],
): Promise<Result<TResult>> {
  try {
    const payload = toPayload(model, writableColumns, lookupTargets, inactiveStatuses);
    const operation = await client.createRecordAsync<Record<string, unknown>, DataverseRow>(tableName, payload);
    return mapOperation(operation, tableName, mapper);
  } catch (error) {
    return failed(error, `Could not create a ${tableName} record.`);
  }
}

export async function updateMapped<TModel extends object, TResult>(
  client: DataClient,
  tableName: string,
  id: string,
  model: TModel,
  writableColumns: readonly string[],
  selectedColumns: readonly string[],
  mapper: RowMapper<TResult>,
  lookupTargets?: LookupTargets,
  inactiveStatuses?: readonly number[],
): Promise<Result<TResult>> {
  try {
    const payload = toPayload(model, writableColumns, lookupTargets, inactiveStatuses);
    const operation = await client.updateRecordAsync<Record<string, unknown>, DataverseRow>(tableName, id, payload);
    if (!operation.success) {
      return failed(operation.error, `Could not update ${tableName} record ${id}.`);
    }
    return fetchById(client, tableName, id, selectedColumns, mapper);
  } catch (error) {
    return failed(error, `Could not update ${tableName} record ${id}.`);
  }
}

export async function updateStatusAndFetch<TResult, TStatusCode extends number>(
  client: DataClient,
  tableName: string,
  id: string,
  statusCode: TStatusCode,
  selectedColumns: readonly string[],
  mapper: RowMapper<TResult>,
  inactiveStatuses: readonly number[] = [2],
): Promise<Result<TResult>> {
  try {
    const operation = await client.updateRecordAsync<Record<string, unknown>, DataverseRow>(
      tableName,
      id,
      { statuscode: statusCode, statecode: inactiveStatuses.includes(statusCode) ? 1 : 0 },
    );
    if (!operation.success) {
      return failed(operation.error, `Could not update status for ${tableName} record ${id}.`);
    }
    return fetchById(client, tableName, id, selectedColumns, mapper);
  } catch (error) {
    return failed(error, `Could not update status for ${tableName} record ${id}.`);
  }
}

export async function deleteById(client: DataClient, tableName: string, id: string): Promise<Result<void>> {
  try {
    const operation = await client.deleteRecordAsync(tableName, id);
    if (!operation.success) {
      return failed(operation.error, `Could not delete ${tableName} record ${id}.`);
    }
    return { success: true, data: undefined };
  } catch (error) {
    return failed(error, `Could not delete ${tableName} record ${id}.`);
  }
}

export async function findExistingId(
  client: DataClient,
  tableName: string,
  idColumn: string,
  filter: string,
): Promise<Result<string | null>> {
  try {
    const operation = await client.retrieveMultipleRecordsAsync<DataverseRow>(tableName, {
      select: [idColumn],
      filter,
      top: 1,
    });
    if (!operation.success) {
      return failed(operation.error, `Could not query ${tableName} for an existing record.`);
    }
    if (operation.data.length === 0) {
      return { success: true, data: null };
    }
    const id = operation.data[0]?.[idColumn];
    if (typeof id !== "string") {
      return failed(new Error(`The ${tableName} query returned no ${idColumn}.`), `Could not identify ${tableName} record.`);
    }
    return { success: true, data: id };
  } catch (error) {
    return failed(error, `Could not query ${tableName} for an existing record.`);
  }
}

async function executeRecord<T>(
  request: () => Promise<IOperationResult<DataverseRow>>,
  tableName: string,
  mapper: RowMapper<T>,
): Promise<Result<T>> {
  try {
    return mapOperation(await request(), tableName, mapper);
  } catch (error) {
    return failed(error, `Could not retrieve a ${tableName} record.`);
  }
}
