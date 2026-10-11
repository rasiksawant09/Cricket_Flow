import { useContext } from "react";
import { AuctionImportContext } from "../context/AuctionImportContextDefinition";

export function useAuctionImportContext() {
  const context = useContext(AuctionImportContext);
  if (!context) {
    throw new Error("useAuctionImportContext must be used within AuctionImportProvider.");
  }
  return context;
}