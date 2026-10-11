import { Dropdown, Field, Option } from "@fluentui/react-components";

export interface RecordSelectorOption {
  id: string;
  label: string;
}

interface RecordSelectorProps {
  label: string;
  selectedId: string;
  options: readonly RecordSelectorOption[];
  onSelectionChange(id: string): void;
}

export function RecordSelector({ label, selectedId, options, onSelectionChange }: RecordSelectorProps) {
  const selectedOption = options.find((option) => option.id === selectedId);

  return (
    <Field label={label} style={{ maxWidth: "360px", width: "100%" }}>
      <Dropdown
        aria-label={label}
        placeholder={`Select ${label.toLowerCase()}`}
        value={selectedOption?.label ?? ""}
        selectedOptions={selectedOption ? [selectedOption.id] : []}
        onOptionSelect={(_, data) => {
          if (data.optionValue) onSelectionChange(data.optionValue);
        }}
      >
        {options.map((option) => (
          <Option key={option.id} value={option.id} text={option.label}>
            {option.label}
          </Option>
        ))}
      </Dropdown>
    </Field>
  );
}