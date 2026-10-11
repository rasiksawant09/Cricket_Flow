# Cricket Scoring App Domain Models

These models follow [CricketScoringApp_Master_Architecture.md](CricketScoringApp_Master_Architecture.md) and [CricketScoringApp_Implementation_Guide.md](CricketScoringApp_Implementation_Guide.md), and use the live Dataverse schema as the authority for table and column names, types, lookup targets, requiredness, and status values. [CricketScoringApp_Repository_Design.md](CricketScoringApp_Repository_Design.md) and [CricketScoringApp_Service_Design.md](CricketScoringApp_Service_Design.md) describe how the models are accessed and used. No table or column is introduced here.

## Type Mapping

- Dataverse GUID and lookup columns are represented as `string` values containing GUIDs. Lookup navigation is documented outside the interfaces.
- Date-only and DateTime values are represented as strings; consumers should preserve the Dataverse date/time format.
- Dataverse integer, decimal, and BigInt values are represented as `number`.
- Choice columns use numeric option values. Their labels and values are listed in each model's status/choice notes where exposed by the live schema.
- Properties marked required below are the custom columns whose live schema description returned `NOT NULL`. Unmarked custom columns are optional and nullable in these interfaces. Primary GUID columns are optional because the live description did not mark them `NOT NULL`.
- All models extend `DataverseRecord`, which represents the common platform columns returned for all 15 tables. Its properties are optional and nullable; it does not represent an additional Dataverse table.

```typescript
interface DataverseRecord<TStatusCode extends number = number> {
  createdby?: string | null;
  createdon?: string | null;
  createdonbehalfby?: string | null;
  importsequencenumber?: number | null;
  modifiedby?: string | null;
  modifiedon?: string | null;
  modifiedonbehalfby?: string | null;
  overriddencreatedon?: string | null;
  ownerid?: string | null;
  owningbusinessunit?: string | null;
  owningteam?: string | null;
  owninguser?: string | null;
  statecode?: 0 | 1 | null;
  statuscode?: TStatusCode | null;
  timezoneruleversionnumber?: number | null;
  utcconversiontimezonecode?: number | null;
  versionnumber?: number | null;
}
```

## Tournament Domain

### CricketTournament

**Purpose:** Tournament master and tournament-level format/points settings.

**Dataverse Table Name:** `promx_crickettournament`

**TypeScript Interface Definition:**

```typescript
interface CricketTournament extends DataverseRecord<1 | 2 | 796280001 | 796280002> {
  promx_crickettournamentid?: string | null;
  promx_auctionintegrationenabled?: boolean | null;
  promx_description?: string | null;
  promx_enddate?: string | null;
  promx_oversperinnings: number;
  promx_playersperteam: number;
  promx_pointsforloss?: number | null;
  promx_pointsfortie?: number | null;
  promx_pointsforwin?: number | null;
  promx_startdate?: string | null;
  promx_tournamentname: string;
}
```

**Required Properties:** `promx_oversperinnings`, `promx_playersperteam`, `promx_tournamentname`.

**Optional Properties:** `promx_crickettournamentid`, `promx_auctionintegrationenabled`, `promx_description`, `promx_enddate`, `promx_pointsforloss`, `promx_pointsfortie`, `promx_pointsforwin`, `promx_startdate`; all inherited `DataverseRecord` properties.

**Lookup Relationships:** No domain lookup columns were returned. Shared platform lookups are in `DataverseRecord`.

**Status Values:** `statecode`: Active (0), Inactive (1). `statuscode`: Active (1), Completed (2), Draft (796280001), Archived (796280002). Architecture default: Draft.

**Notes:** Source-of-truth tournament setup/settings. The architecture requires historical match interpretation to be preserved; it does not identify individual Tournament fields as immutable.

### CricketTeam

**Purpose:** Reusable team master record.

**Dataverse Table Name:** `promx_cricketteam`

**TypeScript Interface Definition:**

