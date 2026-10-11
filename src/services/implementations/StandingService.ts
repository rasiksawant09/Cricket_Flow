import type { CricketTournamentStanding } from "../../models/CricketTournamentStanding";
import type { CricketMatch } from "../../models/CricketMatch";
import type { IInningsRepository } from "../../repositories/interfaces/IInningsRepository";
import type { IMatchRepository } from "../../repositories/interfaces/IMatchRepository";
import type { IBallEventRepository } from "../../repositories/interfaces/IBallEventRepository";
import type { ITournamentRepository } from "../../repositories/interfaces/ITournamentRepository";
import type { ITournamentStandingRepository } from "../../repositories/interfaces/ITournamentStandingRepository";
import type { ITournamentTeamRepository } from "../../repositories/interfaces/ITournamentTeamRepository";
import type { IStandingService } from "../interfaces/IStandingService";
import { reduceInnings } from "./MatchStateReducer";
import { isNRRInningsCompleted, reduceNRR, type NRRInningsScore, type NRRTotals } from "./NRRReducer";
import { reduceStandings } from "./StandingsReducer";
import { guardService, readAllPages, serviceFailure } from "./ServiceSupport";

export class StandingService implements IStandingService {
  private readonly matches: IMatchRepository;
  private readonly events: IBallEventRepository;
  private readonly innings: IInningsRepository;
  private readonly tournamentTeams: ITournamentTeamRepository;
  private readonly tournaments: ITournamentRepository;
  private readonly standings: ITournamentStandingRepository;

  constructor(
    matches: IMatchRepository,
    events: IBallEventRepository,
    innings: IInningsRepository,
    tournamentTeams: ITournamentTeamRepository,
    tournaments: ITournamentRepository,
    standings: ITournamentStandingRepository,
  ) {
    this.matches = matches;
    this.events = events;
    this.innings = innings;
    this.tournamentTeams = tournamentTeams;
    this.tournaments = tournaments;
    this.standings = standings;
  }

  getStandings(tournamentId: string): Promise<Result<CricketTournamentStanding[]>> {
    return guardService("Could not retrieve tournament standings.", async () => {
      const rows = await readAllPages("Could not retrieve tournament standings.", (cursor) =>
        this.standings.getByTournament(tournamentId, undefined, cursor),
      );
      if (!rows.success) return rows;
      return {
        success: true,
        data: [...rows.data].sort((a, b) =>
          (b.promx_points ?? 0) - (a.promx_points ?? 0)
          || (b.promx_matcheswon ?? 0) - (a.promx_matcheswon ?? 0)
          || (b.promx_netrunrate ?? 0) - (a.promx_netrunrate ?? 0)
          || a.promx_standingname.localeCompare(b.promx_standingname)),
      };
    });
  }

