# Cricket Scoring App - Live Dataverse Schema Reference

This reference records the live Dataverse descriptions for the 15 listed `promx_*` tables. It uses only exposed schema metadata: logical column names, data types, required markers, lookup targets, table descriptions, and choice/status options. It does not use the architecture document to supply missing schema facts. `Required` below means the live description marked the column `NOT NULL`; it does not imply other business validation.
In the per-table dictionaries, `Required: Yes` means the live description marked the column `NOT NULL`. `Required: No` means that marker was absent in the description; for platform-managed columns (including primary IDs), this is not a claim that Dataverse permits the value to be omitted.

## 1. Column-Level Data Dictionary

### Shared columns present on all 15 tables

The following platform columns were present in every table description. They are listed once here to keep the per-table inventory readable. Unless stated otherwise, the live description did not mark these columns required.

| Column | Type | Lookup target / values |
|---|---|---|
| `createdby` | Lookup (GUID) | `systemuser` |
| `createdon` | DateTime | |
| `createdonbehalfby` | Lookup (GUID) | `systemuser` |
| `importsequencenumber` | Integer | |
| `modifiedby` | Lookup (GUID) | `systemuser` |
| `modifiedon` | DateTime | |
| `modifiedonbehalfby` | Lookup (GUID) | `systemuser` |
| `overriddencreatedon` | Date only | |
| `ownerid` | Owner | Dataverse user or team owner |
| `owningbusinessunit` | Lookup (GUID) | `businessunit` |
| `owningteam` | Lookup (GUID) | Dataverse `team` |
| `owninguser` | Lookup (GUID) | `systemuser` |
| `statecode` | State (Integer) | Active (0), Inactive (1) |
| `statuscode` | Status (Integer) | Values listed per table in Section 3 |
| `timezoneruleversionnumber` | Integer | |
| `utcconversiontimezonecode` | Integer | |
| `versionnumber` | BigInt | |

### `promx_crickettournament`
Live description: “This table stores tournament master data for a standalone Cricket Scoring application.”

| Column | Type | Required | Options / lookup target |
|---|---|---:|---|
| `promx_crickettournamentid` | GUID | No | |
| `promx_auctionintegrationenabled` | Boolean | No | |
| `promx_description` | Text area (NVARCHAR(100)) | No | |
| `promx_enddate` | Date only | No | |
| `promx_oversperinnings` | Decimal | Yes | |
| `promx_playersperteam` | Integer | Yes | |
| `promx_pointsforloss` | Integer | No | |
| `promx_pointsfortie` | Integer | No | |
| `promx_pointsforwin` | Integer | No | |
| `promx_startdate` | Date only | No | |
| `promx_tournamentname` | NVARCHAR(850) | Yes | |

### `promx_cricketteam`
Live description: “This table stores master cricket team information for the Cricket Scoring application.”

| Column | Type | Required | Options / lookup target |
|---|---|---:|---|
| `promx_cricketteamid` | GUID | No | |
| `promx_description` | Multiline text | No | |
| `promx_teamcolor` | NVARCHAR(100) | No | |
| `promx_teamlogo` | URL (NVARCHAR(100)) | No | |
| `promx_teamname` | NVARCHAR(850) | Yes | |
| `promx_teamshortname` | NVARCHAR(100) | Yes | |

### `promx_cricketplayer`
Live description: “This table contains records of cricket player details.”

| Column | Type | Required | Options / lookup target |
|---|---|---:|---|
| `promx_active` | Boolean | No | |
| `promx_cricketplayer1` | NVARCHAR(850) | Yes | |
| `promx_cricketplayerid` | GUID | No | |
| `promx_emailaddress` | NVARCHAR(100) | No | |
| `promx_employeeid` | NVARCHAR(100) | No | |
| `promx_gender` | Choice | Yes | Male (796280000), Female (796280001), Other (796280002) |
| `promx_source` | Choice | No | Manual (796280000), Auction (796280001), Import (796280002) |
| `promx_sourcereferenceid` | NVARCHAR(100) | No | |

### `promx_crickettournamentteam`
Live description: “This table contains records of cricket tournament teams.”