```typescript
interface CricketTeam extends DataverseRecord<1 | 2> {
  promx_cricketteamid?: string | null;
  promx_description?: string | null;
  promx_source?: 796280000 | 796280001 | 796280002 | null;
  promx_source_reference_id?: string | null;
  promx_teamcolor?: string | null;
  promx_teamlogo?: string | null;
  promx_teamname: string;
  promx_teamshortname: string;
}
```

**Required Properties:** `promx_teamname`, `promx_teamshortname`.

**Optional Properties:** `promx_cricketteamid`, `promx_description`, `promx_source`, `promx_source_reference_id`, `promx_teamcolor`, `promx_teamlogo`; all inherited `DataverseRecord` properties.

**Lookup Relationships:** No domain lookup columns were returned. Shared platform lookups are in `DataverseRecord`.

**Status Values:** `statecode`: Active (0), Inactive (1). `statuscode`: Active (1), Inactive (2). `promx_source`: Manual (796280000), Auction (796280001), Import (796280002). Architecture default: Active.

**Notes:** Source-of-truth reusable master data. `promx_source_reference_id` stores the source record ID for copied records; it is provenance only, not a relationship or runtime dependency. Tournament and match history use tournament-specific registration and match records rather than deriving historical details from later master changes.

### CricketPlayer

**Purpose:** Reusable player identity and source details.

**Dataverse Table Name:** `promx_cricketplayer`

**TypeScript Interface Definition:**

```typescript
interface CricketPlayer extends DataverseRecord<1 | 2> {
  promx_active?: boolean | null;
  promx_cricketplayer1: string;
  promx_cricketplayerid?: string | null;
  promx_emailaddress?: string | null;
  promx_employeeid?: string | null;
  promx_gender: 796280000 | 796280001 | 796280002;
  promx_source?: 796280000 | 796280001 | 796280002 | null;
  promx_sourcereferenceid?: string | null;
}
```

**Required Properties:** `promx_cricketplayer1`, `promx_gender`.

**Optional Properties:** `promx_active`, `promx_cricketplayerid`, `promx_emailaddress`, `promx_employeeid`, `promx_source`, `promx_sourcereferenceid`; all inherited `DataverseRecord` properties.

**Lookup Relationships:** No domain lookup columns were returned. Shared platform lookups are in `DataverseRecord`.

**Status Values:** `statecode`: Active (0), Inactive (1). `statuscode`: Active (1), Inactive (2). `promx_gender`: Male (796280000), Female (796280001), Other (796280002). `promx_source`: Manual (796280000), Auction (796280001), Import (796280002). Architecture default status reason: Active.

**Notes:** Source-of-truth player master. Tournament registrations and historical match snapshots are separate records; historical records must not be derived from mutable player-master values.

### CricketTournamentTeam

**Purpose:** Registers a reusable team in a tournament.

**Dataverse Table Name:** `promx_crickettournamentteam`

**TypeScript Interface Definition:**

```typescript
interface CricketTournamentTeam extends DataverseRecord<1 | 2> {
  promx_crickettournamentteamid?: string | null;
  promx_groupname?: string | null;
  promx_seednumber?: number | null;
  promx_team: string;
  promx_tournament: string;
  promx_tournamentteamname: string;
}
```

**Required Properties:** `promx_team`, `promx_tournament`, `promx_tournamentteamname`.

**Optional Properties:** `promx_crickettournamentteamid`, `promx_groupname`, `promx_seednumber`; all inherited `DataverseRecord` properties.

**Lookup Relationships:** `promx_team` -> `promx_cricketteam`; `promx_tournament` -> `promx_crickettournament`.

**Status Values:** `statecode`: Active (0), Inactive (1). `statuscode`: Active (1), Inactive (2). Architecture default: Active.

**Notes:** Source-of-truth tournament registration. The architecture defines this record as the combination of a Tournament and Team.

### CricketTournamentPlayer

**Purpose:** Registers a player to a tournament and tournament team with tournament-specific roster attributes.

**Dataverse Table Name:** `promx_crickettournamentplayer`

**TypeScript Interface Definition:**

