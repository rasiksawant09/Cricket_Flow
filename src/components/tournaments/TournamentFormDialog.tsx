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
  Textarea,
} from "@fluentui/react-components";
import { useState } from "react";
import type { FormEvent } from "react";
import type { CricketTournament } from "../../models/CricketTournament";

interface TournamentFormDialogProps {
  initial?: CricketTournament;
  triggerLabel: string;
  onSave(tournament: CricketTournament): Promise<Result<CricketTournament>>;
  onStatusChange?(tournamentId: string, statusCode: NonNullable<CricketTournament["statuscode"]>): Promise<Result<CricketTournament>>;
  onSaved?(tournament: CricketTournament): void;
}

const tournamentStatuses = [
  { code: 796280001, label: "Draft" },
  { code: 1, label: "Active" },
  { code: 2, label: "Completed" },
  { code: 796280002, label: "Archived" },
] as const;

export function TournamentFormDialog({ initial, triggerLabel, onSave, onStatusChange, onSaved }: TournamentFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial?.promx_tournamentname ?? "");
  const [description, setDescription] = useState(initial?.promx_description ?? "");
  const [overs, setOvers] = useState(initial ? String(initial.promx_oversperinnings) : "20");
  const [players, setPlayers] = useState(initial ? String(initial.promx_playersperteam) : "11");
  const [winPoints, setWinPoints] = useState(String(initial?.promx_pointsforwin ?? 2));
  const [tiePoints, setTiePoints] = useState(String(initial?.promx_pointsfortie ?? 1));
  const [lossPoints, setLossPoints] = useState(String(initial?.promx_pointsforloss ?? 0));
  const [auctionIntegrationEnabled, setAuctionIntegrationEnabled] = useState(initial?.promx_auctionintegrationenabled ?? false);
  const [startDate, setStartDate] = useState(initial?.promx_startdate?.slice(0, 10) ?? "");
  const [endDate, setEndDate] = useState(initial?.promx_enddate?.slice(0, 10) ?? "");
  const [statusCode, setStatusCode] = useState(String(initial?.statuscode ?? 796280001));
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    let result = await onSave({
      ...initial,
      promx_tournamentname: name,
      promx_description: description,
      promx_oversperinnings: Number(overs),
      promx_playersperteam: Number(players),
      promx_pointsforwin: Number(winPoints),
      promx_pointsfortie: Number(tiePoints),
      promx_pointsforloss: Number(lossPoints),
      promx_auctionintegrationenabled: auctionIntegrationEnabled,
      promx_startdate: startDate || null,
      promx_enddate: endDate || null,
      statuscode: initial?.statuscode ?? 796280001,
    });
    if (!result.success) {
      setSaving(false);
      setError(result.error);
      return;
    }
    const selectedStatusCode = Number(statusCode) as NonNullable<CricketTournament["statuscode"]>;
    if (initial?.promx_crickettournamentid && selectedStatusCode !== initial.statuscode) {
      if (!onStatusChange) {
        setSaving(false);
        setError(new Error("Tournament status cannot be changed from this form."));
        return;
      }
      result = await onStatusChange(initial.promx_crickettournamentid, selectedStatusCode);
      if (!result.success) {
        setSaving(false);
        setError(result.error);
        return;
      }
    }
    setOpen(false);
    setSaving(false);
    onSaved?.(result.data);
  }

  return (
    <Dialog open={open} onOpenChange={(_, data) => setOpen(data.open)}>
      <DialogTrigger disableButtonEnhancement>
        <Button appearance={initial ? "secondary" : "primary"}>{triggerLabel}</Button>
      </DialogTrigger>
      <DialogSurface>
        <form onSubmit={(event) => void submit(event)}>
          <DialogBody>
            <DialogTitle>{initial ? "Edit Tournament" : "Create Tournament"}</DialogTitle>
            <DialogContent style={{ display: "grid", gap: "12px" }}>
              {error && <MessageBar intent="error"><MessageBarBody>{error.message}</MessageBarBody></MessageBar>}
              <Field label="Tournament name" required>
                <Input value={name} onChange={(_, data) => setName(data.value)} required maxLength={850} />
              </Field>
              <Field label="Description">
                <Textarea value={description} onChange={(_, data) => setDescription(data.value)} />
              </Field>
              <Field label="Overs per innings" required>
                <Input type="number" min="0.1" step="0.1" value={overs} onChange={(_, data) => setOvers(data.value)} required />
              </Field>
              <Field label="Players per team" required>
                <Input type="number" min="1" step="1" value={players} onChange={(_, data) => setPlayers(data.value)} required />
              </Field>
              <Field label="Points for win" required>
                <Input type="number" min="0" step="any" value={winPoints} onChange={(_, data) => setWinPoints(data.value)} required />
              </Field>
              <Field label="Points for tie" required>
                <Input type="number" min="0" step="any" value={tiePoints} onChange={(_, data) => setTiePoints(data.value)} required />
              </Field>
              <Field label="Points for loss" required>
                <Input type="number" min="0" step="any" value={lossPoints} onChange={(_, data) => setLossPoints(data.value)} required />
              </Field>
              <Checkbox
                checked={auctionIntegrationEnabled}
                label="Auction integration enabled"
                onChange={(_, data) => setAuctionIntegrationEnabled(data.checked === true)}
              />
              <Field label="Start date">
                <Input type="date" value={startDate} onChange={(_, data) => setStartDate(data.value)} />
              </Field>
              <Field label="End date">
                <Input type="date" value={endDate} onChange={(_, data) => setEndDate(data.value)} />
              </Field>
              {initial && (
                <Field label="Status">
                  <Dropdown
                    aria-label="Tournament status"
                    value={tournamentStatuses.find((status) => String(status.code) === statusCode)?.label ?? "Draft"}
                    selectedOptions={[statusCode]}
                    onOptionSelect={(_, data) => setStatusCode(data.optionValue ?? statusCode)}
                  >
                    {tournamentStatuses.map((status) => (
                      <Option key={status.code} value={String(status.code)}>{status.label}</Option>
                    ))}
                  </Dropdown>
                </Field>
              )}
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary" disabled={saving}>Cancel</Button>
              </DialogTrigger>
              <Button appearance="primary" type="submit" disabled={saving}>
                {saving ? <Spinner size="tiny" label="Saving tournament" /> : initial ? "Save Changes" : "Create Tournament"}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  );
}