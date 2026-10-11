import { useMemo } from "react";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import type { DataClient } from "@microsoft/power-apps/data";
import { RouterProvider as ReactRouterProvider } from "react-router-dom";
import { MatchProvider } from "../context/MatchContext";
import { ScoringProvider } from "../context/ScoringContext";
import { TournamentProvider } from "../context/TournamentContext";
import { AuctionImportProvider } from "../context/AuctionImportContext";
import { appRouter } from "../routing/routeDefinitions";
import { createMatchServices } from "./createMatchServices";
import { createScoringServices } from "./createScoringServices";
import { createTournamentServices } from "./createTournamentServices";

interface TournamentModuleProps {
  client: DataClient;
}

export function TournamentModule({ client }: TournamentModuleProps) {
  const services = useMemo(() => createTournamentServices(client), [client]);
  const { auctionImportService, ...tournamentServices } = services;
  const matchServices = useMemo(() => createMatchServices(client), [client]);
  const scoringServices = useMemo(() => createScoringServices(client), [client]);

  return (
    <FluentProvider theme={webLightTheme}>
      <TournamentProvider
        {...tournamentServices}
        standingService={scoringServices.standingService}
        statisticsService={scoringServices.statisticsService}
      >
        <MatchProvider {...matchServices} statisticsService={scoringServices.statisticsService}>
          <ScoringProvider {...scoringServices}>
            <AuctionImportProvider service={auctionImportService}>
              <ReactRouterProvider router={appRouter} />
            </AuctionImportProvider>
          </ScoringProvider>
        </MatchProvider>
      </TournamentProvider>
    </FluentProvider>
  );
}
