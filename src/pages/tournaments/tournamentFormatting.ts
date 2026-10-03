import type { CricketTournament } from "../../models/CricketTournament";
import type { CricketTournamentPlayer } from "../../models/CricketTournamentPlayer";

export function formatTournamentDate(value?: string | null): string {
  if (!value) {
    return "Not set";
  }

  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export function tournamentStatusLabel(tournament: CricketTournament): string {
  switch (tournament.statuscode) {
    case 1:
      return "Active";
    case 2:
      return "Completed";
    case 796280001:
      return "Draft";
    case 796280002:
      return "Archived";
    default:
      return "Not set";
  }
}

export function playerCategoryLabel(player: CricketTournamentPlayer): string {
  switch (player.promx_playercategory) {
    case 796280000:
      return "Batsman";
    case 796280001:
      return "Bowler";
    case 796280002:
      return "All Rounder";
    case 796280003:
      return "Wicket Keeper";
    default:
      return "Not set";
  }
}