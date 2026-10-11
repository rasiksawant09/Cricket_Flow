import { Tab, TabList } from "@fluentui/react-components";
import { useState } from "react";
import { TournamentPage } from "../../components/tournaments/TournamentPage";
import { MasterPlayersPanel } from "./MasterPlayersPanel";
import { MasterTeamsPanel } from "./MasterTeamsPanel";

type MoreTab = "teams" | "players";

export function MoreScreen() {
  const [tab, setTab] = useState<MoreTab>("teams");

  return (
    <TournamentPage title="More" description="Manage the shared Cricket Flow teams and players used by tournaments.">
      <TabList selectedValue={tab} onTabSelect={(_, data) => setTab(data.value as MoreTab)}>
        <Tab value="teams">Teams</Tab>
        <Tab value="players">Players</Tab>
      </TabList>
      {tab === "teams" ? <MasterTeamsPanel /> : <MasterPlayersPanel />}
    </TournamentPage>
  );
}
