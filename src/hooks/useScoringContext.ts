import { useContext } from "react";
import { ScoringContext } from "../context/ScoringContextDefinition";
import type { ScoringContextValue } from "../context/ScoringContextDefinition";

export function useScoringContext(): ScoringContextValue {
  const context = useContext(ScoringContext);
  if (!context) {
    throw new Error("useScoringContext must be used within ScoringProvider.");
  }
  return context;
}
