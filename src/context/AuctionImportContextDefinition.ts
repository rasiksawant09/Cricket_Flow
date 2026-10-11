import { createContext } from "react";
import type { IAuctionImportService } from "../services/interfaces/IAuctionImportService";

export const AuctionImportContext = createContext<IAuctionImportService | undefined>(undefined);