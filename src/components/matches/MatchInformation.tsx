import { makeStyles, Text, tokens } from "@fluentui/react-components";

const useStyles = makeStyles({
  details: {
    display: "grid",
    gap: tokens.spacingVerticalL,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
  },
  field: {
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXS,
    paddingBlockEnd: tokens.spacingVerticalS,
  },
});

export interface MatchInformationField {
  label: string;
  value: string;
}

interface MatchInformationProps {
  fields: readonly MatchInformationField[];
}

export function MatchInformation({ fields }: MatchInformationProps) {
  const styles = useStyles();

  return (
    <section className={styles.details} aria-label="Match information">
      {fields.map(({ label, value }) => (
        <div className={styles.field} key={label}>
          <Text size={200} weight="semibold">{label}</Text>
          <Text>{value}</Text>
        </div>
      ))}
    </section>
  );
}