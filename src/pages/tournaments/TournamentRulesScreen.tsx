import { useParams } from "react-router-dom";
import { TournamentPage } from "../../components/tournaments/TournamentPage";
import { useTournamentContext } from "../../hooks/useTournamentContext";

interface TournamentRulesScreenProps {
  tournamentId?: string;
  embedded?: boolean;
}

export function TournamentRulesScreen({ tournamentId, embedded = false }: TournamentRulesScreenProps) {
  const { id: routeId } = useParams<{ id: string }>();
  const id = tournamentId ?? routeId;
  const { currentTournament } = useTournamentContext();
  const isCurrent = currentTournament?.promx_crickettournamentid === id;

  return (
    <TournamentPage embedded={embedded} title="Tournament Rules" description={isCurrent && currentTournament ? currentTournament.promx_tournamentname : undefined}>
      <p>Rule configuration is not exposed by the current Tournament Context.</p>
    </TournamentPage>
  );
}
