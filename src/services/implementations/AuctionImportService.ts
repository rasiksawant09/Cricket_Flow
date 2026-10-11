import type { AuctionImportPreview, AuctionImportSummary, AuctionPlayer, AuctionTeam } from "../../models/AuctionImport";
import type { CricketPlayer } from "../../models/CricketPlayer";
import type { CricketTeam } from "../../models/CricketTeam";
import type { IAuctionRepository } from "../../repositories/interfaces/IAuctionRepository";
import type { IPlayerRepository } from "../../repositories/interfaces/IPlayerRepository";
import type { ITeamRepository } from "../../repositories/interfaces/ITeamRepository";
import type { RepositoryPage } from "../../repositories/interfaces/RepositoryPage";
import type { IAuctionImportService } from "../interfaces/IAuctionImportService";
import { readAllPages, serviceFailure } from "./ServiceSupport";

const AUCTION_SOURCE = 796280001;
const ACTIVE_GENDERS = [796280000, 796280001, 796280002] as const;
const IMPORT_PAGE_SIZE = 100;

interface ImportData {
  selectedTeamCount: number;
  activeTeams: AuctionTeam[];
  activePlayers: AuctionPlayer[];
  playersUnavailable: number;
  existingTeamReferences: Set<string>;
  existingPlayerReferences: Set<string>;
}

function normalizedId(value: string): string {
  return value.replace(/[{}]/g, "").toLowerCase();
}

function makeTeamShortName(teamName: string): string {
  const words = teamName.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return words.map((word) => word[0]).join("").slice(0, 100).toUpperCase();
  }
  return (words[0] ?? "TEAM").slice(0, 3).toUpperCase();
}

function validPlayer(player: AuctionPlayer): player is AuctionPlayer & {
  name: string;
  gender: (typeof ACTIVE_GENDERS)[number];
} {
  return Boolean(player.name?.trim()) && ACTIVE_GENDERS.includes(player.gender as (typeof ACTIVE_GENDERS)[number]);
}

export class AuctionImportService implements IAuctionImportService {
  private readonly auction: IAuctionRepository;
  private readonly teams: ITeamRepository;
  private readonly players: IPlayerRepository;

  constructor(auction: IAuctionRepository, teams: ITeamRepository, players: IPlayerRepository) {
    this.auction = auction;
    this.teams = teams;
    this.players = players;
  }

  getActiveTeams(pageSize: number, cursor?: string): Promise<Result<RepositoryPage<AuctionTeam>>> {
    return this.auction.getActiveTeams(pageSize, cursor);
  }

  async preview(teamIds: readonly string[]): Promise<Result<AuctionImportPreview>> {
    const data = await this.loadImportData(teamIds);
    if (!data.success) return data;
    return { success: true, data: this.createPreview(data.data) };
  }

  async importTeams(teamIds: readonly string[]): Promise<Result<AuctionImportSummary>> {
    const dataResult = await this.loadImportData(teamIds);
    if (!dataResult.success) return dataResult;
    const data = dataResult.data;
    const preview = this.createPreview(data);
    const messages: string[] = [];
    let teamsImported = 0;
    let teamsFailed = 0;
    let playersImported = 0;
    let playersFailed = 0;

    for (const team of data.activeTeams) {
      if (!team.name?.trim()) {
        teamsFailed += 1;
        messages.push("An active Auction team has no name and could not be imported.");
        continue;
      }
      if (data.existingTeamReferences.has(normalizedId(team.id))) continue;

      const result = await this.teams.create({
        promx_teamname: team.name.trim(),
        promx_teamshortname: makeTeamShortName(team.name),
        promx_teamcolor: team.teamColor,
        promx_source: AUCTION_SOURCE,
        promx_source_reference_id: team.id,
      } as CricketTeam);
      if (result.success) {
        teamsImported += 1;
        data.existingTeamReferences.add(normalizedId(team.id));
      } else {
        teamsFailed += 1;
        messages.push(`Team "${team.name}" could not be imported: ${result.error.message}`);
      }
    }

    for (const player of data.activePlayers) {
      if (data.existingPlayerReferences.has(normalizedId(player.id))) continue;
      if (!validPlayer(player)) {
        playersFailed += 1;
        messages.push(`Player "${player.name ?? player.id}" is missing a valid name or gender and could not be imported.`);
        continue;
      }
      const result = await this.players.create({
        promx_cricketplayer1: player.name.trim(),
        promx_gender: player.gender,
        promx_source: AUCTION_SOURCE,
        promx_sourcereferenceid: player.id,
      } as CricketPlayer);
      if (result.success) {
        playersImported += 1;
        data.existingPlayerReferences.add(normalizedId(player.id));
      } else {
        playersFailed += 1;
        messages.push(`Player "${player.name}" could not be imported: ${result.error.message}`);
      }
    }

    if (preview.teamsUnavailable > 0) {
      messages.push(`${preview.teamsUnavailable} selected team(s) were no longer active or could not be found.`);
    }
    if (preview.playersUnavailable > 0) {
      messages.push(`${preview.playersUnavailable} linked player(s) were inactive or unavailable and were skipped.`);
    }

    return {
      success: true,
      data: {
        ...preview,
        teamsImported,
        teamsSkipped: preview.teamsAlreadyImported + preview.teamsUnavailable,
        teamsFailed,
        playersImported,
        playersSkipped: preview.playersAlreadyImported + preview.playersUnavailable,
        playersFailed,
        messages,
      },
    };
  }

