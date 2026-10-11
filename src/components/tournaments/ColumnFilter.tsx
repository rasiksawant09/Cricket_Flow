import { Button, Dropdown, Input, Option, Popover, PopoverSurface, PopoverTrigger } from "@fluentui/react-components";

export interface FilterOption {
  value: string;
  label: string;
}

interface ColumnFilterProps {
  label: string;
  value: string;
  onChange(value: string): void;
  options?: readonly FilterOption[];
}

export function ColumnFilter({ label, value, onChange, options }: ColumnFilterProps) {
  const active = value !== "";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
      <span>{label}</span>
      <Popover positioning="below-start">
        <PopoverTrigger disableButtonEnhancement>
          <Button size="small" appearance={active ? "primary" : "subtle"} aria-label={`Filter by ${label}`}>▾</Button>
        </PopoverTrigger>
        <PopoverSurface>
          <div style={{ display: "grid", gap: "8px", minWidth: "200px" }}>
            {options ? (
              <Dropdown
                aria-label={`${label} filter`}
                placeholder={`Any ${label.toLowerCase()}`}
                value={options.find((option) => option.value === value)?.label ?? ""}
                selectedOptions={value ? [value] : []}
                onOptionSelect={(_, data) => onChange(data.optionValue ?? "")}
              >
                {options.map((option) => <Option key={option.value} value={option.value}>{option.label}</Option>)}
              </Dropdown>
            ) : (
              <Input
                aria-label={`${label} filter`}
                placeholder={`Contains...`}
                value={value}
                onChange={(_, data) => onChange(data.value)}
              />
            )}
            <Button size="small" appearance="secondary" disabled={!active} onClick={() => onChange("")}>Clear filter</Button>
          </div>
        </PopoverSurface>
      </Popover>
    </div>
  );
}
