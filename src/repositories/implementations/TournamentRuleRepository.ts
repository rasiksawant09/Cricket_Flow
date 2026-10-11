import type { DataClient } from "@microsoft/power-apps/data";
import type { CricketTournamentRule } from "../../models/CricketTournamentRule";
import type { ITournamentRuleRepository } from "../interfaces/ITournamentRuleRepository";
import {
  commonFields,
  createMapped,
  failed,
  fetchById,
  fetchPage,
  lookupFilter,
  optionalBoolean,
  optionalChoice,
  optionalString,
  pageOptions,
  requiredLookup,
  requiredString,
  updateMapped,
} from "./DataverseRepositorySupport";
import type { DataverseRow } from "./DataverseRepositorySupport";

const TABLE_NAME = "promx_crickettournamentrule";
const STATUS_CODES = [1, 2] as const;
const RULE_CATEGORY_CODES = [796280000, 796280001, 796280002, 796280003, 796280004] as const;
const SELECTED_COLUMNS = [
  "promx_configurationjson",
  "promx_crickettournamentruleid",
  "promx_description",
  "promx_enabled",
  "promx_rulecategory",
  "promx_rulecode",
  "promx_rulename",
  "_promx_tournament_value",
  "statecode",
  "statuscode",
] as const;
const WRITABLE_COLUMNS = [
  "promx_configurationjson",
  "promx_description",
  "promx_enabled",
  "promx_rulecategory",
  "promx_rulecode",
  "promx_rulename",
  "promx_tournament",
  "statecode",
  "statuscode",
] as const;
const LOOKUP_TARGETS = {
  promx_tournament: { entitySetName: "promx_crickettournaments", navigationProperty: "promx_Tournament" },
} as const;

function mapTournamentRule(row: DataverseRow): CricketTournamentRule {
  return {
    ...commonFields(row, STATUS_CODES),
    promx_configurationjson: requiredString(row, "promx_configurationjson"),
    promx_crickettournamentruleid: optionalString(row, "promx_crickettournamentruleid"),
    promx_description: optionalString(row, "promx_description"),
    promx_enabled: optionalBoolean(row, "promx_enabled"),
    promx_rulecategory: optionalChoice(row, "promx_rulecategory", RULE_CATEGORY_CODES),
    promx_rulecode: requiredString(row, "promx_rulecode"),
    promx_rulename: requiredString(row, "promx_rulename"),
    promx_tournament: requiredLookup(row, "promx_tournament"),
  };
}

export class TournamentRuleRepository implements ITournamentRuleRepository {
  private readonly client: DataClient;

  constructor(client: DataClient) {
    this.client = client;
  }

  getById(id: string): Promise<Result<CricketTournamentRule>> {
    return fetchById(this.client, TABLE_NAME, id, SELECTED_COLUMNS, mapTournamentRule);
  }

  getByTournament(tournamentId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketTournamentRule>>> {
    try {
      return fetchPage(this.client, TABLE_NAME, pageOptions(SELECTED_COLUMNS, "promx_rulename asc", pageSize, cursor, lookupFilter("promx_tournament", tournamentId)), mapTournamentRule);
    } catch (error) {
      return Promise.resolve(failed(error, `Could not query ${TABLE_NAME} by tournament.`));
    }
  }

  getEnabledRules(tournamentId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketTournamentRule>>> {
    try {
      const filter = `${lookupFilter("promx_tournament", tournamentId)} and promx_enabled eq true and statecode eq 0`;
      return fetchPage(this.client, TABLE_NAME, pageOptions(SELECTED_COLUMNS, "promx_rulename asc", pageSize, cursor, filter), mapTournamentRule);
    } catch (error) {
      return Promise.resolve(failed(error, `Could not query enabled ${TABLE_NAME} records.`));
    }
  }

  create(model: CricketTournamentRule): Promise<Result<CricketTournamentRule>> {
    return createMapped(this.client, TABLE_NAME, model, WRITABLE_COLUMNS, mapTournamentRule, LOOKUP_TARGETS);
  }

  update(model: CricketTournamentRule): Promise<Result<CricketTournamentRule>> {
    const id = model.promx_crickettournamentruleid;
    if (!id) {
      return Promise.resolve(failed(new Error("A tournament rule ID is required for update."), "Could not update a tournament rule."));
    }
    return updateMapped(this.client, TABLE_NAME, id, model, WRITABLE_COLUMNS, SELECTED_COLUMNS, mapTournamentRule, LOOKUP_TARGETS);
  }
}