| Column | Type | Required | Options / lookup target |
|---|---|---:|---|
| `promx_crickettournamentteamid` | GUID | No | |
| `promx_groupname` | NVARCHAR(100) | No | |
| `promx_seednumber` | Integer | No | |
| `promx_team` | Lookup (GUID) | Yes | `promx_cricketteam` |
| `promx_tournament` | Lookup (GUID) | Yes | `promx_crickettournament` |
| `promx_tournamentteamname` | NVARCHAR(850) | Yes | |

### `promx_crickettournamentplayer`
Live description: “This table contains records of cricket tournament players.”

| Column | Type | Required | Options / lookup target |
|---|---|---:|---|
| `promx_age` | Integer | No | |
| `promx_crickettournamentplayerid` | GUID | No | |
| `promx_iscaptain` | Boolean | No | |
| `promx_isvicecaptain` | Boolean | No | |
| `promx_jerseynumber` | Integer | No | |
| `promx_player` | Lookup (GUID) | Yes | `promx_cricketplayer` |
| `promx_playercategory` | Choice | No | Batsman (796280000), Bowler (796280001), All Rounder (796280002), Wicket Keeper (796280003) |
| `promx_tournament` | Lookup (GUID) | Yes | `promx_crickettournament` |
| `promx_tournamentplayername` | NVARCHAR(850) | Yes | |
| `promx_tournamentteam` | Lookup (GUID) | Yes | `promx_crickettournamentteam` |

### `promx_cricketmatch`
No table description was returned in the live description.

| Column | Type | Required | Options / lookup target |
|---|---|---:|---|
| `promx_cricketmatchid` | GUID | No | |
| `promx_loser` | Lookup (GUID) | No | `promx_crickettournamentteam` |
| `promx_matchname` | NVARCHAR(850) | No | |
| `promx_matchnumber` | Integer | No | |
| `promx_matchstage` | Choice | No | League (796280000), Quarter Final (796280001), Semi Final (796280002), Final (796280003), Third Place (796280004), Custom (796280005) |
| `promx_remarks` | Multiline text | No | |
| `promx_resulttype` | Choice | No | Normal Win (796280000), Tie (796280001), No Result (796280002), Abandoned (796280003), Super Over Win (796280004) |
| `promx_scheduleddatetime` | DateTime | No | |
| `promx_teama` | Lookup (GUID) | Yes | `promx_crickettournamentteam` |
| `promx_teamb` | Lookup (GUID) | Yes | `promx_crickettournamentteam` |
| `promx_tossdecision` | Choice | No | Bat (796280000), Bowl (796280001) |
| `promx_tosswinner` | Lookup (GUID) | No | `promx_crickettournamentteam` |
| `promx_tournament` | Lookup (GUID) | Yes | `promx_crickettournament` |
| `promx_winner` | Lookup (GUID) | No | `promx_crickettournamentteam` |

### `promx_cricketmatchplayer`
No table description was returned in the live description.

| Column | Type | Required | Options / lookup target |
|---|---|---:|---|
| `promx_cricketmatchplayerid` | GUID | No | |
| `promx_gendersnapshot` | Choice | No | Male (796280000), Female (796280001), Other (796280002) |
| `promx_iscaptain` | Boolean | No | |
| `promx_isplaying` | Boolean | No | |
| `promx_iswicketkeeper` | Boolean | No | |
| `promx_jerseynumbersnapshot` | Integer | No | |
| `promx_match` | Lookup (GUID) | Yes | `promx_cricketmatch` |
| `promx_matchplayername` | NVARCHAR(850) | No | |
| `promx_playercategorysnapshot` | Choice | No | Batsman (796280000), Bowler (796280001), All Rounder (796280002), Wicket Keeper (796280003) |
| `promx_playernamesnapshot` | NVARCHAR(3000) | Yes | |
| `promx_teamsnapshot` | NVARCHAR(3000) | Yes | |
| `promx_tournamentplayer` | Lookup (GUID) | Yes | `promx_crickettournamentplayer` |

### `promx_cricketinnings`
Live description: “This table contains records of cricket innings details.”

