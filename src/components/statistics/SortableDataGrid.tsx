import {
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  makeStyles,
} from "@fluentui/react-components";
import type { TableColumnDefinition } from "@fluentui/react-components";

const useStyles = makeStyles({
  viewport: { maxWidth: "100%", overflowX: "auto" },
  grid: { minWidth: "680px", width: "100%" },
});

interface SortableDataGridProps<T> {
  ariaLabel: string;
  items: T[];
  columns: TableColumnDefinition<T>[];
  getRowId(item: T): string;
  defaultSortState?: { sortColumn: string; sortDirection: "ascending" | "descending" };
}

export function SortableDataGrid<T>({
  ariaLabel,
  items,
  columns,
  getRowId,
  defaultSortState,
}: SortableDataGridProps<T>) {
  const styles = useStyles();

  return (
    <div className={styles.viewport}>
      <DataGrid
        aria-label={ariaLabel}
        className={`${styles.grid} cf-table-surface`}
        items={items}
        columns={columns}
        getRowId={getRowId}
        defaultSortState={defaultSortState}
      >
        <DataGridHeader>
          <DataGridRow>
            {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
          </DataGridRow>
        </DataGridHeader>
        <DataGridBody<T>>
          {({ item, rowId }) => (
            <DataGridRow<T> key={rowId}>
              {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
            </DataGridRow>
          )}
        </DataGridBody>
      </DataGrid>
    </div>
  );
}
