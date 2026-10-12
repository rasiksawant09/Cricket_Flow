import type { ReactNode } from "react";
import { Text } from "@fluentui/react-components";

interface TournamentPageProps {
  title: string;
  description?: string;
  children: ReactNode;
  embedded?: boolean;
}

export function TournamentPage({ title, description, children, embedded = false }: TournamentPageProps) {
  if (embedded) {
    return <div className="cf-page-embedded">{children}</div>;
  }

  return (
    <main className="cf-page">
      <header className="cf-page-heading">
        <div>
          <Text as="h1">{title}</Text>
          {description && <Text as="p">{description}</Text>}
        </div>
      </header>
      {children}
    </main>
  );
}