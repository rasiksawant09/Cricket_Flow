import { useContext } from "react";
import { TournamentContext } from "../context/TournamentContextDefinition";
import type { TournamentContextValue } from "../context/TournamentContextDefinition";

export function useTournamentContext(): TournamentContextValue {
  const context = useContext(TournamentContext);
  if (!context) {
    throw new Error("useTournamentContext must be used within TournamentProvider.");
  }
  return context;
}
