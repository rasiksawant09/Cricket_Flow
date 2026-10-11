import { Button, Dropdown, Field, Option, RadioGroup, Radio, makeStyles, tokens } from "@fluentui/react-components";
import { useState } from "react";
import type { DeliveryInput, PendingSelections } from "../../services/interfaces/IScoringService";

const RUN_BUTTONS = [0, 1, 2, 3, 4, 6] as const;
const EXTRA_RUN_OPTIONS = [0, 1, 2, 3, 4, 5, 6] as const;
const EXTRAS = [
  { kind: "wide", label: "Wide" },
  { kind: "noBall", label: "No Ball" },
  { kind: "bye", label: "Bye" },
  { kind: "legBye", label: "Leg Bye" },
] as const;
const DISMISSALS = [
  { value: 796280000, label: "Bowled" },
  { value: 796280001, label: "Caught" },
  { value: 796280002, label: "LBW" },
  { value: 796280003, label: "Run Out" },
  { value: 796280004, label: "Stumped" },
  { value: 796280005, label: "Hit Wicket" },
  { value: 796280006, label: "Retired Out" },
  { value: 796280007, label: "Retired Hurt" },
  { value: 796280008, label: "Timed Out" },
  { value: 796280009, label: "Obstructing The Field" },
] as const;

type DismissalType = NonNullable<DeliveryInput["dismissalType"]>;

const useStyles = makeStyles({
  group: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
  },
  row: {
    display: "flex",
    flexWrap: "wrap",
    gap: tokens.spacingHorizontalS,
  },
});

export interface PlayerOption {
  id: string;
  label: string;
}

interface ScoringControlsProps {
  disabled: boolean;
  pending: PendingSelections;
  batters: readonly PlayerOption[];
  bowlers: readonly PlayerOption[];
  onSubmit(input: Omit<DeliveryInput, "matchId">): Promise<boolean>;
}

interface PlayerPickerProps {
  label: string;
  options: readonly PlayerOption[];
  value: string;
  onChange(id: string): void;
}

function PlayerPicker({ label, options, value, onChange }: PlayerPickerProps) {
  return (
    <Field label={label} required>
      <Dropdown
        placeholder={`Select ${label.toLowerCase()}`}
        value={options.find((option) => option.id === value)?.label ?? ""}
        selectedOptions={value ? [value] : []}
        onOptionSelect={(_, data) => onChange(data.optionValue ?? "")}
      >
        {options.map((option) => <Option key={option.id} value={option.id}>{option.label}</Option>)}
      </Dropdown>
    </Field>
  );
}

export function ScoringControls({ disabled, pending, batters, bowlers, onSubmit }: ScoringControlsProps) {
  const styles = useStyles();
  const [extraRuns, setExtraRuns] = useState(0);
  const [dismissal, setDismissal] = useState<DismissalType | null>(null);
  const [dismissedBatter, setDismissedBatter] = useState<"striker" | "nonStriker">("striker");
  const [strikerId, setStrikerId] = useState("");
  const [nonStrikerId, setNonStrikerId] = useState("");
  const [bowlerId, setBowlerId] = useState("");

  const selectionMissing = (pending.striker && !strikerId) || (pending.nonStriker && !nonStrikerId) || (pending.bowler && !bowlerId);
  const blocked = disabled || selectionMissing;

  async function submit(input: Omit<DeliveryInput, "matchId">) {
    const saved = await onSubmit({
      ...input,
      ...(pending.striker ? { strikerId } : {}),
      ...(pending.nonStriker ? { nonStrikerId } : {}),
      ...(pending.bowler ? { bowlerId } : {}),
    });
    if (saved) {
      setStrikerId("");
      setNonStrikerId("");
      setBowlerId("");
    }
  }

  return (
    <section className={`${styles.group} live-controls`} aria-label="Scoring controls">
      {pending.striker && <PlayerPicker label="Batter on strike" options={batters} value={strikerId} onChange={setStrikerId} />}
      {pending.nonStriker && <PlayerPicker label="Non-striker" options={batters} value={nonStrikerId} onChange={setNonStrikerId} />}
      {pending.bowler && <PlayerPicker label="Bowler" options={bowlers} value={bowlerId} onChange={setBowlerId} />}
      <div className={`${styles.row} live-run-buttons`} role="group" aria-label="Runs">
        {RUN_BUTTONS.map((runs) => (
          <Button key={runs} appearance="primary" disabled={blocked} onClick={() => void submit({ kind: "runs", runs })}>
            {runs}
          </Button>
        ))}
      </div>
      <Field label="Extra runs (for extras)">
        <Dropdown
          value={String(extraRuns)}
          selectedOptions={[String(extraRuns)]}
          onOptionSelect={(_, data) => setExtraRuns(Number(data.optionValue ?? 0))}
        >
          {EXTRA_RUN_OPTIONS.map((runs) => <Option key={runs} value={String(runs)}>{String(runs)}</Option>)}
        </Dropdown>
      </Field>
      <div className={`${styles.row} live-extra-buttons`} role="group" aria-label="Extras">
        {EXTRAS.map(({ kind, label }) => (
          <Button key={kind} disabled={blocked} onClick={() => void submit({ kind, runs: extraRuns })}>
            {label}
          </Button>
        ))}
      </div>
      <Field label="Dismissal type">
        <Dropdown
          placeholder="Select dismissal"
          value={DISMISSALS.find((item) => item.value === dismissal)?.label ?? ""}
          selectedOptions={dismissal === null ? [] : [String(dismissal)]}
          onOptionSelect={(_, data) => setDismissal(data.optionValue ? (Number(data.optionValue) as DismissalType) : null)}
        >
          {DISMISSALS.map((item) => <Option key={item.value} value={String(item.value)}>{item.label}</Option>)}
        </Dropdown>
      </Field>
      <Field label="Batter dismissed">
        <RadioGroup layout="horizontal" value={dismissedBatter} onChange={(_, data) => setDismissedBatter(data.value as "striker" | "nonStriker")}>
          <Radio value="striker" label="Striker" />
          <Radio value="nonStriker" label="Non-striker" />
        </RadioGroup>
      </Field>
      <div className={styles.row}>
        <Button
          appearance="primary"
          disabled={blocked || dismissal === null}
          onClick={() => {
            if (dismissal !== null) {
              void submit({ kind: "wicket", runs: 0, dismissalType: dismissal, dismissedBatter });
            }
          }}
        >
          Wicket
        </Button>
      </div>
    </section>
  );
}
