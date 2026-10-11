import type { DataClient } from "@microsoft/power-apps/data";
import type { AuctionPlayer, AuctionTeam, AuctionTeamPlayer } from "../../models/AuctionImport";
import type { IAuctionRepository } from "../interfaces/IAuctionRepository";
import type { RepositoryPage } from "../interfaces/RepositoryPage";
import {
  failed,
  fetchPage,
  optionalLookup,
  optionalNumber,
  optionalString,
  pageOptions,
} from "./DataverseRepositorySupport";
import type { DataverseRow } from "./DataverseRepositorySupport";

const TEAM_TABLE = "promx_team";
const TEAM_PLAYER_TABLE = "promx_teamplayer";
const PLAYER_TABLE = "promx_player";
const ACTIVE_FILTER = "statecode eq 0 and statuscode eq 1";
const TEAM_COLUMNS = ["promx_teamid", "promx_teamname", "promx_teamcolor", "createdon", "_promx_auction_value"];
const TEAM_PLAYER_COLUMNS = ["_promx_team_value", "_promx_player_value"];
const PLAYER_COLUMNS = ["promx_playerid", "promx_playername", "promx_playergender"];
const QUERY_BATCH_SIZE = 40;

function mapTeam(row: DataverseRow): AuctionTeam {
  const auctionId = optionalLookup(row, "promx_auction");
  const formattedAuction = row["_promx_auction_value@OData.Community.Display.V1.FormattedValue"];
  return {
    id: requiredString(row, "promx_teamid"),
    name: optionalString(row, "promx_teamname") ?? null,
    auctionName: typeof formattedAuction === "string" ? formattedAuction : auctionId ?? null,
    createdOn: optionalString(row, "createdon") ?? null,
    teamColor: optionalString(row, "promx_teamcolor") ?? null,
  };
}

function mapTeamPlayer(row: DataverseRow): AuctionTeamPlayer {
  const teamId = optionalLookup(row, "promx_team");
  if (!teamId) {
    throw new Error("An active Auction team-player row has no team reference.");
  }
  return { teamId, playerId: optionalLookup(row, "promx_player") ?? null };
}

function mapPlayer(row: DataverseRow): AuctionPlayer {
  return {
    id: requiredString(row, "promx_playerid"),
    name: optionalString(row, "promx_playername") ?? null,
    gender: optionalNumber(row, "promx_playergender") ?? null,
  };
}

function requiredString(row: DataverseRow, column: string): string {
  const value = optionalString(row, column);
  if (!value) {
    throw new Error(`Required Auction field ${column} was not returned.`);
  }
  return value;
}

function idFilter(column: string, ids: readonly string[]): string {
  const clauses = ids.map((id) => {
    const normalized = id.replace(/[{}]/g, "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalized)) {
      throw new Error(`Auction returned an invalid record ID for ${column}.`);
    }
    return `${column} eq ${normalized}`;
  });
  return `(${clauses.join(" or ")})`;
}

async function collectPages<T>(
  readPage: (cursor?: string) => Promise<Result<RepositoryPage<T>>>,
): Promise<Result<T[]>> {
  const items: T[] = [];
  let cursor: string | undefined;
  do {
    const result = await readPage(cursor);
    if (!result.success) return result;
    items.push(...result.data.items);
    cursor = result.data.nextCursor;
  } while (cursor !== undefined);
  return { success: true, data: items };
}

export class AuctionRepository implements IAuctionRepository {
  private readonly client: DataClient;

  constructor(client: DataClient) {
    this.client = client;
  }

  getActiveTeams(pageSize: number, cursor?: string): Promise<Result<RepositoryPage<AuctionTeam>>> {
    return fetchPage(
      this.client,
      TEAM_TABLE,
      pageOptions(TEAM_COLUMNS, "promx_teamname asc", pageSize, cursor, ACTIVE_FILTER),
      mapTeam,
    );
  }

  async getActiveTeamsByIds(ids: readonly string[]): Promise<Result<AuctionTeam[]>> {
    const teams: AuctionTeam[] = [];
    for (let offset = 0; offset < ids.length; offset += QUERY_BATCH_SIZE) {
      const batch = ids.slice(offset, offset + QUERY_BATCH_SIZE);
      let cursor: string | undefined;
      do {
        const page = await fetchPage(
          this.client,
          TEAM_TABLE,
          pageOptions(TEAM_COLUMNS, "promx_teamname asc", 100, cursor, `${ACTIVE_FILTER} and ${idFilter("promx_teamid", batch)}`),
          mapTeam,
        );
        if (!page.success) return page;
        teams.push(...page.data.items);
        cursor = page.data.nextCursor;
      } while (cursor !== undefined);
    }
    return { success: true, data: teams };
  }

  getActiveTeamPlayers(teamId: string, pageSize: number, cursor?: string): Promise<Result<RepositoryPage<AuctionTeamPlayer>>> {
    const normalized = teamId.replace(/[{}]/g, "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalized)) {
      return Promise.resolve(failed(new Error("The selected Auction team ID is invalid."), "Could not retrieve Auction team players."));
    }
    return fetchPage(
      this.client,
      TEAM_PLAYER_TABLE,
      pageOptions(TEAM_PLAYER_COLUMNS, "promx_teamplayerid asc", pageSize, cursor, `${ACTIVE_FILTER} and _promx_team_value eq ${normalized}`),
      mapTeamPlayer,
    );
  }

  async getActivePlayersByIds(ids: readonly string[]): Promise<Result<AuctionPlayer[]>> {
    const players: AuctionPlayer[] = [];
    for (let offset = 0; offset < ids.length; offset += QUERY_BATCH_SIZE) {
      const batch = ids.slice(offset, offset + QUERY_BATCH_SIZE);
      const result = await collectPages((cursor) => fetchPage(
        this.client,
        PLAYER_TABLE,
        pageOptions(PLAYER_COLUMNS, "promx_playername asc", 100, cursor, `${ACTIVE_FILTER} and ${idFilter("promx_playerid", batch)}`),
        mapPlayer,
      ));
      if (!result.success) return result;
      players.push(...result.data);
    }
    return { success: true, data: players };
  }
}