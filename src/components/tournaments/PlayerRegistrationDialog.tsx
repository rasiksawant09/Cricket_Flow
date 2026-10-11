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
import type { CricketPlayer } from "../../models/CricketPlayer";
import type { CricketTournamentPlayer } from "../../models/CricketTournamentPlayer";
import type { CricketTournamentTeam } from "../../models/CricketTournamentTeam";

const CATEGORIES = [
  [796280000, "Batsman"],
  [796280001, "Bowler"],
  [796280002, "All Rounder"],
  [796280003, "Wicket Keeper"],
] as const;

interface PlayerRegistrationDialogProps {
  tournamentId: string;
  triggerLabel?: string;
  players: readonly CricketPlayer[];
  teams: readonly CricketTournamentTeam[];
  registrations: readonly CricketTournamentPlayer[];
  onRegister(player: CricketTournamentPlayer): Promise<Result<CricketTournamentPlayer>>;
}

export function PlayerRegistrationDialog({ tournamentId, triggerLabel = "Register Existing Player", players, teams, registrations, onRegister }: PlayerRegistrationDialogProps) {
  const [open, setOpen] = useState(false);
  const [playerId, setPlayerId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [category, setCategory] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [age, setAge] = useState("");
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);
  const availablePlayers = players.filter((player) => player.promx_cricketplayerid
    && !registrations.some((registration) => registration.promx_player === player.promx_cricketplayerid));
  const availableTeams = teams.filter((team) => team.promx_crickettournamentteamid);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedPlayer = availablePlayers.find((player) => player.promx_cricketplayerid === playerId);
    if (!selectedPlayer?.promx_cricketplayerid || !teamId) return;
    setSaving(true);
    setError(null);
    try {
      const result = await onRegister({
        promx_tournament: tournamentId,
        promx_tournamentteam: teamId,
        promx_player: selectedPlayer.promx_cricketplayerid,
        promx_tournamentplayername: selectedPlayer.promx_cricketplayer1,
        promx_playercategory: category ? Number(category) as CricketTournamentPlayer["promx_playercategory"] : null,
        promx_jerseynumber: jerseyNumber ? Number(jerseyNumber) : null,
        promx_age: age ? Number(age) : null,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setPlayerId("");
      setTeamId("");
      setCategory("");
      setJerseyNumber("");
      setAge("");
      setOpen(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError : new Error("Could not register player."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(_, data) => setOpen(data.open)}>
      <DialogTrigger disableButtonEnhancement><Button appearance="secondary">{triggerLabel}</Button></DialogTrigger>
      <DialogSurface>
        <form onSubmit={(event) => void submit(event)}>
          <DialogBody>
            <DialogTitle>Register Player</DialogTitle>
            <DialogContent style={{ display: "grid", gap: "12px" }}>
              {error && <MessageBar intent="error"><MessageBarBody>{error.message}</MessageBarBody></MessageBar>}
              <Field label="Player" required>
                <Dropdown aria-label="Player" placeholder="Select a player"
                  value={availablePlayers.find((player) => player.promx_cricketplayerid === playerId)?.promx_cricketplayer1 ?? ""}
                  selectedOptions={playerId ? [playerId] : []}
                  onOptionSelect={(_, data) => setPlayerId(data.optionValue ?? "")}>
                  {availablePlayers.map((player) => <Option key={player.promx_cricketplayerid} value={player.promx_cricketplayerid!}>{player.promx_cricketplayer1}</Option>)}
                </Dropdown>
              </Field>
              <Field label="Tournament team" required>
                <Dropdown aria-label="Tournament team" placeholder="Select a team"
                  value={availableTeams.find((team) => team.promx_crickettournamentteamid === teamId)?.promx_tournamentteamname ?? ""}
                  selectedOptions={teamId ? [teamId] : []}
                  onOptionSelect={(_, data) => setTeamId(data.optionValue ?? "")}>
                  {availableTeams.map((team) => <Option key={team.promx_crickettournamentteamid} value={team.promx_crickettournamentteamid!}>{team.promx_tournamentteamname}</Option>)}
                </Dropdown>
              </Field>
              <Field label="Category">
                <Dropdown aria-label="Player category" placeholder="Select category"
                  value={CATEGORIES.find(([value]) => String(value) === category)?.[1] ?? ""}
                  selectedOptions={category ? [category] : []}
                  onOptionSelect={(_, data) => setCategory(data.optionValue ?? "")}>
                  {CATEGORIES.map(([value, label]) => <Option key={value} value={String(value)}>{label}</Option>)}
                </Dropdown>
              </Field>
              <Field label="Jersey number"><Input type="number" min="0" step="1" value={jerseyNumber} onChange={(_, data) => setJerseyNumber(data.value)} /></Field>
              <Field label="Age"><Input type="number" min="1" step="1" value={age} onChange={(_, data) => setAge(data.value)} /></Field>
              {availablePlayers.length === 0 && <MessageBar><MessageBarBody>No unregistered active players are available.</MessageBarBody></MessageBar>}
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement><Button appearance="secondary" disabled={saving}>Cancel</Button></DialogTrigger>
              <Button appearance="primary" type="submit" disabled={saving || !playerId || !teamId}>
                {saving ? <Spinner size="tiny" label="Registering player" /> : "Register Player"}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  );
}