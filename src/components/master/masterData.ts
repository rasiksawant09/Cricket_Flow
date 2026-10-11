export const GENDER_OPTIONS = [
  { value: 796280000, label: "Male" },
  { value: 796280001, label: "Female" },
  { value: 796280002, label: "Other" },
] as const;

export const PLAYER_CATEGORY_OPTIONS = [
  { value: 796280000, label: "Batsman" },
  { value: 796280001, label: "Bowler" },
  { value: 796280002, label: "All Rounder" },
  { value: 796280003, label: "Wicket Keeper" },
] as const;

const SOURCE_LABELS: Record<number, string> = {
  796280000: "Manual",
  796280001: "Auction",
  796280002: "Import",
};

export function genderLabel(value?: number | null): string {
  return GENDER_OPTIONS.find((option) => option.value === value)?.label ?? "Not set";
}

export function sourceLabel(value?: number | null): string {
  return value == null ? "Not set" : SOURCE_LABELS[value] ?? "Not set";
}
