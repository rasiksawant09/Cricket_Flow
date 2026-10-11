import type { AuctionPlayer, AuctionTeam, AuctionTeamPlayer } from "../../models/AuctionImport";
import type { RepositoryPage } from "./RepositoryPage";

export interface IAuctionRepository {
  getActiveTeams(pageSize: number, cursor?: string): Promise<Result<RepositoryPage<AuctionTeam>>>;
  getActiveTeamsByIds(ids: readonly string[]): Promise<Result<AuctionTeam[]>>;
  getActiveTeamPlayers(teamId: string, pageSize: number, cursor?: string): Promise<Result<RepositoryPage<AuctionTeamPlayer>>>;
  getActivePlayersByIds(ids: readonly string[]): Promise<Result<AuctionPlayer[]>>;
}