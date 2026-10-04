import {
  createTableColumn,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import type { TableColumnDefinition } from "@fluentui/react-components";
import type { CricketBallEvent } from "../../models/CricketBallEvent";

const EVENT_TYPE_LABELS: Record<number, string> = {
  796280000: "Normal",
  796280001: "Wide",
  796280002: "No Ball",
  796280003: "Bye",
  796280004: "Leg Bye",
  796280005: "Dead Ball",
  796280006: "Penalty",
};

const columns: TableColumnDefinition<CricketBallEvent>[] = [
  createTableColumn<CricketBallEvent>({
    columnId: "ball",
    renderHeaderCell: () => "Ball",
    renderCell: (event) => event.promx_balleventname,
  }),
  createTableColumn<CricketBallEvent>({
    columnId: "type",
    renderHeaderCell: () => "Type",
    renderCell: (event) => (event.promx_eventtype == null ? "Not set" : EVENT_TYPE_LABELS[event.promx_eventtype]),
  }),
  createTableColumn<CricketBallEvent>({
    columnId: "runs",
    renderHeaderCell: () => "Runs",
    renderCell: (event) => event.promx_totalruns ?? 0,
  }),
  createTableColumn<CricketBallEvent>({
    columnId: "wicket",
    renderHeaderCell: () => "Wicket",
    renderCell: (event) => (event.promx_iswicket === true ? "Yes" : "No"),
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
  grid: {
    overflowX: "auto",
  },
});

interface BallEventGridProps {
  title: string;
  events: CricketBallEvent[];
  emptyMessage: string;
}

export function BallEventGrid({ title, events, emptyMessage }: BallEventGridProps) {
  const styles = useStyles();

  return (
    <section className={styles.section} aria-label={title}>
      <Text as="h2" className={styles.heading} size={500} weight="semibold">{title}</Text>
      {events.length === 0 ? (
        <Text role="status">{emptyMessage}</Text>
      ) : (
        <div className={styles.grid}>
          <DataGrid
            aria-label={title}
            getRowId={(event) => event.promx_cricketballeventid ?? String(event.promx_deliverysequencenumber)}
            items={events}
            columns={columns}
          >
            <DataGridHeader>
              <DataGridRow>
                {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
              </DataGridRow>
            </DataGridHeader>
            <DataGridBody<CricketBallEvent>>
              {({ item, rowId }) => (
                <DataGridRow<CricketBallEvent> key={rowId}>
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
