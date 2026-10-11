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
import type { NewTournamentPlayerDetails } from "../../services/interfaces/ITournamentRegistrationService";
import { GENDER_OPTIONS, PLAYER_CATEGORY_OPTIONS, genderLabel } from "../master/masterData";

interface TournamentPlayerAddDialogProps {
  tournamentId: string;
  teams: readonly CricketTournamentTeam[];
  onSave(player: CricketPlayer, details: NewTournamentPlayerDetails): Promise<Result<CricketTournamentPlayer>>;
}

export function TournamentPlayerAddDialog({ tournamentId, teams, onSave }: TournamentPlayerAddDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [category, setCategory] = useState("");
  const [jersey, setJersey] = useState("");
  const [age, setAge] = useState("");
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);

  function handleOpenChange(next: boolean) {
    if (next) {
      setName("");
      setGender("");
      setEmail("");
      setEmployeeId("");
      setTeamId("");
      setCategory("");
      setJersey("");
      setAge("");
      setError(null);
    }
    setOpen(next);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const result = await onSave({
      promx_cricketplayer1: name,
      promx_gender: Number(gender) as CricketPlayer["promx_gender"],
      promx_emailaddress: email.trim() || null,
      promx_employeeid: employeeId.trim() || null,
    }, {
      promx_tournament: tournamentId,
      promx_tournamentteam: teamId,
      promx_playercategory: category ? Number(category) as CricketTournamentPlayer["promx_playercategory"] : null,
      promx_jerseynumber: jersey ? Number(jersey) : null,
      promx_age: age ? Number(age) : null,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(_, data) => handleOpenChange(data.open)}>
      <DialogTrigger disableButtonEnhancement><Button appearance="primary">Add Player</Button></DialogTrigger>
      <DialogSurface>
        <form onSubmit={(event) => void submit(event)}>
          <DialogBody>
            <DialogTitle>Add Player to Tournament</DialogTitle>
            <DialogContent style={{ display: "grid", gap: "12px" }}>
              {error && <MessageBar intent="error"><MessageBarBody>{error.message}</MessageBarBody></MessageBar>}
              <MessageBar><MessageBarBody>A new Cricket Flow player will be created and registered to this tournament.</MessageBarBody></MessageBar>
              <Field label="Player name" required>
                <Input value={name} onChange={(_, data) => setName(data.value)} required maxLength={850} />
              </Field>
              <Field label="Gender" required>
                <Dropdown
                  aria-label="Gender"
                  placeholder="Select gender"
                  value={gender ? genderLabel(Number(gender)) : ""}
                  selectedOptions={gender ? [gender] : []}
                  onOptionSelect={(_, data) => setGender(data.optionValue ?? "")}
                >
                  {GENDER_OPTIONS.map((option) => <Option key={option.value} value={String(option.value)}>{option.label}</Option>)}
                </Dropdown>
              </Field>
              <Field label="Email address">
                <Input type="email" value={email} onChange={(_, data) => setEmail(data.value)} maxLength={100} />
              </Field>
              <Field label="Employee Id">
                <Input value={employeeId} onChange={(_, data) => setEmployeeId(data.value)} maxLength={100} />
              </Field>
              <Field label="Tournament team" required>
                <Dropdown
                  aria-label="Tournament team"
                  placeholder="Select a team"
                  value={teams.find((team) => team.promx_crickettournamentteamid === teamId)?.promx_tournamentteamname ?? ""}
                  selectedOptions={teamId ? [teamId] : []}
                  onOptionSelect={(_, data) => setTeamId(data.optionValue ?? "")}
                >
                  {teams.map((team) => (
                    <Option key={team.promx_crickettournamentteamid} value={team.promx_crickettournamentteamid!}>{team.promx_tournamentteamname}</Option>
                  ))}
                </Dropdown>
              </Field>
              <Field label="Player category">
                <Dropdown
                  aria-label="Player category"
                  placeholder="Select category"
                  value={PLAYER_CATEGORY_OPTIONS.find((option) => String(option.value) === category)?.label ?? ""}
                  selectedOptions={category ? [category] : []}
                  onOptionSelect={(_, data) => setCategory(data.optionValue ?? "")}
                >
                  {PLAYER_CATEGORY_OPTIONS.map((option) => <Option key={option.value} value={String(option.value)}>{option.label}</Option>)}
                </Dropdown>
              </Field>
              <Field label="Jersey number">
                <Input type="number" min="0" step="1" value={jersey} onChange={(_, data) => setJersey(data.value)} />
              </Field>
              <Field label="Age">
                <Input type="number" min="1" step="1" value={age} onChange={(_, data) => setAge(data.value)} />
              </Field>
              {teams.length === 0 && <MessageBar intent="warning"><MessageBarBody>Add a team to this tournament before adding players.</MessageBarBody></MessageBar>}
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement><Button appearance="secondary" disabled={saving}>Cancel</Button></DialogTrigger>
              <Button appearance="primary" type="submit" disabled={saving || !gender || !teamId}>
                {saving ? <Spinner size="tiny" label="Adding player" /> : "Add Player"}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  );
}