  updateStandings(tournamentId: string): Promise<Result<CricketTournamentStanding[]>> {
    return guardService("Could not calculate tournament standings.", async () => {
      const tournament = await this.tournaments.getById(tournamentId);
      if (!tournament.success) return tournament;
      const teams = await readAllPages("Could not retrieve tournament teams.", (cursor) =>
        this.tournamentTeams.getByTournament(tournamentId, undefined, cursor),
      );
      if (!teams.success) return teams;
      const matches = await readAllPages("Could not retrieve tournament matches.", (cursor) =>
        this.matches.getByTournament(tournamentId, undefined, cursor),
      );
      if (!matches.success) return matches;
      const existing = await readAllPages("Could not retrieve tournament standings.", (cursor) =>
        this.standings.getByTournament(tournamentId, undefined, cursor),
      );
      if (!existing.success) return existing;

      const teamIds = teams.data.flatMap((team) => (team.promx_crickettournamentteamid ? [team.promx_crickettournamentteamid] : []));
      const totals = reduceStandings(matches.data, teamIds, {
        win: tournament.data.promx_pointsforwin ?? 0,
        tie: tournament.data.promx_pointsfortie ?? 0,
        loss: tournament.data.promx_pointsforloss ?? 0,
      });
      const nrrTotals = await this.calculateNRRTotals(tournament.data, matches.data, teamIds);
      if (!nrrTotals.success) return nrrTotals;
      const names = new Map(teams.data.flatMap((team) => (team.promx_crickettournamentteamid
        ? [[team.promx_crickettournamentteamid, team.promx_tournamentteamname] as const]
        : [])));

      const saved: CricketTournamentStanding[] = [];
      for (const [teamId, total] of [...totals.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        const current = existing.data.find((row) => row.promx_tournamentteam === teamId);
        const result = await this.standings.upsert({
          ...current,
          promx_tournament: tournamentId,
          promx_tournamentteam: teamId,
          promx_standingname: current?.promx_standingname ?? `${names.get(teamId) ?? teamId} standing`,
          promx_matchesplayed: total.matchesPlayed,
          promx_matcheswon: total.wins,
          promx_matcheslost: total.losses,
          promx_matchestied: total.ties,
          promx_points: total.points,
          promx_runsscored: nrrTotals.data.get(teamId)?.runsScored ?? 0,
          promx_runsconceded: nrrTotals.data.get(teamId)?.runsConceded ?? 0,
          promx_oversfaced: nrrTotals.data.get(teamId)?.oversFaced ?? 0,
          promx_oversbowled: nrrTotals.data.get(teamId)?.oversBowled ?? 0,
          promx_netrunrate: nrrTotals.data.get(teamId)?.netRunRate ?? 0,
        });
        if (!result.success) return result;
        saved.push(result.data);
      }
      return { success: true, data: saved };
    });
  }

  calculateNRR(tournamentId: string, tournamentTeamId: string): Promise<Result<number>> {
    return guardService("Could not calculate Net Run Rate.", async () => {
      const tournament = await this.tournaments.getById(tournamentId);
      if (!tournament.success) return tournament;
      const tournamentTeam = await this.tournamentTeams.getById(tournamentTeamId);
      if (!tournamentTeam.success) return tournamentTeam;
      if (tournamentTeam.data.promx_tournament !== tournamentId) {
        return serviceFailure("Could not calculate Net Run Rate.", new Error("Tournament Team does not belong to the requested tournament."));
      }
      const matches = await readAllPages("Could not retrieve tournament matches.", (cursor) =>
        this.matches.getByTournament(tournamentId, undefined, cursor),
      );
      if (!matches.success) return matches;
      const teamIds = tournamentTeam.data.promx_crickettournamentteamid ? [tournamentTeamId] : [];
      const totals = await this.calculateNRRTotals(tournament.data, matches.data, teamIds);
      if (!totals.success) return totals;
      return { success: true, data: totals.data.get(tournamentTeamId)?.netRunRate ?? 0 };
    });
  }

  rebuildTournamentTable(tournamentId: string): Promise<Result<CricketTournamentStanding[]>> {
    return this.updateStandings(tournamentId);
  }

  private async calculateNRRTotals(
    tournament: { promx_oversperinnings: number; promx_playersperteam: number },
    matches: readonly CricketMatch[],
    teamIds: readonly string[],
  ): Promise<Result<Map<string, NRRTotals>>> {
    const inningsScores: NRRInningsScore[] = [];
    for (const match of matches) {
      if (match.statuscode !== 2) continue;
      const matchId = match.promx_cricketmatchid;
      if (!matchId) {
        return serviceFailure("Could not calculate Net Run Rate.", new Error("A completed match has no primary ID."));
      }
      const matchInnings = await readAllPages("Could not retrieve match innings for Net Run Rate.", (cursor) =>
        this.innings.getByMatch(matchId, undefined, cursor),
      );
      if (!matchInnings.success) return matchInnings;

      for (const innings of matchInnings.data) {
        if (!isNRRInningsCompleted(innings.statuscode)) continue;
        if (innings.promx_issuperover === true || innings.promx_inningstype === 796280001) continue;
        const inningsId = innings.promx_cricketinningsid;
        if (!inningsId) {
          return serviceFailure("Could not calculate Net Run Rate.", new Error("A completed innings has no primary ID."));
        }
        const events = await readAllPages("Could not retrieve innings Ball Events for Net Run Rate.", (cursor) =>
          this.events.getByInnings(inningsId, undefined, cursor),
        );
        if (!events.success) return events;
        const reduced = reduceInnings(inningsId, events.data);
        inningsScores.push({
          matchStatusCode: match.statuscode,
          inningsStatusCode: innings.statuscode,
          isSuperOver: innings.promx_issuperover,
          inningsType: innings.promx_inningstype,
          battingTeamId: innings.promx_battingteam,
          bowlingTeamId: innings.promx_bowlingteam,
          runs: reduced.runs,
          wickets: reduced.wickets,
          legalBalls: reduced.legalBalls,
        });
      }
    }
    return {
      success: true,
      data: reduceNRR(inningsScores, teamIds, {
        oversPerInnings: tournament.promx_oversperinnings,
        playersPerTeam: tournament.promx_playersperteam,
      }),
    };
  }
}