```typescript
interface CricketTournamentPlayer extends DataverseRecord<1 | 2> {
  promx_age?: number | null;
  promx_crickettournamentplayerid?: string | null;
  promx_iscaptain?: boolean | null;
  promx_isvicecaptain?: boolean | null;
  promx_jerseynumber?: number | null;
  promx_player: string;
  promx_playercategory?: 796280000 | 796280001 | 796280002 | 796280003 | null;
  promx_tournament: string;
  promx_tournamentplayername: string;
  promx_tournamentteam: string;
}
```

**Required Properties:** `promx_player`, `promx_tournament`, `promx_tournamentplayername`, `promx_tournamentteam`.

**Optional Properties:** `promx_age`, `promx_crickettournamentplayerid`, `promx_iscaptain`, `promx_isvicecaptain`, `promx_jerseynumber`, `promx_playercategory`; all inherited `DataverseRecord` properties.

**Lookup Relationships:** `promx_player` -> `promx_cricketplayer`; `promx_tournament` -> `promx_crickettournament`; `promx_tournamentteam` -> `promx_crickettournamentteam`.

**Status Values:** `statecode`: Active (0), Inactive (1). `statuscode`: Active (1), Inactive (2). `promx_playercategory`: Batsman (796280000), Bowler (796280001), All Rounder (796280002), Wicket Keeper (796280003). Architecture default status reason: Active.

**Notes:** Source-of-truth tournament roster record. The architecture identifies jersey number, captain, vice-captain, category, and team assignment as tournament-specific. Historical Match Player snapshots are not updated from later roster changes.

## Match Domain

### CricketMatch

**Purpose:** Match identity, tournament/team references, scheduling, toss, result, and status.

**Dataverse Table Name:** `promx_cricketmatch`

**TypeScript Interface Definition:**

```typescript
interface CricketMatch extends DataverseRecord<1 | 2 | 796280001 | 796280002 | 796280003 | 796280004 | 796280005 | 796280006 | 796280007 | 796280008> {
  promx_cricketmatchid?: string | null;
  promx_loser?: string | null;
  promx_matchname?: string | null;
  promx_matchnumber?: number | null;
  promx_matchstage?: 796280000 | 796280001 | 796280002 | 796280003 | 796280004 | 796280005 | null;
  promx_remarks?: string | null;
  promx_resulttype?: 796280000 | 796280001 | 796280002 | 796280003 | 796280004 | null;
  promx_scheduleddatetime?: string | null;
  promx_teama: string;
  promx_teamb: string;
  promx_tossdecision?: 796280000 | 796280001 | null;
  promx_tosswinner?: string | null;
  promx_tournament: string;
  promx_winner?: string | null;
}
```

**Required Properties:** `promx_teama`, `promx_teamb`, `promx_tournament`.

**Optional Properties:** `promx_cricketmatchid`, `promx_loser`, `promx_matchname`, `promx_matchnumber`, `promx_matchstage`, `promx_remarks`, `promx_resulttype`, `promx_scheduleddatetime`, `promx_tossdecision`, `promx_tosswinner`, `promx_winner`; all inherited `DataverseRecord` properties.

**Lookup Relationships:** `promx_loser`, `promx_teama`, `promx_teamb`, `promx_tosswinner`, `promx_winner` -> `promx_crickettournamentteam`; `promx_tournament` -> `promx_crickettournament`.

**Status Values:** `statecode`: Active (0), Inactive (1). `statuscode`: Draft (1), Completed (2), Ready (796280001), Live (796280002), Innings Break (796280003), Super Over Required (796280004), Super Over Live (796280005), Interrupted (796280006), Abandoned (796280007), Cancelled (796280008). Architecture default: Draft. `promx_matchstage`: League (796280000), Quarter Final (796280001), Semi Final (796280002), Final (796280003), Third Place (796280004), Custom (796280005). `promx_resulttype`: Normal Win (796280000), Tie (796280001), No Result (796280002), Abandoned (796280003), Super Over Win (796280004). `promx_tossdecision`: Bat (796280000), Bowl (796280001).

**Notes:** Source-of-truth match setup and result record. The architecture identifies Match Player as a historical roster snapshot; match fields used by completed historical records must remain historically accurate.

