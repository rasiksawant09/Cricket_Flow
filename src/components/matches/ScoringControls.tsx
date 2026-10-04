import { Button, Dropdown, Field, Option, RadioGroup, Radio, makeStyles, tokens } from "@fluentui/react-components";
import { useState } from "react";
import type { DeliveryInput } from "../../services/interfaces/IScoringService";

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

interface ScoringControlsProps {
  disabled: boolean;
  onSubmit(input: Omit<DeliveryInput, "matchId">): void;
}

export function ScoringControls({ disabled, onSubmit }: ScoringControlsProps) {
  const styles = useStyles();
  const [extraRuns, setExtraRuns] = useState(0);
  const [dismissal, setDismissal] = useState<DismissalType | null>(null);
  const [dismissedBatter, setDismissedBatter] = useState<"striker" | "nonStriker">("striker");

  return (
    <section className={styles.group} aria-label="Scoring controls">
      <div className={styles.row} role="group" aria-label="Runs">
        {RUN_BUTTONS.map((runs) => (
          <Button key={runs} appearance="primary" disabled={disabled} onClick={() => onSubmit({ kind: "runs", runs })}>
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
      <div className={styles.row} role="group" aria-label="Extras">
        {EXTRAS.map(({ kind, label }) => (
          <Button key={kind} disabled={disabled} onClick={() => onSubmit({ kind, runs: extraRuns })}>
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
          disabled={disabled || dismissal === null}
          onClick={() => {
            if (dismissal !== null) {
              onSubmit({ kind: "wicket", runs: 0, dismissalType: dismissal, dismissedBatter });
            }
          }}
        >
          Wicket
        </Button>
      </div>
    </section>
  );
}
