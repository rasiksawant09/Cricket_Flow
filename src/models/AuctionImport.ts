export interface AuctionTeam {
  id: string;
  name: string | null;
  auctionName: string | null;
  createdOn: string | null;
  teamColor: string | null;
}

export interface AuctionTeamPlayer {
  teamId: string;
  playerId: string | null;
}

export interface AuctionPlayer {
  id: string;
  name: string | null;
  gender: number | null;
}

export interface AuctionImportPreview {
  selectedTeamCount: number;
  teamsToImport: number;
  teamsAlreadyImported: number;
  teamsUnavailable: number;
  playersToImport: number;
  playersAlreadyImported: number;
  playersUnavailable: number;
}

export interface AuctionImportSummary extends AuctionImportPreview {
  teamsImported: number;
  teamsSkipped: number;
  teamsFailed: number;
  playersImported: number;
  playersSkipped: number;
  playersFailed: number;
  messages: string[];
}