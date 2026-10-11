import {
  Button,
  createTableColumn,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  MessageBar,
  MessageBarBody,
  Text,
} from "@fluentui/react-components";
import type { TableColumnDefinition } from "@fluentui/react-components";
import { useCallback, useState } from "react";
import type { AuctionImportPreview, AuctionImportSummary, AuctionTeam } from "../../models/AuctionImport";
import { useAsyncResult } from "../../hooks/useAsyncResult";
import { useAuctionImportContext } from "../../hooks/useAuctionImportContext";
import { TournamentPage } from "../../components/tournaments/TournamentPage";
import { TournamentRequestState } from "../../components/tournaments/TournamentRequestState";

const TEAM_PAGE_SIZE = 10;
const columns: TableColumnDefinition<AuctionTeam>[] = [
  createTableColumn<AuctionTeam>({
    columnId: "name",
    renderHeaderCell: () => "Team Name",
    renderCell: (team) => team.name ?? "Name unavailable",
  }),
  createTableColumn<AuctionTeam>({
    columnId: "auction",
    renderHeaderCell: () => "Auction",
    renderCell: (team) => team.auctionName ?? "Not set",
  }),
  createTableColumn<AuctionTeam>({
    columnId: "createdOn",
    renderHeaderCell: () => "Created On",
    renderCell: (team) => formatCreatedOn(team.createdOn),
  }),
];

function formatCreatedOn(value: string | null): string {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function SummaryRows({ summary }: { summary: AuctionImportPreview | AuctionImportSummary }) {
  return (
    <dl style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px 20px", margin: 0 }}>
      <dt>Teams selected</dt><dd>{summary.selectedTeamCount}</dd>
      <dt>Teams to import</dt><dd>{summary.teamsToImport}</dd>
      <dt>Teams already imported</dt><dd>{summary.teamsAlreadyImported}</dd>
      <dt>Teams unavailable</dt><dd>{summary.teamsUnavailable}</dd>
      <dt>Players to import</dt><dd>{summary.playersToImport}</dd>
      <dt>Players already imported</dt><dd>{summary.playersAlreadyImported}</dd>
      <dt>Players inactive or unavailable</dt><dd>{summary.playersUnavailable}</dd>
      {"teamsImported" in summary && <>
        <dt>Teams imported</dt><dd>{summary.teamsImported}</dd>
        <dt>Teams skipped</dt><dd>{summary.teamsSkipped}</dd>
        <dt>Teams failed</dt><dd>{summary.teamsFailed}</dd>
        <dt>Players imported</dt><dd>{summary.playersImported}</dd>
        <dt>Players skipped</dt><dd>{summary.playersSkipped}</dd>
        <dt>Players failed</dt><dd>{summary.playersFailed}</dd>
      </>}
    </dl>
  );
}

export function AuctionImportScreen() {
  const service = useAuctionImportContext();
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<AuctionImportPreview | null>(null);
  const [summary, setSummary] = useState<AuctionImportSummary | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadTeams = useCallback(() => service.getActiveTeams(TEAM_PAGE_SIZE, cursor), [service, cursor]);
  const request = useAsyncResult(loadTeams, true, cursor);
  const teams = request.data?.items ?? [];
  const visibleIds = new Set(teams.map((team) => team.id));

  function changePage(nextCursor: string | undefined) {
    setCursorHistory((history) => [...history, cursor]);
    setCursor(nextCursor);
  }

  function previousPage() {
    const previous = cursorHistory[cursorHistory.length - 1];
    setCursorHistory((history) => history.slice(0, -1));
    setCursor(previous);
  }

  async function previewImport() {
    setWorking(true);
    setError(null);
    setSummary(null);
    const result = await service.preview(selectedTeamIds);
    setWorking(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setPreview(result.data);
    setDialogOpen(true);
  }

  async function confirmImport() {
    setWorking(true);
    setError(null);
    const result = await service.importTeams(selectedTeamIds);
    setWorking(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setSummary(result.data);
  }

  return (
    <TournamentPage title="Import From Auction" description="Copy active Auction teams and players into Cricket Flow master records.">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", marginBlockEnd: "12px" }}>
        <Text role="status">{selectedTeamIds.length} team(s) selected</Text>
        <Button appearance="primary" disabled={selectedTeamIds.length === 0 || working} onClick={() => void previewImport()}>
          Preview Import
        </Button>
      </div>
      <TournamentRequestState
        isLoading={request.isLoading}
        error={request.error}
        emptyMessage={request.data && teams.length === 0 ? "No active Auction teams are available." : undefined}
        loadingLabel="Loading active Auction teams"
      />
      {error && !dialogOpen && <MessageBar intent="error"><MessageBarBody>{error.message}</MessageBarBody></MessageBar>}
      {!request.isLoading && !request.error && teams.length > 0 && (
        <>
          <DataGrid
            aria-label="Active Auction teams"
            className="cf-table-surface"
            items={teams}
            columns={columns}
            getRowId={(team) => team.id}
            selectionMode="multiselect"
            selectedItems={new Set(teams.filter((team) => selectedTeamIds.includes(team.id)).map((team) => team.id))}
            onSelectionChange={(_, data) => {
              const pageSelection = new Set([...data.selectedItems].map(String));
              setSelectedTeamIds((current) => [
                ...current.filter((id) => !visibleIds.has(id)),
                ...pageSelection,
              ]);
              setPreview(null);
              setSummary(null);
            }}
          >
            <DataGridHeader>
              <DataGridRow>
                {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
              </DataGridRow>
            </DataGridHeader>
            <DataGridBody<AuctionTeam>>
              {({ item, rowId }) => (
                <DataGridRow<AuctionTeam> key={rowId}>
                  {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
                </DataGridRow>
              )}
            </DataGridBody>
          </DataGrid>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginBlockStart: "12px" }}>
            <Button appearance="secondary" disabled={cursorHistory.length === 0 || request.isLoading} onClick={previousPage}>Previous</Button>
            <Button appearance="secondary" disabled={!request.data?.nextCursor || request.isLoading} onClick={() => changePage(request.data?.nextCursor)}>Next</Button>
          </div>
        </>
      )}
      <Dialog open={dialogOpen} onOpenChange={(_, data) => setDialogOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{summary ? "Auction import results" : "Confirm Auction import"}</DialogTitle>
            <DialogContent style={{ display: "grid", gap: "16px" }}>
              {error && <MessageBar intent="error"><MessageBarBody>{error.message}</MessageBarBody></MessageBar>}
              {summary ? <SummaryRows summary={summary} /> : preview && <SummaryRows summary={preview} />}
              {summary?.messages.map((message, index) => (
                <MessageBar key={`${index}-${message}`} intent="warning"><MessageBarBody>{message}</MessageBarBody></MessageBar>
              ))}
              {!summary && <Text>Selected active records will be copied into Cricket Flow. Auction records will not be changed.</Text>}
            </DialogContent>
            <DialogActions>
              {summary ? (
                <DialogTrigger disableButtonEnhancement><Button appearance="primary">Close</Button></DialogTrigger>
              ) : (
                <>
                  <DialogTrigger disableButtonEnhancement><Button appearance="secondary" disabled={working}>Cancel</Button></DialogTrigger>
                  <Button appearance="primary" disabled={working || !preview || preview.teamsToImport + preview.playersToImport === 0} onClick={() => void confirmImport()}>
                    {working ? "Importing" : "Confirm Import"}
                  </Button>
                </>
              )}
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </TournamentPage>
  );
}
