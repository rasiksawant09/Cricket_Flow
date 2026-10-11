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
import { sourceLabel } from "./masterData";

interface MasterTeamFormDialogProps {
  initial?: CricketTeam;
  onSave(team: CricketTeam): Promise<Result<CricketTeam>>;
}

export function MasterTeamFormDialog({ initial, onSave }: MasterTeamFormDialogProps) {
  const isEdit = Boolean(initial);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("");
  const [logo, setLogo] = useState("");
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);

  function handleOpenChange(next: boolean) {
    if (next) {
      setName(initial?.promx_teamname ?? "");
      setShortName(initial?.promx_teamshortname ?? "");
      setDescription(initial?.promx_description ?? "");
      setColor(initial?.promx_teamcolor ?? "");
      setLogo(initial?.promx_teamlogo ?? "");
      setError(null);
    }
    setOpen(next);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const result = await onSave({
      ...initial,
      promx_teamname: name,
      promx_teamshortname: shortName,
      promx_description: description.trim() || null,
      promx_teamcolor: color.trim() || null,
      promx_teamlogo: logo.trim() || null,
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
      <DialogTrigger disableButtonEnhancement>
        <Button appearance={isEdit ? "subtle" : "primary"}>{isEdit ? "Edit" : "Add Team"}</Button>
      </DialogTrigger>
      <DialogSurface>
        <form onSubmit={(event) => void submit(event)}>
          <DialogBody>
            <DialogTitle>{isEdit ? "Edit Team" : "Add Team"}</DialogTitle>
            <DialogContent style={{ display: "grid", gap: "12px" }}>
              {error && <MessageBar intent="error"><MessageBarBody>{error.message}</MessageBarBody></MessageBar>}
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
              {initial && (
                <>
                  <Field label="Source"><Input readOnly value={sourceLabel(initial.promx_source)} /></Field>
                  <Field label="Source reference Id"><Input readOnly value={initial.promx_source_reference_id ?? ""} /></Field>
                </>
              )}
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement><Button appearance="secondary" disabled={saving}>Cancel</Button></DialogTrigger>
              <Button appearance="primary" type="submit" disabled={saving}>
                {saving ? <Spinner size="tiny" label="Saving team" /> : isEdit ? "Save Changes" : "Add Team"}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  );
}
