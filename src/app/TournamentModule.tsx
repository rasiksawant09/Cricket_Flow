import { useMemo } from "react";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import type { DataClient } from "@microsoft/power-apps/data";
import { RouterProvider as ReactRouterProvider } from "react-router-dom";
import { MatchProvider } from "../context/MatchContext";
import { TournamentProvider } from "../context/TournamentContext";
import { appRouter } from "../routing/routeDefinitions";
import { createMatchServices } from "./createMatchServices";
import { createTournamentServices } from "./createTournamentServices";

interface TournamentModuleProps {
  client: DataClient;
}

export function TournamentModule({ client }: TournamentModuleProps) {
  const services = useMemo(() => createTournamentServices(client), [client]);
  const matchServices = useMemo(() => createMatchServices(client), [client]);

  return (
    <FluentProvider theme={webLightTheme}>
      <TournamentProvider {...services}>
        <MatchProvider {...matchServices}>
          <ReactRouterProvider router={appRouter} />
        </MatchProvider>
      </TournamentProvider>
    </FluentProvider>
  );
}