| Column | Type | Required | Options / lookup target |
|---|---|---:|---|
| `promx_balls` | Integer | No | |
| `promx_battingteam` | Lookup (GUID) | Yes | `promx_crickettournamentteam` |
| `promx_bowlingteam` | Lookup (GUID) | Yes | `promx_crickettournamentteam` |
| `promx_cricketinningsid` | GUID | No | |
| `promx_inningsname` | NVARCHAR(850) | Yes | |
| `promx_inningsnumber` | Integer | Yes | |
| `promx_inningstype` | Choice | No | Regular (796280000); option 796280001 was returned with a truncated label beginning “Super Over” |
| `promx_issuperover` | Boolean | No | |
| `promx_match` | Lookup (GUID) | Yes | `promx_cricketmatch` |
| `promx_overs` | Decimal | No | |
| `promx_runs` | Integer | No | |
| `promx_target` | Integer | No | |
| `promx_wickets` | Integer | No | |

### `promx_cricketover`
Live description: “This table contains records of cricket overs.”

| Column | Type | Required | Options / lookup target |
|---|---|---:|---|
| `promx_bowler` | Lookup (GUID) | No | `promx_cricketmatchplayer` |
| `promx_cricketoverid` | GUID | No | |
| `promx_innings` | Lookup (GUID) | Yes | `promx_cricketinnings` |
| `promx_legaldeliveries` | Integer | No | |
| `promx_overname` | NVARCHAR(850) | Yes | |
| `promx_overnumber` | Integer | Yes | |
| `promx_runs` | Integer | No | |
| `promx_wickets` | Integer | No | |

### `promx_cricketballevent`
Live description: “This table contains records of cricket ball events with details about runs, delivery, and dismissal.”

| Column | Type | Required | Options / lookup target |
|---|---|---:|---|
| `promx_balleventname` | NVARCHAR(850) | Yes | |
| `promx_ballnumber` | Integer | Yes | |
| `promx_batterruns` | Integer | No | |
| `promx_boundarytype` | Choice | No | Four (796280000), Six (796280001) |
| `promx_bowler` | Lookup (GUID) | No | `promx_cricketmatchplayer` |
| `promx_correctionreason` | Multiline text | No | |
| `promx_cricketballeventid` | GUID | No | |
| `promx_deliverysequencenumber` | Integer | Yes | |
| `promx_dismissaltype` | Choice | No | Bowled (796280000), Caught (796280001), LBW (796280002), Run Out (796280003), Stumped (796280004), Hit Wicket (796280005), Retired Out (796280006), Retired Hurt (796280007), Timed Out (796280008), Obstructing The Field (796280009) |
| `promx_dismissalvalid` | Boolean | No | |
| `promx_dismissedplayer` | Lookup (GUID) | No | `promx_cricketmatchplayer` |
| `promx_eventtype` | Choice | No | Normal (796280000), Wide (796280001), No Ball (796280002), Bye (796280003), Leg Bye (796280004), Dead Ball (796280005), Penalty (796280006) |
| `promx_extraruns` | Integer | No | |
| `promx_innings` | Lookup (GUID) | Yes | `promx_cricketinnings` |
| `promx_isboundary` | Boolean | No | |
| `promx_isfreehit` | Boolean | No | |
| `promx_islegaldelivery` | Boolean | No | |
| `promx_iswicket` | Boolean | No | |
| `promx_match` | Lookup (GUID) | Yes | `promx_cricketmatch` |
| `promx_nonstriker` | Lookup (GUID) | No | `promx_cricketmatchplayer` |
| `promx_nonstrikerafterball` | Lookup (GUID) | No | `promx_cricketmatchplayer` |
| `promx_nonstrikerbeforeball` | Lookup (GUID) | No | `promx_cricketmatchplayer` |
| `promx_over` | Lookup (GUID) | Yes | `promx_cricketover` |
| `promx_parentballevent` | Lookup (GUID) | No | `promx_cricketballevent` |
| `promx_striker` | Lookup (GUID) | No | `promx_cricketmatchplayer` |
| `promx_strikerafterball` | Lookup (GUID) | No | `promx_cricketmatchplayer` |
| `promx_strikerbeforeball` | Lookup (GUID) | No | `promx_cricketmatchplayer` |
| `promx_totalruns` | Integer | No | |