### CricketMatchPlayer

**Purpose:** Match-specific player and Playing XI snapshot.

**Dataverse Table Name:** `promx_cricketmatchplayer`

**TypeScript Interface Definition:**

```typescript
interface CricketMatchPlayer extends DataverseRecord<1 | 2> {
  promx_cricketmatchplayerid?: string | null;
  promx_gendersnapshot?: 796280000 | 796280001 | 796280002 | null;
  promx_iscaptain?: boolean | null;
  promx_isplaying?: boolean | null;
  promx_iswicketkeeper?: boolean | null;
  promx_jerseynumbersnapshot?: number | null;
  promx_match: string;
  promx_matchplayername?: string | null;
  promx_playercategorysnapshot?: 796280000 | 796280001 | 796280002 | 796280003 | null;
  promx_playernamesnapshot: string;
  promx_teamsnapshot: string;
  promx_tournamentplayer: string;
}
```

**Required Properties:** `promx_match`, `promx_playernamesnapshot`, `promx_teamsnapshot`, `promx_tournamentplayer`.

**Optional Properties:** `promx_cricketmatchplayerid`, `promx_gendersnapshot`, `promx_iscaptain`, `promx_isplaying`, `promx_iswicketkeeper`, `promx_jerseynumbersnapshot`, `promx_matchplayername`, `promx_playercategorysnapshot`; all inherited `DataverseRecord` properties.

**Lookup Relationships:** `promx_match` -> `promx_cricketmatch`; `promx_tournamentplayer` -> `promx_crickettournamentplayer`.

**Status Values:** `statecode`: Active (0), Inactive (1). `statuscode`: Active (1), Inactive (2). `promx_gendersnapshot`: Male (796280000), Female (796280001), Other (796280002). `promx_playercategorysnapshot`: Batsman (796280000), Bowler (796280001), All Rounder (796280002), Wicket Keeper (796280003).

**Notes:** Source-of-truth historical snapshot model. The architecture specifies that snapshot fields (name, team, gender, jersey number, category, captain, wicketkeeper) become immutable once the match enters Live status. Changes to Tournament Player must not alter this model's historical values.

## Scoring Domain

### CricketInnings

**Purpose:** Match innings identity, team assignments, lifecycle, and stored scoring values.

**Dataverse Table Name:** `promx_cricketinnings`

**TypeScript Interface Definition:**

```typescript
interface CricketInnings extends DataverseRecord<1 | 2 | 796280001 | 796280002 | 796280003> {
  promx_balls?: number | null;
  promx_battingteam: string;
  promx_bowlingteam: string;
  promx_cricketinningsid?: string | null;
  promx_inningsname: string;
  promx_inningsnumber: number;
  promx_inningstype?: 796280000 | 796280001 | null;
  promx_issuperover?: boolean | null;
  promx_match: string;
  promx_overs?: number | null;
  promx_runs?: number | null;
  promx_target?: number | null;
  promx_wickets?: number | null;
}
```

**Required Properties:** `promx_battingteam`, `promx_bowlingteam`, `promx_inningsname`, `promx_inningsnumber`, `promx_match`.

**Optional Properties:** `promx_balls`, `promx_cricketinningsid`, `promx_inningstype`, `promx_issuperover`, `promx_overs`, `promx_runs`, `promx_target`, `promx_wickets`; all inherited `DataverseRecord` properties.

**Lookup Relationships:** `promx_battingteam`, `promx_bowlingteam` -> `promx_crickettournamentteam`; `promx_match` -> `promx_cricketmatch`.

**Status Values:** `statecode`: Active (0), Inactive (1). `statuscode`: Not Started (1), Completed (2), Live (796280001), Retired (796280002), All Out (796280003). `promx_inningstype` options returned: 796280000 and 796280001; the second label was truncated in the live schema response.

**Notes:** Source-of-truth structural record for innings number and team assignments. Innings counters may be persisted for performance and reporting; runs, wickets, balls, and overs remain derived from Ball Events. Innings records must not become an alternate scoring authority. No field-specific immutability beyond preserving completed-match history is specified in the documents.

