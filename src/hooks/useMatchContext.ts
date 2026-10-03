import { useContext } from "react";
import { MatchContext } from "../context/MatchContextDefinition";
import type { MatchContextValue } from "../context/MatchContextDefinition";

export function useMatchContext(): MatchContextValue {
  const context = useContext(MatchContext);
  if (!context) {
    throw new Error("useMatchContext must be used within MatchProvider.");
  }
  return context;
}
