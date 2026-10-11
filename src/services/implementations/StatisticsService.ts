import type { CricketBallEvent } from "../../models/CricketBallEvent";
import type { CricketBatterStatistic } from "../../models/CricketBatterStatistic";
import type { CricketBowlerStatistic } from "../../models/CricketBowlerStatistic";
import type { CricketInnings } from "../../models/CricketInnings";
import type { IBallEventRepository } from "../../repositories/interfaces/IBallEventRepository";
import type { IBatterStatisticRepository } from "../../repositories/interfaces/IBatterStatisticRepository";
import type { IBowlerStatisticRepository } from "../../repositories/interfaces/IBowlerStatisticRepository";
import type { IMatchPlayerRepository } from "../../repositories/interfaces/IMatchPlayerRepository";
import type { IMatchRepository } from "../../repositories/interfaces/IMatchRepository";
import type { IInningsRepository } from "../../repositories/interfaces/IInningsRepository";
import type { IStatisticsService, InningsScorecardStatistics } from "../interfaces/IStatisticsService";
import type { TournamentBattingLeaderboardEntry, TournamentBowlingLeaderboardEntry, TournamentLeaderboards } from "../interfaces/IStatisticsService";
import { reduceBatterStatistics, reduceBowlerStatistics } from "./StatisticsReducer";
import { selectEffectiveEvents } from "./MatchStateReducer";
import { formatOvers } from "./MatchStateReducer";
import { guardService, readAllPages, serviceFailure } from "./ServiceSupport";

export class StatisticsService implements IStatisticsService {
  private readonly events: IBallEventRepository;
  private readonly batterStatistics: IBatterStatisticRepository;
  private readonly bowlerStatistics: IBowlerStatisticRepository;
  private readonly matchPlayers: IMatchPlayerRepository;
  private readonly matches: IMatchRepository;
  private readonly innings: IInningsRepository;

  constructor(
    events: IBallEventRepository,
    batterStatistics: IBatterStatisticRepository,
    bowlerStatistics: IBowlerStatisticRepository,
    matchPlayers: IMatchPlayerRepository,
    matches: IMatchRepository,
    innings: IInningsRepository,
  ) {
    this.events = events;
    this.batterStatistics = batterStatistics;
    this.bowlerStatistics = bowlerStatistics;
    this.matchPlayers = matchPlayers;
    this.matches = matches;
    this.innings = innings;
  }

  getInningsScorecard(matchId: string): Promise<Result<InningsScorecardStatistics[]>> {
    return guardService("Could not calculate innings scorecards.", async () => {
      const eventsResult = await readAllPages("Could not retrieve Ball Events.", (cursor) =>
        this.events.getByMatch(matchId, undefined, cursor),
      );
      if (!eventsResult.success) return eventsResult;

      const byInnings = new Map<string, CricketBallEvent[]>();
      for (const event of selectEffectiveEvents(eventsResult.data)) {
        const group = byInnings.get(event.promx_innings) ?? [];
        group.push(event);
        byInnings.set(event.promx_innings, group);
      }

      const scorecards = [...byInnings.entries()].map(([inningsId, events]) => {
        const effectiveEvents = selectEffectiveEvents(events);
        let runs = 0;
        let wickets = 0;
        let legalBalls = 0;
        const fallOfWickets = effectiveEvents.flatMap((event) => {
          runs += event.promx_totalruns ?? (event.promx_batterruns ?? 0) + (event.promx_extraruns ?? 0);
          if (event.promx_islegaldelivery === true) legalBalls += 1;
          if (event.promx_iswicket !== true || event.promx_dismissalvalid === false) return [];
          wickets += 1;
          return [{ runs, wickets, playerId: event.promx_dismissedplayer ?? null, legalBalls }];
        });

        const bowling = reduceBowlerStatistics(effectiveEvents).map((bowler) => {
          const byOver = new Map<string, { legalBalls: number; runs: number }>();
          for (const event of effectiveEvents) {
            if (event.promx_bowler !== bowler.playerId) continue;
            const over = byOver.get(event.promx_over) ?? { legalBalls: 0, runs: 0 };
            if (event.promx_islegaldelivery === true) over.legalBalls += 1;
            if (event.promx_eventtype === 796280001 || event.promx_eventtype === 796280002) {
              over.runs += (event.promx_batterruns ?? 0) + (event.promx_extraruns ?? 0);
            } else if (event.promx_eventtype !== 796280003 && event.promx_eventtype !== 796280004) {
              over.runs += event.promx_batterruns ?? 0;
            }
            byOver.set(event.promx_over, over);
          }
          return {
            playerId: bowler.playerId,
            overs: bowler.overs,
            maidens: [...byOver.values()].filter((over) => over.legalBalls >= 6 && over.runs === 0).length,
            runsConceded: bowler.runsConceded,
            wickets: bowler.wickets,
            economy: bowler.economy,
          };
        });

        return {
          inningsId,
          runs,
          wickets,
          legalBalls,
          batting: reduceBatterStatistics(effectiveEvents),
          bowling,
          fallOfWickets,
        };
      });
      return { success: true, data: scorecards };
    });
  }

