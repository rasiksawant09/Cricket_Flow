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
import { GENDER_OPTIONS, genderLabel, sourceLabel } from "./masterData";

interface MasterPlayerFormDialogProps {
  initial?: CricketPlayer;
  onSave(player: CricketPlayer): Promise<Result<CricketPlayer>>;
}

export function MasterPlayerFormDialog({ initial, onSave }: MasterPlayerFormDialogProps) {
  const isEdit = Boolean(initial);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);

  function handleOpenChange(next: boolean) {
    if (next) {
      setName(initial?.promx_cricketplayer1 ?? "");
      setGender(initial ? String(initial.promx_gender) : "");
      setEmail(initial?.promx_emailaddress ?? "");
      setEmployeeId(initial?.promx_employeeid ?? "");
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
      promx_cricketplayer1: name,
      promx_gender: Number(gender) as CricketPlayer["promx_gender"],
      promx_emailaddress: email.trim() || null,
      promx_employeeid: employeeId.trim() || null,
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
        <Button appearance={isEdit ? "subtle" : "primary"}>{isEdit ? "Edit" : "Add Player"}</Button>
      </DialogTrigger>
      <DialogSurface>
        <form onSubmit={(event) => void submit(event)}>
          <DialogBody>
            <DialogTitle>{isEdit ? "Edit Player" : "Add Player"}</DialogTitle>
            <DialogContent style={{ display: "grid", gap: "12px" }}>
              {error && <MessageBar intent="error"><MessageBarBody>{error.message}</MessageBarBody></MessageBar>}
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
              {initial && (
                <>
                  <Field label="Source"><Input readOnly value={sourceLabel(initial.promx_source)} /></Field>
                  <Field label="Source reference Id"><Input readOnly value={initial.promx_sourcereferenceid ?? ""} /></Field>
                </>
              )}
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement><Button appearance="secondary" disabled={saving}>Cancel</Button></DialogTrigger>
              <Button appearance="primary" type="submit" disabled={saving || !gender}>
                {saving ? <Spinner size="tiny" label="Saving player" /> : isEdit ? "Save Changes" : "Add Player"}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  );
}
