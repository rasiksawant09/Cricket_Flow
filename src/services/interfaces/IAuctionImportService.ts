import type { AuctionImportPreview, AuctionImportSummary, AuctionTeam } from "../../models/AuctionImport";
import type { RepositoryPage } from "../../repositories/interfaces/RepositoryPage";

export interface IAuctionImportService {
  getActiveTeams(pageSize: number, cursor?: string): Promise<Result<RepositoryPage<AuctionTeam>>>;
  preview(teamIds: readonly string[]): Promise<Result<AuctionImportPreview>>;
  importTeams(teamIds: readonly string[]): Promise<Result<AuctionImportSummary>>;
}