import type { CricketBatterStatistic } from "../../models/CricketBatterStatistic";
import type { CricketBowlerStatistic } from "../../models/CricketBowlerStatistic";
import type { CricketBallEvent } from "../../models/CricketBallEvent";
import type { IBallEventRepository } from "../../repositories/interfaces/IBallEventRepository";
import type { IBatterStatisticRepository } from "../../repositories/interfaces/IBatterStatisticRepository";
import type { IBowlerStatisticRepository } from "../../repositories/interfaces/IBowlerStatisticRepository";
import type { IStatisticsService } from "../interfaces/IStatisticsService";
import { guardService, serviceFailure } from "./ServiceSupport";

export class StatisticsService implements IStatisticsService {
  private readonly events: IBallEventRepository;
  private readonly batterStatistics: IBatterStatisticRepository;
  private readonly bowlerStatistics: IBowlerStatisticRepository;

  constructor(
    events: IBallEventRepository,
    batterStatistics: IBatterStatisticRepository,
    bowlerStatistics: IBowlerStatisticRepository,
  ) {
    this.events = events;
    this.batterStatistics = batterStatistics;
    this.bowlerStatistics = bowlerStatistics;
  }

  calculateBattingStats(matchId: string): Promise<Result<CricketBatterStatistic[]>> {
    return guardService("Could not calculate batting statistics.", async () => {
      const events = await this.getAllMatchEvents(matchId);
      if (!events.success) return events;
      if (events.data.length === 0) return { success: true, data: [] };
      return serviceFailure(
        "Could not calculate batting statistics.",
        new Error("Ball/extra credit and legal-delivery batting rules are not fully specified; refusing to write calculated statistics."),
      );
    });
  }

  calculateBowlingStats(matchId: string): Promise<Result<CricketBowlerStatistic[]>> {
    return guardService("Could not calculate bowling statistics.", async () => {
      const events = await this.getAllMatchEvents(matchId);
      if (!events.success) return events;
      if (events.data.length === 0) return { success: true, data: [] };
      return serviceFailure(
        "Could not calculate bowling statistics.",
        new Error("Bowling credit, maiden, and legal-delivery rules are not fully specified; refusing to write calculated statistics."),
      );
    });
  }

  calculateStatisticsFromEvents(matchId: string): Promise<Result<void>> {
    return guardService("Could not calculate statistics from Ball Events.", async () => {
      const batting = await this.calculateBattingStats(matchId);
      if (!batting.success) return batting;
      const bowling = await this.calculateBowlingStats(matchId);
      if (!bowling.success) return bowling;

      for (const statistic of batting.data) {
        const saved = await this.batterStatistics.upsert(statistic);
        if (!saved.success) return saved;
      }
      for (const statistic of bowling.data) {
        const saved = await this.bowlerStatistics.upsert(statistic);
        if (!saved.success) return saved;
      }
      return { success: true, data: undefined };
    });
  }

  private async getAllMatchEvents(matchId: string): Promise<Result<CricketBallEvent[]>> {
    const events: CricketBallEvent[] = [];
    let cursor: string | undefined;
    do {
      const page = await this.events.getByMatch(matchId, undefined, cursor);
      if (!page.success) return page;
      events.push(...page.data.items);
      if (page.data.nextCursor === cursor) {
        return serviceFailure("Could not page match Ball Events.", new Error("Dataverse returned a repeated continuation cursor."));
      }
      cursor = page.data.nextCursor;
    } while (cursor !== undefined);
    return { success: true, data: events };
  }
}
