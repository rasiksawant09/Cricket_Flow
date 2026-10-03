import type { DataverseRecord } from "./DataverseRecord";

export interface CricketTournamentTeam extends DataverseRecord<1 | 2> {
  promx_crickettournamentteamid?: string | null;
  promx_groupname?: string | null;
  promx_seednumber?: number | null;
  promx_team: string;
  promx_tournament: string;
  promx_tournamentteamname: string;
}
