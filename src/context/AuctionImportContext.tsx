import type { ReactNode } from "react";
import type { IAuctionImportService } from "../services/interfaces/IAuctionImportService";
import { AuctionImportContext } from "./AuctionImportContextDefinition";

interface AuctionImportProviderProps {
  children: ReactNode;
  service: IAuctionImportService;
}

export function AuctionImportProvider({ children, service }: AuctionImportProviderProps) {
  return <AuctionImportContext.Provider value={service}>{children}</AuctionImportContext.Provider>;
}