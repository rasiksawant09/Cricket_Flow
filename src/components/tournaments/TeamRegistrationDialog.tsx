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
import type { CricketTeam } from "../../models/CricketTeam";
import type { CricketTournamentTeam } from "../../models/CricketTournamentTeam";

interface TeamRegistrationDialogProps {
  tournamentId: string;
  triggerLabel?: string;
  teams: readonly CricketTeam[];
  registrations: readonly CricketTournamentTeam[];
  onRegister(team: CricketTournamentTeam): Promise<Result<CricketTournamentTeam>>;
}

export function TeamRegistrationDialog({ tournamentId, triggerLabel = "Register Existing Team", teams, registrations, onRegister }: TeamRegistrationDialogProps) {
  const [open, setOpen] = useState(false);
  const [teamId, setTeamId] = useState("");
  const [group, setGroup] = useState("");
  const [seed, setSeed] = useState("");
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);
  const availableTeams = teams.filter((team) => team.promx_cricketteamid
    && !registrations.some((registration) => registration.promx_team === team.promx_cricketteamid));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selected = availableTeams.find((team) => team.promx_cricketteamid === teamId);
    if (!selected?.promx_cricketteamid) return;
    setSaving(true);
    setError(null);
    try {
      const result = await onRegister({
        promx_tournament: tournamentId,
        promx_team: selected.promx_cricketteamid,
        promx_tournamentteamname: selected.promx_teamname,
        promx_groupname: group.trim() || null,
        promx_seednumber: seed ? Number(seed) : null,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setTeamId("");
      setGroup("");
      setSeed("");
      setOpen(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError : new Error("Could not register team."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(_, data) => setOpen(data.open)}>
      <DialogTrigger disableButtonEnhancement>
        <Button appearance="secondary">{triggerLabel}</Button>
      </DialogTrigger>
      <DialogSurface>
        <form onSubmit={(event) => void submit(event)}>
          <DialogBody>
            <DialogTitle>Register Team</DialogTitle>
            <DialogContent style={{ display: "grid", gap: "12px" }}>
              {error && <MessageBar intent="error"><MessageBarBody>{error.message}</MessageBarBody></MessageBar>}
              <Field label="Team" required>
                <Dropdown
                  aria-label="Team"
                  placeholder="Select a team"
                  value={availableTeams.find((team) => team.promx_cricketteamid === teamId)?.promx_teamname ?? ""}
                  selectedOptions={teamId ? [teamId] : []}
                  onOptionSelect={(_, data) => setTeamId(data.optionValue ?? "")}
                >
                  {availableTeams.map((team) => <Option key={team.promx_cricketteamid} value={team.promx_cricketteamid!}>{team.promx_teamname}</Option>)}
                </Dropdown>
              </Field>
              <Field label="Group">
                <Input value={group} onChange={(_, data) => setGroup(data.value)} />
              </Field>
              <Field label="Seed number">
                <Input type="number" min="1" step="1" value={seed} onChange={(_, data) => setSeed(data.value)} />
              </Field>
              {availableTeams.length === 0 && <MessageBar><MessageBarBody>No unregistered active teams are available.</MessageBarBody></MessageBar>}
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement><Button appearance="secondary" disabled={saving}>Cancel</Button></DialogTrigger>
              <Button appearance="primary" type="submit" disabled={saving || !teamId}>
                {saving ? <Spinner size="tiny" label="Registering team" /> : "Register Team"}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  );
}