### `promx_cricketmatchstate`
Live description: “This table stores the current live scoring state of an innings for fast scoreboard and live match display.”

| Column | Type | Required | Options / lookup target |
|---|---|---:|---|
| `promx_ballsremaining` | Integer | No | |
| `promx_cricketmatchstateid` | GUID | No | |
| `promx_currentballs` | Integer | No | |
| `promx_currentbowler` | Lookup (GUID) | No | `promx_cricketmatchplayer` |
| `promx_currentnonstriker` | Lookup (GUID) | No | `promx_cricketmatchplayer` |
| `promx_currentovers` | Decimal | No | |
| `promx_currentrunrate` | Decimal | No | |
| `promx_currentruns` | Integer | No | |
| `promx_currentstriker` | Lookup (GUID) | No | `promx_cricketmatchplayer` |
| `promx_currentwickets` | Integer | No | |
| `promx_innings` | Lookup (GUID) | No | `promx_cricketinnings` |
| `promx_match` | Lookup (GUID) | No | `promx_cricketmatch` |
| `promx_matchstatename` | NVARCHAR(850) | Yes | |
| `promx_requiredrunrate` | Decimal | No | |
| `promx_runsrequired` | Integer | No | |
| `promx_target` | Integer | No | |

### `promx_cricketbatterstatistic`
Live description: “This table contains records of cricket batter statistics.”

| Column | Type | Required | Options / lookup target |
|---|---|---:|---|
| `promx_ballsfaced` | Integer | No | |
| `promx_batterstatisticsname` | NVARCHAR(850) | Yes | |
| `promx_cricketbatterstatisticid` | GUID | No | |
| `promx_fours` | Integer | No | |
| `promx_isdismissed` | Boolean | No | |
| `promx_match` | Lookup (GUID) | No | `promx_cricketmatch` |
| `promx_player` | Lookup (GUID) | No | `promx_cricketmatchplayer` |
| `promx_runs` | Integer | No | |
| `promx_sixes` | Integer | No | |
| `promx_strikerate` | Decimal | No | |

### `promx_cricketbowlerstatistic`
Live description: “This table stores bowling statistics derived from ball events in cricket tournaments.”

| Column | Type | Required | Options / lookup target |
|---|---|---:|---|
| `promx_bowlerstatisticsname` | NVARCHAR(850) | Yes | |
| `promx_cricketbowlerstatisticid` | GUID | No | |
| `promx_economy` | Decimal | No | |
| `promx_maidens` | Integer | No | |
| `promx_match` | Lookup (GUID) | No | `promx_cricketmatch` |
| `promx_overs` | Decimal | No | |
| `promx_player` | Lookup (GUID) | No | `promx_cricketmatchplayer` |
| `promx_runsconceded` | Integer | No | |
| `promx_wickets` | Integer | No | |

### `promx_crickettournamentrule`
Live description: “This table contains configurable rule definitions for cricket tournaments.”

| Column | Type | Required | Options / lookup target |
|---|---|---:|---|
| `promx_configurationjson` | Multiline text | Yes | |
| `promx_crickettournamentruleid` | GUID | No | |
| `promx_description` | Multiline text | No | |
| `promx_enabled` | Boolean | No | |
| `promx_rulecategory` | Choice | No | Batting (796280000), Bowling (796280001), Match (796280002), Tournament (796280003), General (796280004) |
| `promx_rulecode` | NVARCHAR(100) | Yes | |
| `promx_rulename` | NVARCHAR(850) | Yes | |
| `promx_tournament` | Lookup (GUID) | Yes | `promx_crickettournament` |

### `promx_crickettournamentstanding`
Live description: “This table contains records of cricket tournament standings.”