  getBattingStatistics(matchId: string): Promise<Result<CricketBatterStatistic[]>> {
    return guardService("Could not retrieve batting statistics.", () =>
      readAllPages("Could not retrieve batting statistics.", (cursor) => this.batterStatistics.getByMatch(matchId, undefined, cursor)),
    );
  }

  getBowlingStatistics(matchId: string): Promise<Result<CricketBowlerStatistic[]>> {
    return guardService("Could not retrieve bowling statistics.", () =>
      readAllPages("Could not retrieve bowling statistics.", (cursor) => this.bowlerStatistics.getByMatch(matchId, undefined, cursor)),
    );
  }

  calculateBattingStats(matchId: string): Promise<Result<CricketBatterStatistic[]>> {
    return guardService("Could not calculate batting statistics.", async () => {
      const inputs = await this.loadInputs(matchId);
      if (!inputs.success) return inputs;
      return { success: true, data: this.battingRows(matchId, inputs.data) };
    });
  }

  calculateBowlingStats(matchId: string): Promise<Result<CricketBowlerStatistic[]>> {
    return guardService("Could not calculate bowling statistics.", async () => {
      const inputs = await this.loadInputs(matchId);
      if (!inputs.success) return inputs;
      return { success: true, data: this.bowlingRows(matchId, inputs.data) };
    });
  }

  rebuildBattingStatistics(matchId: string): Promise<Result<CricketBatterStatistic[]>> {
    return guardService("Could not rebuild batting statistics.", async () => {
      const [inputs, existing] = await Promise.all([this.loadInputs(matchId), this.getBattingStatistics(matchId)]);
      if (!inputs.success) return inputs;
      if (!existing.success) return existing;
      return this.syncBatting(matchId, inputs.data, existing.data);
    });
  }

  rebuildBowlingStatistics(matchId: string): Promise<Result<CricketBowlerStatistic[]>> {
    return guardService("Could not rebuild bowling statistics.", async () => {
      const [inputs, existing] = await Promise.all([this.loadInputs(matchId), this.getBowlingStatistics(matchId)]);
      if (!inputs.success) return inputs;
      if (!existing.success) return existing;
      return this.syncBowling(matchId, inputs.data, existing.data);
    });
  }

  calculateStatisticsFromEvents(matchId: string): Promise<Result<void>> {
    return guardService("Could not calculate statistics from Ball Events.", async () => {
      const [inputs, existingBatting, existingBowling] = await Promise.all([
        this.loadInputs(matchId),
        this.getBattingStatistics(matchId),
        this.getBowlingStatistics(matchId),
      ]);
      if (!inputs.success) return inputs;
      if (!existingBatting.success) return existingBatting;
      if (!existingBowling.success) return existingBowling;
      const [batting, bowling] = await Promise.all([
        this.syncBatting(matchId, inputs.data, existingBatting.data),
        this.syncBowling(matchId, inputs.data, existingBowling.data),
      ]);
      if (!batting.success) return batting;
      if (!bowling.success) return bowling;
      return { success: true, data: undefined };
    });
  }