  private async loadImportData(teamIds: readonly string[]): Promise<Result<ImportData>> {
    const ids = [...new Set(teamIds.map(normalizedId))];
    if (ids.length === 0) {
      return serviceFailure("Select at least one Auction team to import.");
    }

    const sourceTeams = await this.auction.getActiveTeamsByIds(ids);
    if (!sourceTeams.success) return sourceTeams;

    const playerIds = new Set<string>();
    let unavailableLinks = 0;
    for (const team of sourceTeams.data) {
      const links = await readAllPages(
        "Could not retrieve players for an Auction team.",
        (cursor) => this.auction.getActiveTeamPlayers(team.id, IMPORT_PAGE_SIZE, cursor),
      );
      if (!links.success) return links;
      for (const link of links.data) {
        if (link.playerId) playerIds.add(normalizedId(link.playerId));
        else unavailableLinks += 1;
      }
    }

    const sourcePlayers = playerIds.size > 0
      ? await this.auction.getActivePlayersByIds([...playerIds])
      : { success: true as const, data: [] as AuctionPlayer[] };
    if (!sourcePlayers.success) return sourcePlayers;

    const [masterTeams, masterPlayers] = await Promise.all([
      readAllPages("Could not check existing Cricket Flow teams.", (cursor) => this.teams.getAll(IMPORT_PAGE_SIZE, cursor)),
      readAllPages("Could not check existing Cricket Flow players.", (cursor) => this.players.getAll(IMPORT_PAGE_SIZE, cursor)),
    ]);
    if (!masterTeams.success) return masterTeams;
    if (!masterPlayers.success) return masterPlayers;

    const existingTeamReferences = new Set(masterTeams.data
      .filter((team) => team.promx_source === AUCTION_SOURCE && team.promx_source_reference_id)
      .map((team) => normalizedId(team.promx_source_reference_id!)));
    const existingPlayerReferences = new Set(masterPlayers.data
      .filter((player) => player.promx_source === AUCTION_SOURCE && player.promx_sourcereferenceid)
      .map((player) => normalizedId(player.promx_sourcereferenceid!)));
    const activePlayerIds = new Set(sourcePlayers.data.map((player) => normalizedId(player.id)));

    return {
      success: true,
      data: {
        selectedTeamCount: ids.length,
        activeTeams: sourceTeams.data,
        activePlayers: sourcePlayers.data,
        playersUnavailable: playerIds.size - activePlayerIds.size + unavailableLinks,
        existingTeamReferences,
        existingPlayerReferences,
      },
    };
  }

  private createPreview(data: ImportData): AuctionImportPreview {
    const activeTeamsWithNames = data.activeTeams.filter((team) => Boolean(team.name?.trim()));
    const uniquePlayers = new Map(data.activePlayers.map((player) => [normalizedId(player.id), player]));
    const playersToImport = [...uniquePlayers.values()].filter((player) =>
      !data.existingPlayerReferences.has(normalizedId(player.id)) && validPlayer(player),
    ).length;
    return {
      selectedTeamCount: data.selectedTeamCount,
      teamsToImport: activeTeamsWithNames.filter((team) => !data.existingTeamReferences.has(normalizedId(team.id))).length,
      teamsAlreadyImported: activeTeamsWithNames.filter((team) => data.existingTeamReferences.has(normalizedId(team.id))).length,
      teamsUnavailable: data.selectedTeamCount - data.activeTeams.length,
      playersToImport,
      playersAlreadyImported: [...uniquePlayers.keys()].filter((id) => data.existingPlayerReferences.has(id)).length,
      playersUnavailable: data.playersUnavailable,
    };
  }
}