| Column | Type | Required | Options / lookup target |
|---|---|---:|---|
| `promx_crickettournamentstandingid` | GUID | No | |
| `promx_matcheslost` | Integer | No | |
| `promx_matchesplayed` | Integer | No | |
| `promx_matchestied` | Integer | No | |
| `promx_matcheswon` | Integer | No | |
| `promx_netrunrate` | Decimal | No | |
| `promx_noresult` | Integer | No | |
| `promx_oversbowled` | Decimal | No | |
| `promx_oversfaced` | Decimal | No | |
| `promx_points` | Integer | No | |
| `promx_runsconceded` | Integer | No | |
| `promx_runsscored` | Integer | No | |
| `promx_standingname` | NVARCHAR(850) | Yes | |

## 2. Complete Relationship Matrix

Relationship type is shown from parent to child (1:N); the child column contains the lookup logical name. Requiredness is the live lookup `NOT NULL` marker. The platform relationship names/cascade behavior were not included in the table descriptions.

| Parent table | Child table | Lookup column | Cardinality / requiredness |
|---|---|---|---|
| `systemuser` | All 15 listed tables | `createdby` | 1:N; optional in returned schema |
| `systemuser` | All 15 listed tables | `createdby` | 1:N; no `NOT NULL` marker in returned schema |
| `systemuser` | All 15 listed tables | `createdonbehalfby` | 1:N; no `NOT NULL` marker in returned schema |
| `systemuser` | All 15 listed tables | `modifiedby` | 1:N; no `NOT NULL` marker in returned schema |
| `systemuser` | All 15 listed tables | `modifiedonbehalfby` | 1:N; no `NOT NULL` marker in returned schema |
| `systemuser` | All 15 listed tables | `owninguser` | 1:N; no `NOT NULL` marker in returned schema |
| `businessunit` | All 15 listed tables | `owningbusinessunit` | 1:N; no `NOT NULL` marker in returned schema |
| Dataverse `team` | All 15 listed tables | `owningteam` | 1:N; no `NOT NULL` marker in returned schema |
| Dataverse user or team | All 15 listed tables | `ownerid` | 1:N polymorphic owner; `OWNER` type |
| `promx_cricketteam` | `promx_crickettournamentteam` | `promx_team` | 1:N; required |
| `promx_crickettournament` | `promx_crickettournamentteam` | `promx_tournament` | 1:N; required |
| `promx_cricketplayer` | `promx_crickettournamentplayer` | `promx_player` | 1:N; required |
| `promx_crickettournament` | `promx_crickettournamentplayer` | `promx_tournament` | 1:N; required |
| `promx_crickettournamentteam` | `promx_crickettournamentplayer` | `promx_tournamentteam` | 1:N; required |
| `promx_crickettournament` | `promx_cricketmatch` | `promx_tournament` | 1:N; required |
| `promx_crickettournamentteam` | `promx_cricketmatch` | `promx_teama`, `promx_teamb` | 1:N per lookup; required |
| `promx_crickettournamentteam` | `promx_cricketmatch` | `promx_tosswinner`, `promx_winner`, `promx_loser` | 1:N per lookup; optional |
| `promx_cricketmatch` | `promx_cricketmatchplayer` | `promx_match` | 1:N; required |
| `promx_crickettournamentplayer` | `promx_cricketmatchplayer` | `promx_tournamentplayer` | 1:N; required |
| `promx_crickettournamentteam` | `promx_cricketinnings` | `promx_battingteam`, `promx_bowlingteam` | 1:N per lookup; required |
| `promx_cricketmatch` | `promx_cricketinnings` | `promx_match` | 1:N; required |
| `promx_cricketinnings` | `promx_cricketover` | `promx_innings` | 1:N; required |
| `promx_cricketmatchplayer` | `promx_cricketover` | `promx_bowler` | 1:N; optional |
| `promx_cricketmatchplayer` | `promx_cricketballevent` | `promx_bowler`, `promx_dismissedplayer`, `promx_nonstriker`, `promx_nonstrikerafterball`, `promx_nonstrikerbeforeball`, `promx_striker`, `promx_strikerafterball`, `promx_strikerbeforeball` | 1:N per lookup; optional |
| `promx_cricketinnings` | `promx_cricketballevent` | `promx_innings` | 1:N; required |
| `promx_cricketmatch` | `promx_cricketballevent` | `promx_match` | 1:N; required |
| `promx_cricketover` | `promx_cricketballevent` | `promx_over` | 1:N; required |
| `promx_cricketballevent` | `promx_cricketballevent` | `promx_parentballevent` | Self-referencing 1:N; optional |
| `promx_cricketmatchplayer` | `promx_cricketmatchstate` | `promx_currentbowler`, `promx_currentnonstriker`, `promx_currentstriker` | 1:N per lookup; optional |
| `promx_cricketinnings` | `promx_cricketmatchstate` | `promx_innings` | 1:N; optional |
| `promx_cricketmatch` | `promx_cricketmatchstate` | `promx_match` | 1:N; optional |
| `promx_cricketmatch` | `promx_cricketbatterstatistic` | `promx_match` | 1:N; optional |
| `promx_cricketmatchplayer` | `promx_cricketbatterstatistic` | `promx_player` | 1:N; optional |
| `promx_cricketmatch` | `promx_cricketbowlerstatistic` | `promx_match` | 1:N; optional |
| `promx_cricketmatchplayer` | `promx_cricketbowlerstatistic` | `promx_player` | 1:N; optional |
| `promx_crickettournament` | `promx_crickettournamentrule` | `promx_tournament` | 1:N; required |