### CricketOver

**Purpose:** Innings-scoped over sequence and bowler assignment with stored delivery/run/wicket values.

**Dataverse Table Name:** `promx_cricketover`

**TypeScript Interface Definition:**

```typescript
interface CricketOver extends DataverseRecord<1 | 2 | 796280001> {
  promx_bowler?: string | null;
  promx_cricketoverid?: string | null;
  promx_innings: string;
  promx_legaldeliveries?: number | null;
  promx_overname: string;
  promx_overnumber: number;
  promx_runs?: number | null;
  promx_wickets?: number | null;
}
```

**Required Properties:** `promx_innings`, `promx_overname`, `promx_overnumber`.

**Optional Properties:** `promx_bowler`, `promx_cricketoverid`, `promx_legaldeliveries`, `promx_runs`, `promx_wickets`; all inherited `DataverseRecord` properties.

**Lookup Relationships:** `promx_bowler` -> `promx_cricketmatchplayer`; `promx_innings` -> `promx_cricketinnings`.

**Status Values:** `statecode`: Active (0), Inactive (1). `statuscode`: Not Started (1), Completed (2), In Progress (796280001). Architecture names the in-progress status “In Progress.”

**Notes:** Source-of-truth structural record for over number and bowler assignment. Over counters may be persisted for performance and reporting; runs, wickets, and legal deliveries remain derived from Ball Events. Over records must not become an alternate scoring authority. No additional immutable fields are specified in the documents.

### CricketBallEvent

**Purpose:** Ball-by-ball scoring event record and permanent scoring ledger.

**Dataverse Table Name:** `promx_cricketballevent`

**TypeScript Interface Definition:**

```typescript
interface CricketBallEvent extends DataverseRecord<1 | 2 | 796280001 | 796280002> {
  promx_balleventname: string;
  promx_ballnumber: number;
  promx_batterruns?: number | null;
  promx_boundarytype?: 796280000 | 796280001 | null;
  promx_bowler?: string | null;
  promx_correctionreason?: string | null;
  promx_cricketballeventid?: string | null;
  promx_deliverysequencenumber: number;
  promx_dismissaltype?: 796280000 | 796280001 | 796280002 | 796280003 | 796280004 | 796280005 | 796280006 | 796280007 | 796280008 | 796280009 | null;
  promx_dismissalvalid?: boolean | null;
  promx_dismissedplayer?: string | null;
  promx_eventtype?: 796280000 | 796280001 | 796280002 | 796280003 | 796280004 | 796280005 | 796280006 | null;
  promx_extraruns?: number | null;
  promx_innings: string;
  promx_isboundary?: boolean | null;
  promx_isfreehit?: boolean | null;
  promx_islegaldelivery?: boolean | null;
  promx_iswicket?: boolean | null;
  promx_match: string;
  promx_nonstriker?: string | null;
  promx_nonstrikerafterball?: string | null;
  promx_nonstrikerbeforeball?: string | null;
  promx_over: string;
  promx_parentballevent?: string | null;
  promx_striker?: string | null;
  promx_strikerafterball?: string | null;
  promx_strikerbeforeball?: string | null;
  promx_totalruns?: number | null;
}
```

**Required Properties:** `promx_balleventname`, `promx_ballnumber`, `promx_deliverysequencenumber`, `promx_innings`, `promx_match`, `promx_over`.

**Optional Properties:** `promx_batterruns`, `promx_boundarytype`, `promx_bowler`, `promx_correctionreason`, `promx_cricketballeventid`, `promx_dismissaltype`, `promx_dismissalvalid`, `promx_dismissedplayer`, `promx_eventtype`, `promx_extraruns`, `promx_isboundary`, `promx_isfreehit`, `promx_islegaldelivery`, `promx_iswicket`, `promx_nonstriker`, `promx_nonstrikerafterball`, `promx_nonstrikerbeforeball`, `promx_parentballevent`, `promx_striker`, `promx_strikerafterball`, `promx_strikerbeforeball`, `promx_totalruns`; all inherited `DataverseRecord` properties.

