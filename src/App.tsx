import { FluentProvider, MessageBar, MessageBarBody, webLightTheme } from "@fluentui/react-components";
import type { DataClient } from "@microsoft/power-apps/data";
import { TournamentModule } from "./app/TournamentModule";

interface AppProps {
  dataClient?: DataClient;
}

function App({ dataClient }: AppProps) {
  if (!dataClient) {
    return (
      <FluentProvider theme={webLightTheme}>
        <main>
          <MessageBar intent="warning">
            <MessageBarBody>
              Configure the existing Dataverse data sources and provide their DataClient to load tournament records.
            </MessageBarBody>
          </MessageBar>
        </main>
      </FluentProvider>
    );
  }

  return <TournamentModule client={dataClient} />;
}

export default App