No domain lookup columns were returned for `promx_crickettournament`, `promx_cricketteam`, `promx_cricketplayer`, or `promx_crickettournamentstanding`. This statement is limited to the returned table schemas; it does not assert that no relationship metadata exists elsewhere.

## 3. Status Lifecycle

The live descriptions expose `statecode` and `statuscode` values, but do not expose transition rules, default values, or permitted transition paths. The table below records the available values only; it does not define a lifecycle sequence.

| Table | `statecode` | `statuscode` (Status Reason) |
|---|---|---|
| `promx_crickettournament` | Active (0), Inactive (1) | Active (1), Completed (2), Draft (796280001), Archived (796280002) |
| `promx_cricketteam` | Active (0), Inactive (1) | Active (1), Inactive (2) |
| `promx_cricketplayer` | Active (0), Inactive (1) | Active (1), Inactive (2) |
| `promx_crickettournamentteam` | Active (0), Inactive (1) | Active (1), Inactive (2) |
| `promx_crickettournamentplayer` | Active (0), Inactive (1) | Active (1), Inactive (2) |
| `promx_cricketmatch` | Active (0), Inactive (1) | Draft (1), Completed (2), Ready (796280001), Live (796280002), Innings Break (796280003), Super Over Required (796280004), Super Over Live (796280005), Interrupted (796280006), Abandoned (796280007), Cancelled (796280008) |
| `promx_cricketmatchplayer` | Active (0), Inactive (1) | Active (1), Inactive (2) |
| `promx_cricketinnings` | Active (0), Inactive (1) | Not Started (1), Completed (2), Live (796280001), Retired (796280002), All Out (796280003) |
| `promx_cricketover` | Active (0), Inactive (1) | Not Started (1), Completed (2), In Progress (796280001) |
| `promx_cricketballevent` | Active (0), Inactive (1) | Active (1), Inactive (2), Reversed (796280001), Corrected (796280002) |
| `promx_cricketmatchstate` | Active (0), Inactive (1) | Live (1), Completed (2), Innings Break (796280001) |
| `promx_cricketbatterstatistic` | Active (0), Inactive (1) | Active (1), Inactive (2) |
| `promx_cricketbowlerstatistic` | Active (0), Inactive (1) | Active (1), Inactive (2) |
| `promx_crickettournamentrule` | Active (0), Inactive (1) | Active (1), Inactive (2) |
| `promx_crickettournamentstanding` | Active (0), Inactive (1) | Active (1), Inactive (2) |

## 4. Existing Required Fields

The following are exactly the fields marked `NOT NULL` in the live descriptions. No additional requiredness is inferred.