**Lookup Relationships:** `promx_bowler`, `promx_dismissedplayer`, `promx_nonstriker`, `promx_nonstrikerafterball`, `promx_nonstrikerbeforeball`, `promx_striker`, `promx_strikerafterball`, `promx_strikerbeforeball` -> `promx_cricketmatchplayer`; `promx_innings` -> `promx_cricketinnings`; `promx_match` -> `promx_cricketmatch`; `promx_over` -> `promx_cricketover`; `promx_parentballevent` -> `promx_cricketballevent` (self-reference).

**Status Values:** `statecode`: Active (0), Inactive (1). `statuscode`: Active (1), Inactive (2), Reversed (796280001), Corrected (796280002). `promx_boundarytype`: Four (796280000), Six (796280001). `promx_dismissaltype`: Bowled (796280000), Caught (796280001), LBW (796280002), Run Out (796280003), Stumped (796280004), Hit Wicket (796280005), Retired Out (796280006), Retired Hurt (796280007), Timed Out (796280008), Obstructing The Field (796280009). `promx_eventtype`: Normal (796280000), Wide (796280001), No Ball (796280002), Bye (796280003), Leg Bye (796280004), Dead Ball (796280005), Penalty (796280006).

**Notes:** Source-of-truth scoring model. Event content and status are immutable historical data. Corrections and reversals are new Ball Events linked to the original with `promx_parentballevent` and `promx_correctionreason`. Reversed and Corrected remain existing Dataverse status-reason values; they are not used to mutate original events.

## Statistics and Live Projections

### CricketMatchState

**Purpose:** Current match/innings state for live scoreboard reads.

**Dataverse Table Name:** `promx_cricketmatchstate`

**TypeScript Interface Definition:**

```typescript
interface CricketMatchState extends DataverseRecord<1 | 2 | 796280001> {
  promx_ballsremaining?: number | null;
  promx_cricketmatchstateid?: string | null;
  promx_currentballs?: number | null;
  promx_currentbowler?: string | null;
  promx_currentnonstriker?: string | null;
  promx_currentovers?: number | null;
  promx_currentrunrate?: number | null;
  promx_currentruns?: number | null;
  promx_currentstriker?: string | null;
  promx_currentwickets?: number | null;
  promx_innings?: string | null;
  promx_match?: string | null;
  promx_matchstatename: string;
  promx_requiredrunrate?: number | null;
  promx_runsrequired?: number | null;
  promx_target?: number | null;
}
```

**Required Properties:** `promx_matchstatename`.

**Optional Properties:** `promx_ballsremaining`, `promx_cricketmatchstateid`, `promx_currentballs`, `promx_currentbowler`, `promx_currentnonstriker`, `promx_currentovers`, `promx_currentrunrate`, `promx_currentruns`, `promx_currentstriker`, `promx_currentwickets`, `promx_innings`, `promx_match`, `promx_requiredrunrate`, `promx_runsrequired`, `promx_target`; all inherited `DataverseRecord` properties.

**Lookup Relationships:** `promx_currentbowler`, `promx_currentnonstriker`, `promx_currentstriker` -> `promx_cricketmatchplayer`; `promx_innings` -> `promx_cricketinnings`; `promx_match` -> `promx_cricketmatch`.

**Status Values:** `statecode`: Active (0), Inactive (1). `statuscode`: Live (1), Completed (2), Innings Break (796280001).

**Notes:** Projection model. Architecture explicitly states Match State is rebuildable from Ball Events and is not a permanent scoring record. Projection values are not the scoring source of truth.

### CricketBatterStatistic

**Purpose:** Batter statistics record.

**Dataverse Table Name:** `promx_cricketbatterstatistic`

**TypeScript Interface Definition:**

```typescript
interface CricketBatterStatistic extends DataverseRecord<1 | 2> {
  promx_ballsfaced?: number | null;
  promx_batterstatisticsname: string;
  promx_cricketbatterstatisticid?: string | null;
  promx_fours?: number | null;
  promx_isdismissed?: boolean | null;
  promx_match?: string | null;
  promx_player?: string | null;
  promx_runs?: number | null;
  promx_sixes?: number | null;
  promx_strikerate?: number | null;
}
```

