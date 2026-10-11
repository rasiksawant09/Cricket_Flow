import type { ReactNode } from "react";
import { Text } from "@fluentui/react-components";

interface TournamentPageProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function TournamentPage({ title, description, children }: TournamentPageProps) {
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