  getTournamentLeaderboards(tournamentId: string): Promise<Result<TournamentLeaderboards>> {
    return guardService("Could not retrieve tournament leaderboards.", async () => {
      const matches = await readAllPages("Could not retrieve tournament matches for leaderboards.", (cursor) =>
        this.matches.getByTournament(tournamentId, undefined, cursor),
      );
      if (!matches.success) return matches;

      const batting = new Map<string, {
        playerId: string;
        playerName: string;
        teamName: string;
        runs: number;
        ballsFaced: number;
        fours: number;
        sixes: number;
        outs: number;
      }>();
      const bowling = new Map<string, {
        playerId: string;
        playerName: string;
        teamName: string;
        ballsBowled: number;
        runsConceded: number;
        wickets: number;
      }>();

      for (const match of matches.data) {
        const matchId = match.promx_cricketmatchid;
        if (!matchId) {
          return serviceFailure("Could not retrieve tournament leaderboards.", new Error("A tournament match has no primary ID."));
        }
        const [battingResult, bowlingResult, matchPlayers] = await Promise.all([
          this.getBattingStatistics(matchId),
          this.getBowlingStatistics(matchId),
          readAllPages("Could not retrieve match players for leaderboards.", (cursor) =>
            this.matchPlayers.getByMatch(matchId, undefined, cursor),
          ),
        ]);
        if (!battingResult.success) return battingResult;
        if (!bowlingResult.success) return bowlingResult;
        if (!matchPlayers.success) return matchPlayers;

        const playersByMatchId = new Map(matchPlayers.data.flatMap((player) =>
          player.promx_cricketmatchplayerid ? [[player.promx_cricketmatchplayerid, player] as const] : [],
        ));
        for (const statistic of battingResult.data) {
          const player = statistic.promx_player ? playersByMatchId.get(statistic.promx_player) : undefined;
          const playerId = player?.promx_tournamentplayer;
          if (!playerId) continue;
          let total = batting.get(playerId);
          if (!total) {
            total = {
              playerId,
              playerName: player.promx_playernamesnapshot,
              teamName: player.promx_teamsnapshot,
              runs: 0,
              ballsFaced: 0,
              fours: 0,
              sixes: 0,
              outs: 0,
            };
            batting.set(playerId, total);
          }
          total.runs += statistic.promx_runs ?? 0;
          total.ballsFaced += statistic.promx_ballsfaced ?? 0;
          total.fours += statistic.promx_fours ?? 0;
          total.sixes += statistic.promx_sixes ?? 0;
          total.outs += statistic.promx_isdismissed === true ? 1 : 0;
        }
        for (const statistic of bowlingResult.data) {
          const player = statistic.promx_player ? playersByMatchId.get(statistic.promx_player) : undefined;
          const playerId = player?.promx_tournamentplayer;
          if (!playerId) continue;
          let total = bowling.get(playerId);
          if (!total) {
            total = {
              playerId,
              playerName: player.promx_playernamesnapshot,
              teamName: player.promx_teamsnapshot,
              ballsBowled: 0,
              runsConceded: 0,
              wickets: 0,
            };
            bowling.set(playerId, total);
          }
          total.ballsBowled += oversToBalls(statistic.promx_overs);
          total.runsConceded += statistic.promx_runsconceded ?? 0;
          total.wickets += statistic.promx_wickets ?? 0;
        }
      }

      const battingEntries: TournamentBattingLeaderboardEntry[] = [...batting.values()].map((total) => ({
        ...total,
        strikeRate: total.ballsFaced > 0 ? round2((total.runs / total.ballsFaced) * 100) : 0,
      }));
      const bowlingEntries: TournamentBowlingLeaderboardEntry[] = [...bowling.values()].map((total) => ({
        playerId: total.playerId,
        playerName: total.playerName,
        teamName: total.teamName,
        overs: formatOvers(total.ballsBowled),
        runsConceded: total.runsConceded,
        wickets: total.wickets,
        economy: total.ballsBowled > 0 ? round2(total.runsConceded / (total.ballsBowled / 6)) : 0,
      }));

      return {
        success: true,
        data: {
          topRunScorers: [...battingEntries].sort((left, right) => right.runs - left.runs || left.playerName.localeCompare(right.playerName)),
          topWicketTakers: [...bowlingEntries].sort((left, right) => right.wickets - left.wickets || left.economy - right.economy || left.playerName.localeCompare(right.playerName)),
          bestStrikeRates: battingEntries.filter((entry) => entry.ballsFaced > 0)
            .sort((left, right) => right.strikeRate - left.strikeRate || right.runs - left.runs || left.playerName.localeCompare(right.playerName)),
          bestEconomyRates: bowlingEntries.filter((entry) => entry.overs > 0)
            .sort((left, right) => left.economy - right.economy || right.wickets - left.wickets || left.playerName.localeCompare(right.playerName)),
        },
      };
    });
  }

  private battingRows(matchId: string, inputs: StatisticsInputs): CricketBatterStatistic[] {
    return reduceBatterStatistics(inputs.events).map((batter) => ({
      promx_batterstatisticsname: `${inputs.names.get(batter.playerId) ?? batter.playerId} - batting`,
      promx_match: matchId,
      promx_player: batter.playerId,
      promx_runs: batter.runs,
      promx_ballsfaced: batter.ballsFaced,
      promx_fours: batter.fours,
      promx_sixes: batter.sixes,
      promx_strikerate: batter.strikeRate,
      promx_isdismissed: batter.dismissed,
    }));
  }

  private bowlingRows(matchId: string, inputs: StatisticsInputs): CricketBowlerStatistic[] {
    return reduceBowlerStatistics(inputs.events).map((bowler) => ({
      promx_bowlerstatisticsname: `${inputs.names.get(bowler.playerId) ?? bowler.playerId} - bowling`,
      promx_match: matchId,
      promx_player: bowler.playerId,
      promx_overs: bowler.overs,
      promx_runsconceded: bowler.runsConceded,
      promx_wickets: bowler.wickets,
      promx_economy: bowler.economy,
    }));
  }

