import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Dropdown,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Option,
  Spinner,
} from "@fluentui/react-components";
import { useState } from "react";
import type { CricketPlayer } from "../../models/CricketPlayer";
import type { CricketTournamentPlayer } from "../../models/CricketTournamentPlayer";
import type { CricketTournamentTeam } from "../../models/CricketTournamentTeam";
import type { BulkPlayerRegistrationFailure, BulkPlayerRegistrationOutcome } from "../../services/interfaces/ITournamentRegistrationService";

interface BulkPlayerRegistrationDialogProps {
  tournamentId: string;
  players: readonly CricketPlayer[];
  teams: readonly CricketTournamentTeam[];
  registrations: readonly CricketTournamentPlayer[];
  onRegister(tournamentId: string, teamId: string, playerIds: readonly string[]): Promise<Result<BulkPlayerRegistrationOutcome>>;
}

interface SubmissionSummary {
  registeredCount: number;
  failed: BulkPlayerRegistrationFailure[];
}

export function BulkPlayerRegistrationDialog({ tournamentId, players, teams, registrations, onRegister }: BulkPlayerRegistrationDialogProps) {
  const [open, setOpen] = useState(false);
  const [teamId, setTeamId] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [summary, setSummary] = useState<SubmissionSummary | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);
  const registeredIds = new Set(registrations.map((registration) => registration.promx_player));
  const availablePlayers = players.filter((player) => player.promx_cricketplayerid
    && player.statecode === 0
    && player.statuscode === 1
    && !registeredIds.has(player.promx_cricketplayerid));
  const visiblePlayers = availablePlayers.filter((player) => player.promx_cricketplayer1.toLowerCase().includes(search.trim().toLowerCase()));
  const selectedSet = new Set(selectedIds);
  const availableTeams = teams.filter((team) => team.promx_crickettournamentteamid);

  function togglePlayer(playerId: string, checked: boolean) {
    setSelectedIds((current) => checked
      ? [...new Set([...current, playerId])]
      : current.filter((id) => id !== playerId));
    setSummary(null);
    setError(null);
  }

  async function submit() {
    if (!teamId || selectedIds.length === 0) return;
    setSaving(true);
    setSummary(null);
    setError(null);
    try {
      const result = await onRegister(tournamentId, teamId, selectedIds);
      if (!result.success) {
        setError(result.error);
        return;
      }

      setSelectedIds(result.data.failed.map((failure) => failure.playerId));
      setSummary({ registeredCount: result.data.registered.length, failed: result.data.failed });
      if (result.data.failed.length === 0) {
        setOpen(false);
        setTeamId("");
        setSearch("");
        setSelectedIds([]);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError : new Error("Could not bulk register players."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(_, data) => {
      setOpen(data.open);
      if (data.open) {
        setError(null);
        setSummary(null);
      }
    }}>
      <DialogTrigger disableButtonEnhancement>
        <Button appearance="secondary">Bulk Register Existing Players</Button>
      </DialogTrigger>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Bulk Register Existing Players</DialogTitle>
          <DialogContent style={{ display: "grid", gap: "12px" }}>
            {error && <MessageBar intent="error"><MessageBarBody>{error.message}</MessageBarBody></MessageBar>}
            {summary && summary.registeredCount > 0 && (
              <MessageBar intent="success"><MessageBarBody>{`Registered ${summary.registeredCount} player${summary.registeredCount === 1 ? "" : "s"}.`}</MessageBarBody></MessageBar>
            )}
            {summary && summary.failed.length > 0 && (
              <MessageBar intent="error">
                <MessageBarBody>
                  <div>{`${summary.failed.length} player${summary.failed.length === 1 ? "" : "s"} could not be registered:`}</div>
                  <ul>
                    {summary.failed.map((failure) => (
                      <li key={failure.playerId}>{`${players.find((player) => player.promx_cricketplayerid === failure.playerId)?.promx_cricketplayer1 ?? failure.playerName}: ${failure.message}`}</li>
                    ))}
                  </ul>
                </MessageBarBody>
              </MessageBar>
            )}
            <Field label="Tournament team" required>
              <Dropdown
                aria-label="Tournament team"
                placeholder="Select a team"
                value={availableTeams.find((team) => team.promx_crickettournamentteamid === teamId)?.promx_tournamentteamname ?? ""}
                selectedOptions={teamId ? [teamId] : []}
                onOptionSelect={(_, data) => setTeamId(data.optionValue ?? "")}
              >
                {availableTeams.map((team) => (
                  <Option key={team.promx_crickettournamentteamid} value={team.promx_crickettournamentteamid!}>
                    {team.promx_tournamentteamname}
                  </Option>
                ))}
              </Dropdown>
            </Field>
            <Field label="Find players">
              <Input value={search} onChange={(_, data) => setSearch(data.value)} />
            </Field>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
              <span role="status">{`${selectedIds.length} selected`}</span>
              <div style={{ display: "flex", gap: "8px" }}>
                <Button size="small" appearance="subtle" disabled={visiblePlayers.length === 0} onClick={() => {
                  setSelectedIds((current) => [...new Set([...current, ...visiblePlayers.flatMap((player) => player.promx_cricketplayerid ? [player.promx_cricketplayerid] : [])])]);
                  setSummary(null);
                }}>Select all matching</Button>
                <Button size="small" appearance="subtle" disabled={selectedIds.length === 0} onClick={() => {
                  setSelectedIds([]);
                  setSummary(null);
                }}>Clear selection</Button>
              </div>
            </div>
            <div style={{ display: "grid", gap: "8px", maxHeight: "min(45vh, 360px)", overflowY: "auto" }}>
              {visiblePlayers.map((player) => {
                const playerId = player.promx_cricketplayerid;
                if (!playerId) return null;
                return (
                  <Checkbox
                    key={playerId}
                    checked={selectedSet.has(playerId)}
                    label={player.promx_cricketplayer1}
                    onChange={(_, data) => togglePlayer(playerId, data.checked === true)}
                  />
                );
              })}
              {availablePlayers.length === 0 && <span>No unregistered active players are available.</span>}
              {availablePlayers.length > 0 && visiblePlayers.length === 0 && <span>No players match this search.</span>}
            </div>
          </DialogContent>
          <DialogActions>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary" disabled={saving}>Cancel</Button>
            </DialogTrigger>
            <Button appearance="primary" disabled={saving || !teamId || selectedIds.length === 0} onClick={() => void submit()}>
              {saving ? <Spinner size="tiny" label="Registering players" /> : `Register ${selectedIds.length} players`}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}