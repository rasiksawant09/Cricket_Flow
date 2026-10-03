import type { ReactNode } from "react";
import { makeStyles, Text, tokens } from "@fluentui/react-components";

const useStyles = makeStyles({
  page: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL,
    marginInline: "auto",
    maxWidth: "1280px",
    paddingBlock: tokens.spacingVerticalXXL,
    paddingInline: tokens.spacingHorizontalXXL,
    width: "100%",
  },
  heading: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXS,
  },
  title: {
    marginBlock: 0,
  },
});

interface TournamentPageProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function TournamentPage({ title, description, children }: TournamentPageProps) {
  const styles = useStyles();

  return (
    <main className={styles.page}>
      <header className={styles.heading}>
        <Text as="h1" className={styles.title} size={700} weight="semibold">
          {title}
        </Text>
        {description && <Text>{description}</Text>}
      </header>
      {children}
    </main>
  );
}