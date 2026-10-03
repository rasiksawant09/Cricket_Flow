import type { CricketMatch } from "../../models/CricketMatch";

export function formatScheduledDate(value?: string | null): string {
  if (!value) {
    return "Not scheduled";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function matchStatusLabel(match: CricketMatch): string {
  switch (match.statuscode) {
    case 1:
      return "Draft";
    case 2:
      return "Completed";
    case 796280001:
      return "Ready";
    case 796280002:
      return "Live";
    case 796280003:
      return "Innings break";
    case 796280004:
      return "Super over required";
    case 796280005:
      return "Super over live";
    case 796280006:
      return "Interrupted";
    case 796280007:
      return "Abandoned";
    case 796280008:
      return "Cancelled";
    default:
      return "Not set";
  }
}

export function matchStageLabel(stage: CricketMatch["promx_matchstage"]): string {
  switch (stage) {
    case 796280000:
      return "League";
    case 796280001:
      return "Quarter final";
    case 796280002:
      return "Semi final";
    case 796280003:
      return "Final";
    case 796280004:
      return "Third place";
    case 796280005:
      return "Custom";
    default:
      return "Not set";
  }
}

export function tossStatusLabel(match: CricketMatch, teamNames: ReadonlyMap<string, string>): string {
  if (!match.promx_tosswinner && match.promx_tossdecision == null) {
    return "Not recorded";
  }
  if (!match.promx_tosswinner || match.promx_tossdecision == null) {
    return "Incomplete toss details";
  }

  const winner = teamNames.get(match.promx_tosswinner) ?? "Unknown team";
  const decision = match.promx_tossdecision === 796280000 ? "bat" : "bowl";
  return `${winner} won the toss and chose to ${decision}.`;
}

export function resultStatusLabel(match: CricketMatch, teamNames: ReadonlyMap<string, string>): string {
  switch (match.promx_resulttype) {
    case 796280000:
      return match.promx_winner
        ? `${teamNames.get(match.promx_winner) ?? "Unknown team"} won`
        : "Normal win";
    case 796280001:
      return "Tie";
    case 796280002:
      return "No result";
    case 796280003:
      return "Abandoned";
    case 796280004:
      return match.promx_winner
        ? `${teamNames.get(match.promx_winner) ?? "Unknown team"} won the super over`
        : "Super over win";
    default:
      return "Not recorded";
  }
}