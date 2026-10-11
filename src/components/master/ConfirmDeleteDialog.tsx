import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  MessageBar,
  MessageBarBody,
} from "@fluentui/react-components";
import { useState } from "react";

interface ConfirmDeleteDialogProps {
  title: string;
  message: string;
  onConfirm(): Promise<Result<void>>;
  onClose(): void;
}

export function ConfirmDeleteDialog({ title, message, onConfirm, onClose }: ConfirmDeleteDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    const result = await onConfirm();
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onClose();
  }

  return (
    <Dialog open onOpenChange={(_, data) => { if (!data.open && !busy) onClose(); }}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{title}</DialogTitle>
          <DialogContent style={{ display: "grid", gap: "12px" }}>
            {error && <MessageBar intent="error"><MessageBarBody>{error.message}</MessageBarBody></MessageBar>}
            <p>{message}</p>
          </DialogContent>
          <DialogActions>
            <DialogTrigger disableButtonEnhancement><Button appearance="secondary" disabled={busy}>Cancel</Button></DialogTrigger>
            <Button appearance="primary" onClick={() => void confirm()} disabled={busy}>{busy ? "Deleting" : "Delete"}</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