| Table | Required columns |
|---|---|
| `promx_crickettournament` | `promx_oversperinnings`, `promx_playersperteam`, `promx_tournamentname` |
| `promx_cricketteam` | `promx_teamname`, `promx_teamshortname` |
| `promx_cricketplayer` | `promx_cricketplayer1`, `promx_gender` |
| `promx_crickettournamentteam` | `promx_team`, `promx_tournament`, `promx_tournamentteamname` |
| `promx_crickettournamentplayer` | `promx_player`, `promx_tournament`, `promx_tournamentplayername`, `promx_tournamentteam` |
| `promx_cricketmatch` | `promx_teama`, `promx_teamb`, `promx_tournament` |
| `promx_cricketmatchplayer` | `promx_match`, `promx_playernamesnapshot`, `promx_teamsnapshot`, `promx_tournamentplayer` |
| `promx_cricketinnings` | `promx_battingteam`, `promx_bowlingteam`, `promx_inningsname`, `promx_inningsnumber`, `promx_match` |
| `promx_cricketover` | `promx_innings`, `promx_overname`, `promx_overnumber` |
| `promx_cricketballevent` | `promx_balleventname`, `promx_ballnumber`, `promx_deliverysequencenumber`, `promx_innings`, `promx_match`, `promx_over` |
| `promx_cricketmatchstate` | `promx_matchstatename` |
| `promx_cricketbatterstatistic` | `promx_batterstatisticsname` |
| `promx_cricketbowlerstatistic` | `promx_bowlerstatisticsname` |
| `promx_crickettournamentrule` | `promx_configurationjson`, `promx_rulecode`, `promx_rulename`, `promx_tournament` |
| `promx_crickettournamentstanding` | `promx_standingname` |

## 5. Source-Of-Truth vs Projection Classification

This classification uses only the live table descriptions and exposed column shapes. “Source of truth” and “projection” are not explicit metadata flags. Where the live description/columns do not distinguish record authority from rebuildability, that limitation is stated rather than supplied from another document.

| Table | Classification from live schema | Live-schema basis |
|---|---|---|
| `promx_crickettournament` | Source-of-truth record | Described as tournament master data; contains tournament settings and identity. |
| `promx_cricketteam` | Source-of-truth record | Described as master team information. |
| `promx_cricketplayer` | Source-of-truth record | Described as player details; contains identity and source fields. |
| `promx_crickettournamentteam` | Source-of-truth record | Registration record with Tournament and Team lookups and group/seed fields. |
| `promx_crickettournamentplayer` | Source-of-truth record | Registration record with Player, Tournament, and Tournament Team lookups and roster attributes. |
| `promx_cricketmatch` | Record role not explicitly declared | Match setup/result columns are present; live table description is blank. |
| `promx_cricketmatchplayer` | Snapshot record | Column names include player/team and attribute snapshot fields; the table description is blank. |
| `promx_cricketinnings` | Mixed / not explicitly declared | Contains match/team identity and sequence fields alongside runs, wickets, balls, overs, and target; description only says innings details. |
| `promx_cricketover` | Mixed / not explicitly declared | Contains innings/over sequence and bowler fields alongside delivery/run/wicket counters; description only says cricket overs. |
| `promx_cricketballevent` | Event record; authority not explicitly flagged | Description identifies ball-event records with run, delivery, and dismissal details; no explicit source-of-truth or rebuildability flag was returned. |
| `promx_cricketmatchstate` | Current-state summary; projection status not explicitly flagged | Description says it stores current live scoring state for fast scoreboard/live display. |
| `promx_cricketbatterstatistic` | Statistic record; derivation not explicitly stated | Description says batter statistics; columns contain batter totals and rate. |
| `promx_cricketbowlerstatistic` | Projection/derived statistic | Live description explicitly says bowling statistics are derived from ball events. |
| `promx_crickettournamentrule` | Rule-definition record | Description identifies configurable rule definitions; contains rule code, category, enabled flag, and configuration JSON. |
| `promx_crickettournamentstanding` | Standing summary; projection status not explicitly flagged | Description says tournament standings; columns contain match totals, points, runs, overs, and net run rate. |

The live metadata does not declare write ownership, rebuild procedures, or projection boundaries for records whose classification is marked not explicit above.
