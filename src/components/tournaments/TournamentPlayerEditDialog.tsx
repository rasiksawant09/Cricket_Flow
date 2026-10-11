import {
  Button,
  Checkbox,
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
import type { CricketTournamentPlayer } from "../../models/CricketTournamentPlayer";
import type { CricketTournamentTeam } from "../../models/CricketTournamentTeam";
import { PLAYER_CATEGORY_OPTIONS } from "../master/masterData";

interface TournamentPlayerEditDialogProps {
  player: CricketTournamentPlayer;
  tournamentName: string;
  masterPlayerName: string;
  teams: readonly CricketTournamentTeam[];
  onSave(player: CricketTournamentPlayer): Promise<Result<CricketTournamentPlayer>>;
}

export function TournamentPlayerEditDialog({
  player,
  tournamentName,
  masterPlayerName,
  teams,
  onSave,
}: TournamentPlayerEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [teamId, setTeamId] = useState("");
  const [category, setCategory] = useState("");
  const [jersey, setJersey] = useState("");
  const [age, setAge] = useState("");
  const [isCaptain, setIsCaptain] = useState(false);
  const [isViceCaptain, setIsViceCaptain] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);

  function handleOpenChange(next: boolean) {
    if (next) {
      setName(player.promx_tournamentplayername);
      setTeamId(player.promx_tournamentteam);
      setCategory(player.promx_playercategory == null ? "" : String(player.promx_playercategory));
      setJersey(player.promx_jerseynumber == null ? "" : String(player.promx_jerseynumber));
      setAge(player.promx_age == null ? "" : String(player.promx_age));
      setIsCaptain(player.promx_iscaptain === true);
      setIsViceCaptain(player.promx_isvicecaptain === true);
      setError(null);
    }
    setOpen(next);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const result = await onSave({
      ...player,
      promx_tournamentplayername: name,
      promx_tournamentteam: teamId,
      promx_playercategory: category ? Number(category) as CricketTournamentPlayer["promx_playercategory"] : null,
      promx_jerseynumber: jersey ? Number(jersey) : null,
      promx_age: age ? Number(age) : null,
      promx_iscaptain: isCaptain,
      promx_isvicecaptain: isViceCaptain,
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
      <DialogTrigger disableButtonEnhancement><Button appearance="subtle">Edit</Button></DialogTrigger>
      <DialogSurface>
        <form onSubmit={(event) => void submit(event)}>
          <DialogBody>
            <DialogTitle>Edit Tournament Player</DialogTitle>
            <DialogContent style={{ display: "grid", gap: "12px" }}>
              {error && <MessageBar intent="error"><MessageBarBody>{error.message}</MessageBarBody></MessageBar>}
              <Field label="Tournament player name" required>
                <Input value={name} onChange={(_, data) => setName(data.value)} required maxLength={850} />
              </Field>
              <Field label="Tournament"><Input readOnly value={tournamentName} /></Field>
              <Field label="Tournament team" required>
                <Dropdown
                  aria-label="Tournament team"
                  value={teams.find((team) => team.promx_crickettournamentteamid === teamId)?.promx_tournamentteamname ?? ""}
                  selectedOptions={teamId ? [teamId] : []}
                  onOptionSelect={(_, data) => setTeamId(data.optionValue ?? teamId)}
                >
                  {teams.map((team) => (
                    <Option key={team.promx_crickettournamentteamid} value={team.promx_crickettournamentteamid!}>{team.promx_tournamentteamname}</Option>
                  ))}
                </Dropdown>
              </Field>
              <Field label="Player"><Input readOnly value={masterPlayerName} /></Field>
              <Field label="Player category">
                <Dropdown
                  aria-label="Player category"
                  placeholder="Select category"
                  clearable
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
              <Checkbox checked={isCaptain} label="Is captain" onChange={(_, data) => setIsCaptain(data.checked === true)} />
              <Checkbox checked={isViceCaptain} label="Is vice captain" onChange={(_, data) => setIsViceCaptain(data.checked === true)} />
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement><Button appearance="secondary" disabled={saving}>Cancel</Button></DialogTrigger>
              <Button appearance="primary" type="submit" disabled={saving || !teamId}>
                {saving ? <Spinner size="tiny" label="Saving player" /> : "Save Changes"}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  );
}
