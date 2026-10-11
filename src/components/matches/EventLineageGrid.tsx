import {
  Button,
  createTableColumn,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
} from "@fluentui/react-components";
import type { TableColumnDefinition } from "@fluentui/react-components";
import type { CricketBallEvent } from "../../models/CricketBallEvent";

interface EventLineageGridProps {
  events: readonly CricketBallEvent[];
  effectiveIds: ReadonlySet<string>;
  onReverse(event: CricketBallEvent): void;
  onCorrect(event: CricketBallEvent): void;
}

export function EventLineageGrid({ events, effectiveIds, onReverse, onCorrect }: EventLineageGridProps) {
  const eventNames = new Map(events.flatMap((event) => event.promx_cricketballeventid
    ? [[event.promx_cricketballeventid, event.promx_balleventname] as const]
    : []));
  const columns: TableColumnDefinition<CricketBallEvent>[] = [
    createTableColumn<CricketBallEvent>({
      columnId: "sequence",
      renderHeaderCell: () => "Seq",
      renderCell: (event) => event.promx_deliverysequencenumber,
    }),
    createTableColumn<CricketBallEvent>({
      columnId: "event",
      renderHeaderCell: () => "Ball Event",
      renderCell: (event) => event.promx_balleventname,
    }),
    createTableColumn<CricketBallEvent>({
      columnId: "runs",
      renderHeaderCell: () => "Runs",
      renderCell: (event) => event.promx_totalruns ?? 0,
    }),
    createTableColumn<CricketBallEvent>({
      columnId: "lineage",
      renderHeaderCell: () => "Lineage",
      renderCell: (event) => {
        if (event.statuscode === 796280001) return "Reversal marker";
        if (event.statuscode === 796280002) {
          const state = event.promx_cricketballeventid && effectiveIds.has(event.promx_cricketballeventid) ? "effective" : "superseded";
          return `Correction of ${eventNames.get(event.promx_parentballevent ?? "") ?? "original"} (${state})`;
        }
        if (event.statuscode === 2) return "Inactive";
        if (event.promx_cricketballeventid && effectiveIds.has(event.promx_cricketballeventid)) return "Effective";
        return "Superseded";
      },
    }),
    createTableColumn<CricketBallEvent>({
      columnId: "reason",
      renderHeaderCell: () => "Reason",
      renderCell: (event) => event.promx_correctionreason ?? "",
    }),
    createTableColumn<CricketBallEvent>({
      columnId: "actions",
      renderHeaderCell: () => "Actions",
      renderCell: (event) => {
        const eventId = event.promx_cricketballeventid;
        const canCorrect = eventId && event.statuscode !== 2 && event.statuscode !== 796280001;
        const canReverse = eventId && effectiveIds.has(eventId);
        return (
          <div style={{ display: "flex", gap: "4px" }}>
            {canCorrect && <Button size="small" appearance="subtle" onClick={() => onCorrect(event)}>Correct</Button>}
            {canReverse && <Button size="small" appearance="subtle" onClick={() => onReverse(event)}>Reverse</Button>}
          </div>
        );
      },
    }),
  ];

  return (
    <div style={{ overflowX: "auto" }}>
      <DataGrid
        aria-label="Ball Event history and lineage"
        items={[...events].sort((left, right) =>
          left.promx_deliverysequencenumber - right.promx_deliverysequencenumber
          || (left.createdon ?? "").localeCompare(right.createdon ?? "")
          || (left.promx_cricketballeventid ?? "").localeCompare(right.promx_cricketballeventid ?? ""))}
        columns={columns}
        getRowId={(event) => event.promx_cricketballeventid ?? `${event.promx_deliverysequencenumber}-${event.promx_balleventname}`}
      >
        <DataGridHeader>
          <DataGridRow>{({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}</DataGridRow>
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
  );
}