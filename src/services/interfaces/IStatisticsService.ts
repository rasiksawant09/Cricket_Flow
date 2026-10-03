import type { CricketBatterStatistic } from "../../models/CricketBatterStatistic";
import type { CricketBowlerStatistic } from "../../models/CricketBowlerStatistic";

export interface IStatisticsService {
  calculateBattingStats(matchId: string): Promise<Result<CricketBatterStatistic[]>>;
  calculateBowlingStats(matchId: string): Promise<Result<CricketBowlerStatistic[]>>;
  calculateStatisticsFromEvents(matchId: string): Promise<Result<void>>;
}
