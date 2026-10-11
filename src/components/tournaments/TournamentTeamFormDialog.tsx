import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Spinner,
  Textarea,
} from "@fluentui/react-components";
import { useState } from "react";
import type { FormEvent } from "react";
import type { CricketTeam } from "../../models/CricketTeam";
import type { CricketTournamentTeam } from "../../models/CricketTournamentTeam";

interface TournamentTeamFormDialogProps {
  initialTeam?: CricketTeam;
  initialRegistration?: CricketTournamentTeam;
  onSave(team: CricketTeam, groupName: string | null, seedNumber: number | null): Promise<Result<CricketTournamentTeam>>;
}

export function TournamentTeamFormDialog({
  initialTeam,
  initialRegistration,
  onSave,
}: TournamentTeamFormDialogProps) {
  const isEdit = Boolean(initialTeam && initialRegistration);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialTeam?.promx_teamname ?? "");
  const [shortName, setShortName] = useState(initialTeam?.promx_teamshortname ?? "");
  const [description, setDescription] = useState(initialTeam?.promx_description ?? "");
  const [color, setColor] = useState(initialTeam?.promx_teamcolor ?? "");
  const [logo, setLogo] = useState(initialTeam?.promx_teamlogo ?? "");
  const [groupName, setGroupName] = useState(initialRegistration?.promx_groupname ?? "");
  const [seedNumber, setSeedNumber] = useState(initialRegistration?.promx_seednumber == null ? "" : String(initialRegistration.promx_seednumber));
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const result = await onSave({
      ...initialTeam,
      promx_teamname: name.trim(),
      promx_teamshortname: shortName.trim(),
      promx_description: description.trim() || null,
      promx_teamcolor: color.trim() || null,
      promx_teamlogo: logo.trim() || null,
    }, groupName.trim() || null, seedNumber ? Number(seedNumber) : null);
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(_, data) => setOpen(data.open)}>
      <DialogTrigger disableButtonEnhancement>
        <Button appearance={isEdit ? "subtle" : "primary"}>{isEdit ? "Edit" : "Add Team"}</Button>
      </DialogTrigger>
      <DialogSurface>
        <form onSubmit={(event) => void submit(event)}>
          <DialogBody>
            <DialogTitle>{isEdit ? "Edit Tournament Team" : "Add Team to Tournament"}</DialogTitle>
            <DialogContent style={{ display: "grid", gap: "12px" }}>
              {error && <MessageBar intent="error"><MessageBarBody>{error.message}</MessageBarBody></MessageBar>}
              {!isEdit && <MessageBar><MessageBarBody>A new Cricket Flow team master will be created and registered to this tournament.</MessageBarBody></MessageBar>}
              <Field label="Team name" required>
                <Input value={name} onChange={(_, data) => setName(data.value)} required maxLength={850} />
              </Field>
              <Field label="Short name" required>
                <Input value={shortName} onChange={(_, data) => setShortName(data.value)} required maxLength={100} />
              </Field>
              <Field label="Description">
                <Textarea value={description} onChange={(_, data) => setDescription(data.value)} />
              </Field>
              <Field label="Team color">
                <Input value={color} onChange={(_, data) => setColor(data.value)} maxLength={100} />
              </Field>
              <Field label="Team logo URL">
                <Input type="url" value={logo} onChange={(_, data) => setLogo(data.value)} maxLength={100} />
              </Field>
              <Field label="Group">
                <Input value={groupName} onChange={(_, data) => setGroupName(data.value)} maxLength={100} />
              </Field>
              <Field label="Seed number">
                <Input type="number" min="1" step="1" value={seedNumber} onChange={(_, data) => setSeedNumber(data.value)} />
              </Field>
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement><Button appearance="secondary" disabled={saving}>Cancel</Button></DialogTrigger>
              <Button appearance="primary" type="submit" disabled={saving}>
                {saving ? <Spinner size="tiny" label={isEdit ? "Saving team" : "Adding team"} /> : isEdit ? "Save Changes" : "Add Team"}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  );
}
