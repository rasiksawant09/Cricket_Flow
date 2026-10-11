import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Dropdown,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Option,
  Spinner,
} from "@fluentui/react-components";
import { useState } from "react";
import type { FormEvent } from "react";
import type { CricketMatch } from "../../models/CricketMatch";
import type { CricketTournament } from "../../models/CricketTournament";
import type { CricketTournamentTeam } from "../../models/CricketTournamentTeam";

interface MatchCreationDialogProps {
  tournaments: readonly CricketTournament[];
  teams: readonly CricketTournamentTeam[];
  onTournamentSelected(tournamentId: string): Promise<Result<CricketTournamentTeam[]>>;
  onCreate(match: CricketMatch): Promise<Result<CricketMatch>>;
}

export function MatchCreationDialog({ tournaments, teams, onTournamentSelected, onCreate }: MatchCreationDialogProps) {
  const [open, setOpen] = useState(false);
  const [tournamentId, setTournamentId] = useState("");
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [matchNumber, setMatchNumber] = useState("");
  const [scheduled, setScheduled] = useState("");
  const [error, setError] = useState<Error | null>(null);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [saving, setSaving] = useState(false);
  const registeredTeams = teams.filter((team) => team.promx_tournament === tournamentId && team.promx_crickettournamentteamid);

  async function changeTournament(nextTournamentId: string) {
    setTournamentId(nextTournamentId);
    setTeamA("");
    setTeamB("");
    setError(null);
    if (!nextTournamentId) return;
    setLoadingTeams(true);
    const result = await onTournamentSelected(nextTournamentId);
    if (!result.success) setError(result.error);
    setLoadingTeams(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const tournament = tournaments.find((item) => item.promx_crickettournamentid === tournamentId);
    if (!tournament || !teamA || !teamB || !matchNumber) return;
    setSaving(true);
    setError(null);
    try {
      const result = await onCreate({
        promx_tournament: tournamentId,
        promx_teama: teamA,
        promx_teamb: teamB,
        promx_matchnumber: Number(matchNumber),
        promx_matchname: `Match ${matchNumber}`,
        promx_scheduleddatetime: scheduled ? new Date(scheduled).toISOString() : null,
        statuscode: 1,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setTournamentId("");
      setTeamA("");
      setTeamB("");
      setMatchNumber("");
      setScheduled("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError : new Error("Could not create match."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(_, data) => setOpen(data.open)}>
      <DialogTrigger disableButtonEnhancement><Button appearance="primary">Create Match</Button></DialogTrigger>
      <DialogSurface>
        <form onSubmit={(event) => void submit(event)}>
          <DialogBody>
            <DialogTitle>Create Match</DialogTitle>
            <DialogContent style={{ display: "grid", gap: "12px" }}>
              {error && <MessageBar intent="error"><MessageBarBody>{error.message}</MessageBarBody></MessageBar>}
              <Field label="Tournament" required>
                <Dropdown aria-label="Tournament" placeholder="Select a tournament"
                  value={tournaments.find((item) => item.promx_crickettournamentid === tournamentId)?.promx_tournamentname ?? ""}
                  selectedOptions={tournamentId ? [tournamentId] : []}
                  onOptionSelect={(_, data) => void changeTournament(data.optionValue ?? "")}>
                  {tournaments.map((tournament) => tournament.promx_crickettournamentid
                    ? <Option key={tournament.promx_crickettournamentid} value={tournament.promx_crickettournamentid}>{tournament.promx_tournamentname}</Option>
                    : null)}
                </Dropdown>
              </Field>
              <Field label="Match number" required>
                <Input type="number" min="1" step="1" required value={matchNumber} onChange={(_, data) => setMatchNumber(data.value)} />
              </Field>
              <Field label="Scheduled date">
                <Input type="datetime-local" value={scheduled} onChange={(_, data) => setScheduled(data.value)} />
              </Field>
              <Field label="Team A" required>
                <Dropdown aria-label="Team A" placeholder={loadingTeams ? "Loading teams" : "Select Team A"}
                  disabled={!tournamentId || loadingTeams}
                  value={registeredTeams.find((team) => team.promx_crickettournamentteamid === teamA)?.promx_tournamentteamname ?? ""}
                  selectedOptions={teamA ? [teamA] : []}
                  onOptionSelect={(_, data) => setTeamA(data.optionValue ?? "")}>
                  {registeredTeams.map((team) => <Option key={team.promx_crickettournamentteamid} value={team.promx_crickettournamentteamid!}>{team.promx_tournamentteamname}</Option>)}
                </Dropdown>
              </Field>
              <Field label="Team B" required>
                <Dropdown aria-label="Team B" placeholder={loadingTeams ? "Loading teams" : "Select Team B"}
                  disabled={!tournamentId || loadingTeams}
                  value={registeredTeams.find((team) => team.promx_crickettournamentteamid === teamB)?.promx_tournamentteamname ?? ""}
                  selectedOptions={teamB ? [teamB] : []}
                  onOptionSelect={(_, data) => setTeamB(data.optionValue ?? "")}>
                  {registeredTeams.map((team) => <Option key={team.promx_crickettournamentteamid} value={team.promx_crickettournamentteamid!}>{team.promx_tournamentteamname}</Option>)}
                </Dropdown>
              </Field>
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement><Button appearance="secondary" disabled={saving}>Cancel</Button></DialogTrigger>
              <Button appearance="primary" type="submit" disabled={saving || loadingTeams || !tournamentId || !matchNumber || !teamA || !teamB || teamA === teamB}>
                {saving ? <Spinner size="tiny" label="Creating match" /> : "Create Match"}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  );
}