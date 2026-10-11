import { getClient } from "@microsoft/power-apps/data";
import type { DataClient } from "@microsoft/power-apps/data";
import { dataSourcesInfo } from "../../.power/schemas/appschemas/dataSourcesInfo";
import powerConfigJson from "../../power.config.json?raw";

interface PowerConfigDataSource {
  logicalName?: string;
  entitySetName?: string;
}

interface PowerConfig {
  databaseReferences?: Record<string, {
    dataSources?: Record<string, PowerConfigDataSource>;
  }>;
}

function getLogicalToEntitySetMap(): Map<string, string> {
  const configuration = JSON.parse(powerConfigJson) as PowerConfig;
  const mappings = new Map<string, string>();
  for (const database of Object.values(configuration.databaseReferences ?? {})) {
    for (const source of Object.values(database.dataSources ?? {})) {
      if (source.logicalName && source.entitySetName) {
        mappings.set(source.logicalName, source.entitySetName);
      }
    }
  }
  return mappings;
}

export function createRuntimeDataClient(): DataClient {
  const sdkClient = getClient(dataSourcesInfo);
  const logicalToEntitySet = getLogicalToEntitySetMap();

  return new Proxy(sdkClient, {
    get(target, property, receiver) {
      const member = Reflect.get(target, property, receiver) as unknown;
      if (typeof member !== "function" || property === "executeAsync") {
        return member;
      }
      return (...args: unknown[]) => {
        const tableName = args[0];
        if (typeof tableName === "string") {
          args[0] = logicalToEntitySet.get(tableName) ?? tableName;
        }
        return (member as (...parameters: unknown[]) => unknown).apply(target, args);
      };
    },
  });
}