  // Rows whose events were reversed or superseded are zeroed, since rows cannot be deleted.
  private syncBatting(matchId: string, inputs: StatisticsInputs, existing: CricketBatterStatistic[]): Promise<Result<CricketBatterStatistic[]>> {
    return syncRows(
      this.battingRows(matchId, inputs),
      existing,
      BATTING_FIELDS,
      (row) => ({ ...row, promx_runs: 0, promx_ballsfaced: 0, promx_fours: 0, promx_sixes: 0, promx_strikerate: 0, promx_isdismissed: false }),
      (row) => this.batterStatistics.upsert(row),
    );
  }

  private syncBowling(matchId: string, inputs: StatisticsInputs, existing: CricketBowlerStatistic[]): Promise<Result<CricketBowlerStatistic[]>> {
    return syncRows(
      this.bowlingRows(matchId, inputs),
      existing,
      BOWLING_FIELDS,
      (row) => ({ ...row, promx_overs: 0, promx_runsconceded: 0, promx_wickets: 0, promx_economy: 0 }),
      (row) => this.bowlerStatistics.upsert(row),
    );
  }

  private async loadInputs(matchId: string): Promise<Result<StatisticsInputs>> {
    const [events, innings, players] = await Promise.all([
      readAllPages("Could not retrieve Ball Events.", (cursor) => this.events.getByMatch(matchId, undefined, cursor)),
      readAllPages("Could not retrieve innings for statistics.", (cursor) => this.innings.getByMatch(matchId, undefined, cursor)),
      readAllPages("Could not retrieve match players.", (cursor) => this.matchPlayers.getByMatch(matchId, undefined, cursor)),
    ]);
    if (!events.success) return events;
    if (!innings.success) return innings;
    if (!players.success) return players;
    const regularInningsIds = new Set(innings.data.flatMap((item: CricketInnings) =>
      item.promx_issuperover === true || item.promx_inningstype === 796280001
        ? []
        : item.promx_cricketinningsid ? [item.promx_cricketinningsid] : [],
    ));
    const names = new Map(
      players.data.flatMap((player) => player.promx_cricketmatchplayerid
        ? [[player.promx_cricketmatchplayerid, player.promx_playernamesnapshot] as const]
        : []),
    );
    return {
      success: true,
      data: {
        events: events.data.filter((event) => regularInningsIds.has(event.promx_innings)),
        names,
      },
    };
  }
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

interface StatisticsInputs {
  events: CricketBallEvent[];
  names: Map<string, string>;
}

const BATTING_FIELDS: readonly (keyof CricketBatterStatistic)[] = [
  "promx_runs", "promx_ballsfaced", "promx_fours", "promx_sixes", "promx_strikerate", "promx_isdismissed",
];
const BOWLING_FIELDS: readonly (keyof CricketBowlerStatistic)[] = [
  "promx_overs", "promx_runsconceded", "promx_wickets", "promx_economy",
];

function sameValues<T extends object>(left: T, right: T, fields: readonly (keyof T)[]): boolean {
  const normalize = (value: unknown) => (value == null ? 0 : Number(value));
  return fields.every((field) => normalize(left[field]) === normalize(right[field]));
}

// Writes only rows whose values changed, reusing existing row IDs, with the writes running together.
async function syncRows<T extends { promx_player?: string | null }>(
  calculated: readonly T[],
  existing: readonly T[],
  fields: readonly (keyof T)[],
  zero: (row: T) => T,
  upsert: (row: T) => Promise<Result<T>>,
): Promise<Result<T[]>> {
  const current = new Map(existing.flatMap((row) => (row.promx_player ? [[row.promx_player, row] as const] : [])));
  const calculatedPlayers = new Set(calculated.map((row) => row.promx_player));
  const unchanged: T[] = [];
  const writes: Promise<Result<T>>[] = [];
  const consider = (target: T, previous: T | undefined) => {
    if (previous && sameValues(previous, target, fields)) {
      unchanged.push(previous);
    } else {
      writes.push(upsert(previous ? { ...previous, ...target } : target));
    }
  };
  for (const row of calculated) {
    consider(row, row.promx_player ? current.get(row.promx_player) : undefined);
  }
  for (const stale of existing) {
    if (!calculatedPlayers.has(stale.promx_player)) {
      consider(zero(stale), stale);
    }
  }
  const saved = [...unchanged];
  for (const result of await Promise.all(writes)) {
    if (!result.success) return result;
    saved.push(result.data);
  }
  return { success: true, data: saved };
}

function oversToBalls(overs?: number | null): number {
  if (overs == null || !Number.isFinite(overs) || overs < 0) return 0;
  const wholeOvers = Math.floor(overs);
  const partialBalls = Math.round((overs - wholeOvers) * 10);
  return wholeOvers * 6 + partialBalls;
}