**Required Properties:** `promx_batterstatisticsname`.

**Optional Properties:** `promx_ballsfaced`, `promx_cricketbatterstatisticid`, `promx_fours`, `promx_isdismissed`, `promx_match`, `promx_player`, `promx_runs`, `promx_sixes`, `promx_strikerate`; all inherited `DataverseRecord` properties.

**Lookup Relationships:** `promx_match` -> `promx_cricketmatch`; `promx_player` -> `promx_cricketmatchplayer`.

**Status Values:** `statecode`: Active (0), Inactive (1). `statuscode`: Active (1), Inactive (2).

**Notes:** Projection model. Architecture explicitly classifies Batter Statistics as rebuildable from Ball Events and non-authoritative.

### CricketBowlerStatistic

**Purpose:** Bowling statistics derived from Ball Events.

**Dataverse Table Name:** `promx_cricketbowlerstatistic`

**TypeScript Interface Definition:**

```typescript
interface CricketBowlerStatistic extends DataverseRecord<1 | 2> {
  promx_bowlerstatisticsname: string;
  promx_cricketbowlerstatisticid?: string | null;
  promx_economy?: number | null;
  promx_maidens?: number | null;
  promx_match?: string | null;
  promx_overs?: number | null;
  promx_player?: string | null;
  promx_runsconceded?: number | null;
  promx_wickets?: number | null;
}
```

**Required Properties:** `promx_bowlerstatisticsname`.

**Optional Properties:** `promx_cricketbowlerstatisticid`, `promx_economy`, `promx_maidens`, `promx_match`, `promx_overs`, `promx_player`, `promx_runsconceded`, `promx_wickets`; all inherited `DataverseRecord` properties.

**Lookup Relationships:** `promx_match` -> `promx_cricketmatch`; `promx_player` -> `promx_cricketmatchplayer`.

**Status Values:** `statecode`: Active (0), Inactive (1). `statuscode`: Active (1), Inactive (2).

**Notes:** Projection model. The live table description says these statistics are derived from Ball Events; the architecture also identifies Bowler Statistics as rebuildable and non-authoritative.

## Rules and Standings

### CricketTournamentRule

**Purpose:** Tournament-specific configurable rule definition and JSON configuration.

**Dataverse Table Name:** `promx_crickettournamentrule`

**TypeScript Interface Definition:**

```typescript
interface CricketTournamentRule extends DataverseRecord<1 | 2> {
  promx_configurationjson: string;
  promx_crickettournamentruleid?: string | null;
  promx_description?: string | null;
  promx_enabled?: boolean | null;
  promx_rulecategory?: 796280000 | 796280001 | 796280002 | 796280003 | 796280004 | null;
  promx_rulecode: string;
  promx_rulename: string;
  promx_tournament: string;
}
```

**Required Properties:** `promx_configurationjson`, `promx_rulecode`, `promx_rulename`, `promx_tournament`.

**Optional Properties:** `promx_crickettournamentruleid`, `promx_description`, `promx_enabled`, `promx_rulecategory`; all inherited `DataverseRecord` properties.

**Lookup Relationships:** `promx_tournament` -> `promx_crickettournament`.

**Status Values:** `statecode`: Active (0), Inactive (1). `statuscode`: Active (1), Inactive (2). `promx_rulecategory`: Batting (796280000), Bowling (796280001), Match (796280002), Tournament (796280003), General (796280004).

**Notes:** Source-of-truth rule configuration. Architecture assigns configurable rule validation to the separate Rule Engine and says rules must not be hardcoded in scoring logic. No rule-field immutability is specified in the supplied documents.

### CricketTournamentStanding

**Purpose:** Tournament standing values.

**Dataverse Table Name:** `promx_crickettournamentstanding`

**TypeScript Interface Definition:**

