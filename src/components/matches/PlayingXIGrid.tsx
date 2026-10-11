import {
  createTableColumn,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  Button,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import type { TableColumnDefinition } from "@fluentui/react-components";

export interface PlayingXIGridRow {
  id: string;
  playerName: string;
  teamName: string;
  captain: string;
  viceCaptain: string;
}

const baseColumns: TableColumnDefinition<PlayingXIGridRow>[] = [
  createTableColumn<PlayingXIGridRow>({
    columnId: "playerName",
    renderHeaderCell: () => "Player Name",
    renderCell: (player) => player.playerName,
  }),
  createTableColumn<PlayingXIGridRow>({
    columnId: "team",
    renderHeaderCell: () => "Team",
    renderCell: (player) => player.teamName,
  }),
  createTableColumn<PlayingXIGridRow>({
    columnId: "captain",
    renderHeaderCell: () => "Captain",
    renderCell: (player) => player.captain,
  }),
  createTableColumn<PlayingXIGridRow>({
    columnId: "viceCaptain",
    renderHeaderCell: () => "Vice Captain",
    renderCell: (player) => player.viceCaptain,
  }),
];

const useStyles = makeStyles({
  section: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
  },
  heading: {
    marginBlock: 0,
  },
  empty: {
    color: tokens.colorNeutralForeground2,
  },
  grid: {
    overflowX: "auto",
  },
});

interface PlayingXIGridProps {
  title: string;
  rows: PlayingXIGridRow[];
  emptyMessage: string;
  actionLabel?: string;
  disabled?: boolean;
  onAction?(row: PlayingXIGridRow): void;
}

export function PlayingXIGrid({ title, rows, emptyMessage, actionLabel, disabled = false, onAction }: PlayingXIGridProps) {
  const styles = useStyles();
  const columns = actionLabel && onAction
    ? [
      ...baseColumns,
      createTableColumn<PlayingXIGridRow>({
        columnId: "action",
        renderHeaderCell: () => "",
          renderCell: (player) => (
          <Button size="small" appearance="subtle" disabled={disabled} onClick={(event) => {
            event.stopPropagation();
            onAction(player);
          }}>
            {actionLabel}
          </Button>
        ),
      }),
    ]
    : baseColumns;

  return (
    <section className={styles.section} aria-label={title}>
      <Text as="h2" className={styles.heading} size={500} weight="semibold">{title}</Text>
      {rows.length === 0 ? (
        <Text className={styles.empty} role="status">{emptyMessage}</Text>
      ) : (
        <div className={styles.grid}>
          <DataGrid aria-label={title} getRowId={(player) => player.id} items={rows} columns={columns}>
            <DataGridHeader>
              <DataGridRow>
                {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
              </DataGridRow>
            </DataGridHeader>
            <DataGridBody<PlayingXIGridRow>>
              {({ item, rowId }) => (
                <DataGridRow<PlayingXIGridRow> key={rowId}>
                  {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
                </DataGridRow>
              )}
            </DataGridBody>
          </DataGrid>
        </div>
      )}
    </section>
  );
}