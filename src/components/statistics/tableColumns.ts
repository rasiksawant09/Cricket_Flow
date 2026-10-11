import { createTableColumn } from "@fluentui/react-components";
import type { TableColumnDefinition } from "@fluentui/react-components";

export function textColumn<T>(
  columnId: string,
  label: string,
  getText: (item: T) => string,
): TableColumnDefinition<T> {
  return createTableColumn<T>({
    columnId,
    compare: (left, right) => getText(left).localeCompare(getText(right)),
    renderHeaderCell: () => label,
    renderCell: getText,
  });
}