```typescript
interface CricketTournamentStanding extends DataverseRecord<1 | 2> {
  promx_crickettournamentstandingid?: string | null;
  promx_tournament: string;
  promx_tournamentteam: string;
  promx_matcheslost?: number | null;
  promx_matchesplayed?: number | null;
  promx_matchestied?: number | null;
  promx_matcheswon?: number | null;
  promx_netrunrate?: number | null;
  promx_noresult?: number | null;
  promx_oversbowled?: number | null;
  promx_oversfaced?: number | null;
  promx_points?: number | null;
  promx_runsconceded?: number | null;
  promx_runsscored?: number | null;
  promx_standingname: string;
}
```

**Required Properties:** `promx_standingname`, `promx_tournament`, `promx_tournamentteam`.

**Optional Properties:** `promx_crickettournamentstandingid`, `promx_matcheslost`, `promx_matchesplayed`, `promx_matchestied`, `promx_matcheswon`, `promx_netrunrate`, `promx_noresult`, `promx_oversbowled`, `promx_oversfaced`, `promx_points`, `promx_runsconceded`, `promx_runsscored`; all inherited `DataverseRecord` properties.

**Lookup Relationships:** `promx_tournament` -> `promx_crickettournament` (required); `promx_tournamentteam` -> `promx_crickettournamentteam` (required). Shared platform lookups are in `DataverseRecord`.

**Status Values:** `statecode`: Active (0), Inactive (1). `statuscode`: Active (1), Inactive (2).

**Notes:** Projection model. Architecture explicitly classifies Tournament Standings as rebuildable from completed matches and Ball Events and non-authoritative.

## Model Classification Summary

| Domain model | Dataverse table | Classification | Immutability |
|---|---|---|---|
| `CricketTournament` | `promx_crickettournament` | Source-of-truth setup | Historical settings must remain interpretable; no specific immutable columns identified. |
| `CricketTeam` | `promx_cricketteam` | Source-of-truth master | No specific immutable columns identified; changes must not rewrite historical snapshots. |
| `CricketPlayer` | `promx_cricketplayer` | Source-of-truth master | No specific immutable columns identified; changes must not rewrite historical snapshots. |
| `CricketTournamentTeam` | `promx_crickettournamentteam` | Source-of-truth registration | No specific immutable columns identified. |
| `CricketTournamentPlayer` | `promx_crickettournamentplayer` | Source-of-truth registration | Historical Match Player snapshots must not be changed by registration edits. |
| `CricketMatch` | `promx_cricketmatch` | Source-of-truth match setup/lifecycle/result | Preserve completed-match historical accuracy; no exhaustive immutable column list specified. |
| `CricketMatchPlayer` | `promx_cricketmatchplayer` | Source-of-truth match snapshot | Snapshot fields become immutable when the match enters Live. |
| `CricketInnings` | `promx_cricketinnings` | Source-of-truth structure; scoring derives from events | Innings identity and teams remain historical; scoring values are event-derived. |
| `CricketOver` | `promx_cricketover` | Source-of-truth structure; scoring derives from events | Over identity remains historical; counters are event-derived. |
| `CricketBallEvent` | `promx_cricketballevent` | Source of truth for scoring | Scoring event content is immutable historical data; status values include Active/Reversed/Corrected. |
| `CricketMatchState` | `promx_cricketmatchstate` | Projection | Rebuildable from Ball Events; not a permanent scoring record. |
| `CricketBatterStatistic` | `promx_cricketbatterstatistic` | Projection | Rebuildable from Ball Events; non-authoritative. |
| `CricketBowlerStatistic` | `promx_cricketbowlerstatistic` | Projection | Rebuildable from Ball Events; non-authoritative. |
| `CricketTournamentRule` | `promx_crickettournamentrule` | Source-of-truth configuration | No specific immutable columns identified. |
| `CricketTournamentStanding` | `promx_crickettournamentstanding` | Projection | Rebuildable from completed matches and Ball Events. |

Projection fields that happen to be stored on structural records (`CricketInnings` and `CricketOver`) do not change the scoring authority: `CricketBallEvent` remains authoritative for scoring.
