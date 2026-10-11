import { createTableColumn, Text } from "@fluentui/react-components";
import type { TableColumnDefinition } from "@fluentui/react-components";
import { SortableDataGrid } from "./SortableDataGrid";

interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  teamName: string;
}

interface LeaderboardGridProps<T extends LeaderboardEntry> {
  title: string;
  items: T[];
  metricLabel: string;
  metricValue(item: T): number;
  formatMetric(item: T): string;
  direction: "ascending" | "descending";
}

export function LeaderboardGrid<T extends LeaderboardEntry>({
  title,
  items,
  metricLabel,
  metricValue,
  formatMetric,
  direction,
}: LeaderboardGridProps<T>) {
  const columns: TableColumnDefinition<T>[] = [
    createTableColumn<T>({
      columnId: "player",
      compare: (left, right) => left.playerName.localeCompare(right.playerName),
      renderHeaderCell: () => "Player",
      renderCell: (item) => item.playerName,
    }),
    createTableColumn<T>({
      columnId: "team",
      compare: (left, right) => left.teamName.localeCompare(right.teamName),
      renderHeaderCell: () => "Team",
      renderCell: (item) => item.teamName,
    }),
    createTableColumn<T>({
      columnId: "metric",
      compare: (left, right) => metricValue(left) - metricValue(right),
      renderHeaderCell: () => metricLabel,
      renderCell: formatMetric,
    }),
  ];

  return (
    <section>
      <Text as="h2" size={500} weight="semibold">{title}</Text>
      {items.length === 0
        ? <Text role="status">No qualifying statistics.</Text>
        : (
          <SortableDataGrid
            ariaLabel={title}
            items={items}
            columns={columns}
            getRowId={(item) => item.playerId}
            defaultSortState={{ sortColumn: "metric", sortDirection: direction }}
          />
        )}
    </section>
  );
}