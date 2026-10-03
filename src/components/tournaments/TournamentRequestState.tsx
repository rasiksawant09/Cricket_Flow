import { MessageBar, MessageBarBody, Spinner, Text } from "@fluentui/react-components";

interface TournamentRequestStateProps {
  isLoading: boolean;
  error: Error | null;
  emptyMessage?: string;
  loadingLabel?: string;
}

export function TournamentRequestState({ isLoading, error, emptyMessage, loadingLabel = "Loading data" }: TournamentRequestStateProps) {
  if (isLoading) {
    return <Spinner label={loadingLabel} size="small" />;
  }

  if (error) {
    return (
      <MessageBar intent="error">
        <MessageBarBody>{error.message}</MessageBarBody>
      </MessageBar>
    );
  }

  if (emptyMessage) {
    return <Text role="status">{emptyMessage}</Text>;
  }

  return null;
}