# Cricket Scoring App Dataverse Schema and Architecture Review

Review basis: live Dataverse table descriptions available for this review, compared with `CricketScoringApp_Master_Architecture.md` (Version 1.0, Status: In Progress). This is a metadata/schema review, not a data-quality audit. Dataverse `describe` exposed columns, lookup targets, required flags, and status/choice values, but not alternate-key definitions, relationship cascade behavior, plugins/business rules, or representative records. Those items are called out as unverified rather than treated as absent.

## SECTION 1 - Complete Data Dictionary

### `promx_crickettournament`
- **Purpose:** Tournament master and format/points settings.
- **Business Description:** Scoring App-owned tournament identity and top-level match defaults.
- **Key Columns:** `promx_crickettournamentid` (primary ID); `promx_tournamentname` (required); `promx_startdate`, `promx_enddate`, `promx_oversperinnings` (required), `promx_playersperteam` (required), `promx_pointsforwin`, `promx_pointsfortie`, `promx_pointsforloss`, `promx_auctionintegrationenabled`, `promx_description`.
- **Lookups:** No domain lookups. Standard Dataverse audit and ownership lookups apply (see relationship matrix).
- **Status Reason Values:** Draft (796280001), Active (1), Completed (2), Archived (796280002). Architecture default is Draft.
- **Source Of Truth or Projection:** Source of truth for tournament master/settings.
- **Notes:** Tournament status values agree with the architecture. Ensure dates are ordered; validate positive overs/player count. `promx_oversperinnings` is decimal despite the cricket overs notation needing a defined representation.

### `promx_cricketteam`
- **Purpose:** Reusable team master.
- **Business Description:** Physical/team identity, independent of a tournament.
- **Key Columns:** `promx_cricketteamid`; `promx_teamname` (required), `promx_teamshortname` (required), `promx_teamcolor`, `promx_teamlogo`, `promx_description`.
- **Lookups:** No domain lookups.
- **Status Reason Values:** Active (1), Inactive (2).
- **Source Of Truth or Projection:** Source of truth for the current team master only; tournament/match history must use registration and match snapshots.
- **Notes:** No unique-key metadata was returned. Define name/short-name uniqueness scope; avoid changing master data to rewrite historical displays.

### `promx_cricketplayer`
- **Purpose:** Reusable player master.
- **Business Description:** Player identity and contact/import metadata shared across tournaments.
- **Key Columns:** `promx_cricketplayerid`; `promx_cricketplayer1` (required; display/name field), `promx_gender` (required), `promx_active`, `promx_emailaddress`, `promx_employeeid`, `promx_source`, `promx_sourcereferenceid`.
- **Lookups:** No domain lookups.
- **Status Reason Values:** Active (1), Inactive (2). `promx_active` duplicates the meaning of OOB state/status and needs a single authoritative rule.
- **Source Of Truth or Projection:** Source of truth for current player master identity, not for a tournament roster or historical match identity.
- **Notes:** Imported-source reference uniqueness is a candidate key. Do not derive past rosters or scorecards from mutable master fields.

### `promx_crickettournamentteam`
- **Purpose:** Registers a reusable team in a tournament.
- **Business Description:** Tournament-specific team membership, group, and seed assignment.
- **Key Columns:** `promx_crickettournamentteamid`; `promx_tournamentteamname` (required), `promx_groupname`, `promx_seednumber`.
- **Lookups:** `promx_tournament` -> Tournament (required); `promx_team` -> Team (required).
- **Status Reason Values:** Active (1), Inactive (2).
- **Source Of Truth or Projection:** Source of truth for tournament team membership.
- **Notes:** Enforce one active registration per Tournament+Team. Team master renames must not silently change completed-match history.

### `promx_crickettournamentplayer`
- **Purpose:** Registers a player to a tournament and its tournament team.
- **Business Description:** Tournament-scoped player assignment and playing role details.
- **Key Columns:** `promx_crickettournamentplayerid`; `promx_tournamentplayername` (required), `promx_age`, `promx_jerseynumber`, `promx_iscaptain`, `promx_isvicecaptain`, `promx_playercategory`.
- **Lookups:** `promx_tournament` -> Tournament (required); `promx_player` -> Player (required); `promx_tournamentteam` -> Tournament Team (required).
- **Status Reason Values:** Active (1), Inactive (2).
- **Source Of Truth or Projection:** Source of truth for tournament roster assignment and tournament-specific attributes.
- **Notes:** The direct Tournament and Tournament Team lookups are redundant by design but must refer to the same tournament. Historical match records must not follow later roster edits.

### `promx_cricketmatch`
- **Purpose:** Match setup, scheduling, toss, result, and lifecycle.
- **Business Description:** Tournament match using registered Tournament Team records.
- **Key Columns:** `promx_cricketmatchid`; `promx_matchname`, `promx_matchnumber`, `promx_matchstage`, `promx_scheduleddatetime`, `promx_tossdecision`, `promx_resulttype`, `promx_remarks`.
- **Lookups:** `promx_tournament` -> Tournament (required); `promx_teama`, `promx_teamb` -> Tournament Team (both required); `promx_tosswinner`, `promx_winner`, `promx_loser` -> Tournament Team (optional).
- **Status Reason Values:** Draft (1), Ready (796280001), Live (796280002), Innings Break (796280003), Completed (2), Super Over Required (796280004), Super Over Live (796280005), Interrupted (796280006), Abandoned (796280007), Cancelled (796280008). The architecture lists this same set; default is Draft.
- **Source Of Truth or Projection:** Source of truth for match identity, setup, lifecycle, toss and finalized outcome. Score totals should remain projections of Ball Events.
- **Notes:** There are no schema-level guarantees that A and B differ or that all team lookups belong to `promx_tournament`. `winner`, `loser`, and toss winner must be constrained to A/B. Result fields need lifecycle-dependent rules.

### `promx_cricketmatchplayer`
- **Purpose:** Match-specific player/Playing XI snapshot.
- **Business Description:** Preserves the roster identity and selected-player attributes at match time.
- **Key Columns:** `promx_cricketmatchplayerid`; `promx_playernamesnapshot` (required), `promx_teamsnapshot` (required), `promx_matchplayername`, `promx_gendersnapshot`, `promx_jerseynumbersnapshot`, `promx_playercategorysnapshot`, `promx_iscaptain`, `promx_iswicketkeeper`, `promx_isplaying`.
- **Lookups:** `promx_match` -> Match (required); `promx_tournamentplayer` -> Tournament Player (required).
- **Status Reason Values:** Active (1), Inactive (2).
- **Source Of Truth or Projection:** Source of truth for the match roster snapshot and selection; not a score projection.
- **Notes:** Architecture snapshot intent is mostly represented. No direct team-registration lookup exists; team is a text snapshot. Snapshot values must be copied and locked at Live, independent of later Tournament Player edits. Enforce uniqueness per Match+Tournament Player and cap selected XI by format/rules.

### `promx_cricketinnings`
- **Purpose:** Innings identity, teams, lifecycle, and summary counters.
- **Business Description:** Groups overs/events into regular or Super Over innings.
- **Key Columns:** `promx_cricketinningsid`; `promx_inningsname` (required), `promx_inningsnumber` (required), `promx_inningstype`, `promx_issuperover`, `promx_overs`, `promx_balls`, `promx_runs`, `promx_wickets`, `promx_target`.
- **Lookups:** `promx_match` -> Match (required); `promx_battingteam`, `promx_bowlingteam` -> Tournament Team (required).
- **Status Reason Values:** Not Started (1), Completed (2), Live (796280001), Retired (796280002), All Out (796280003).
- **Source Of Truth or Projection:** Innings identity and team assignment are authoritative setup; counters/score totals are projections from Ball Events.
- **Notes:** No uniqueness on Match+Innings Number is confirmed. Validate teams belong to the match tournament and are distinct; validate regular/Super Over sequencing and targets.

### `promx_cricketover`
- **Purpose:** Groups deliveries into an over and carries over-level summary/assignment.
- **Business Description:** Innings-scoped ordered over with optional bowler.
- **Key Columns:** `promx_cricketoverid`; `promx_overname` (required), `promx_overnumber` (required), `promx_legaldeliveries`, `promx_runs`, `promx_wickets`.
- **Lookups:** `promx_innings` -> Innings (required); `promx_bowler` -> Match Player (optional).
- **Status Reason Values:** Not Started (1), Completed (2), In Progress (796280001).
- **Source Of Truth or Projection:** Over identity/sequence and bowler assignment are authoritative; counters/status are derived from Ball Events.
- **Notes:** Enforce unique Innings+Over Number; validate the bowler belongs to the same match and is on the bowling side.

### `promx_cricketballevent`
- **Purpose:** Permanent scoring event ledger.
- **Business Description:** Records each delivery/scoring action, participants, runs, extras, dismissal, and correction/reversal linkage.
- **Key Columns:** `promx_cricketballeventid`; `promx_balleventname` (required), `promx_ballnumber` (required), `promx_deliverysequencenumber` (required), `promx_eventtype`, `promx_batterruns`, `promx_extraruns`, `promx_totalruns`, `promx_islegaldelivery`, `promx_isboundary`, `promx_boundarytype`, `promx_isfreehit`, `promx_iswicket`, `promx_dismissaltype`, `promx_dismissalvalid`, `promx_correctionreason`.
- **Lookups:** `promx_match` -> Match (required); `promx_innings` -> Innings (required); `promx_over` -> Over (required); `promx_striker`, `promx_nonstriker`, `promx_bowler`, `promx_dismissedplayer`, `promx_strikerbeforeball`, `promx_strikerafterball`, `promx_nonstrikerbeforeball`, `promx_nonstrikerafterball` -> Match Player (optional); `promx_parentballevent` -> Ball Event (optional, self-reference).
- **Status Reason Values:** Active (1), Inactive (2), Reversed (796280001), Corrected (796280002). Architecture names these Active, Reversed, Corrected; actual metadata also includes Inactive.
- **Source Of Truth or Projection:** Source of truth for all scoring actions, as specified by the architecture.
- **Notes:** This table is high volume and critical. Its denormalized Match, Innings, and Over links must agree. Core event facts must not be overwritten; status mutation for reversal/correction is a documented auditability risk. Validate run arithmetic and dismissal semantics in a rules/scoring service.

### `promx_cricketmatchstate`
- **Purpose:** Current live scoreboard state for fast reads.
- **Business Description:** Rebuildable per-match/innings view of current score, players, target, and rates.
- **Key Columns:** `promx_cricketmatchstateid`; `promx_matchstatename` (required), `promx_currentruns`, `promx_currentwickets`, `promx_currentballs`, `promx_currentovers`, `promx_ballsremaining`, `promx_currentrunrate`, `promx_requiredrunrate`, `promx_runsrequired`, `promx_target`.
- **Lookups:** `promx_match` -> Match (optional); `promx_innings` -> Innings (optional); `promx_currentstriker`, `promx_currentnonstriker`, `promx_currentbowler` -> Match Player (optional).
- **Status Reason Values:** Live (1), Completed (2), Innings Break (796280001).
- **Source Of Truth or Projection:** Projection; rebuildable from Ball Events and match/rule setup.
- **Notes:** Both parent lookups are nullable and there is no exposed natural key. Define exactly one row per Match+Innings (or explicit match-only state for breaks) and deterministic refresh/idempotency behavior.

### `promx_cricketbatterstatistic`
- **Purpose:** Per-match batter summary.
- **Business Description:** Derived runs, balls, boundaries, dismissal flag and strike rate.
- **Key Columns:** `promx_cricketbatterstatisticid`; `promx_batterstatisticsname` (required), `promx_runs`, `promx_ballsfaced`, `promx_fours`, `promx_sixes`, `promx_strikerate`, `promx_isdismissed`.
- **Lookups:** `promx_match` -> Match (optional); `promx_player` -> Match Player (optional).
- **Status Reason Values:** Active (1), Inactive (2).
- **Source Of Truth or Projection:** Projection from Ball Events.
- **Notes:** Parent lookups are nullable; define uniqueness at Match+Innings+Match Player if split by innings, otherwise document match aggregate grain. Current schema has no innings lookup.

### `promx_cricketbowlerstatistic`
- **Purpose:** Per-match bowler summary.
- **Business Description:** Derived overs, runs conceded, wickets, maidens and economy.
- **Key Columns:** `promx_cricketbowlerstatisticid`; `promx_bowlerstatisticsname` (required), `promx_overs`, `promx_runsconceded`, `promx_wickets`, `promx_maidens`, `promx_economy`.
- **Lookups:** `promx_match` -> Match (optional); `promx_player` -> Match Player (optional).
- **Status Reason Values:** Active (1), Inactive (2).
- **Source Of Truth or Projection:** Projection from Ball Events.
- **Notes:** Same grain ambiguity as batter stats: no innings lookup. Define uniqueness and bowling-credit rules, particularly for dismissals that do not credit the bowler.

### `promx_crickettournamentrule`
- **Purpose:** Configurable tournament rule definitions.
- **Business Description:** Tournament-specific rule code/category and configuration consumed by the separate Rule Engine.
- **Key Columns:** `promx_crickettournamentruleid`; `promx_tournament` (required), `promx_rulecode` (required), `promx_rulename` (required), `promx_configurationjson` (required), `promx_rulecategory`, `promx_enabled`, `promx_description`.
- **Lookups:** `promx_tournament` -> Tournament (required).
- **Status Reason Values:** Active (1), Inactive (2).
- **Source Of Truth or Projection:** Source of truth for configurable rule definitions.
- **Notes:** Enforce Tournament+Rule Code uniqueness and validate JSON against a rule-code-specific schema. No version/effective-date or match-to-rule snapshot is visible; mutating a rule risks changing historical interpretation.

### `promx_crickettournamentstanding`
- **Purpose:** Tournament points-table summary.
- **Business Description:** Rebuildable team standings from completed match results and rules.
- **Key Columns:** `promx_crickettournamentstandingid`; `promx_standingname` (required), `promx_matchesplayed`, `promx_matcheswon`, `promx_matcheslost`, `promx_matchestied`, `promx_noresult`, `promx_points`, `promx_runsscored`, `promx_runsconceded`, `promx_oversfaced`, `promx_oversbowled`, `promx_netrunrate`.
- **Lookups:** No domain lookups are present in live schema. Standard ownership/audit lookups only.
- **Status Reason Values:** Active (1), Inactive (2).
- **Source Of Truth or Projection:** Projection, as required by the architecture.
- **Notes:** Critical schema gap: no Tournament or Tournament Team lookup, so row ownership, partitioning, rebuild, and team identity cannot be reliably expressed. Add these lookups to this existing table; no new table is required.

**Status convention:** The values above are the live `statuscode` labels and numeric values. Dataverse `statecode` is Active (0)/Inactive (1) on these tables. Platform audit/ownership lookups apply to every table: Created By/On Behalf By and Modified By/On Behalf By -> `systemuser`; Owner -> User or Team; Owning Business Unit -> `businessunit`; Owning Team -> `team`; Owning User -> `systemuser`. These are infrastructure relationships rather than cricket-domain relationships.

## SECTION 2 - Relationship Matrix

Relationship type is many-to-one from child to parent (equivalently one-to-many parent-to-child). Lookup requiredness is shown; optional lookups still define relationships.

| Parent Table | Child Table | Relationship Type | Business Purpose |
|---|---|---|---|
| `promx_crickettournament` | `promx_crickettournamentteam` | 1:N, required lookup | Scope a team registration to a tournament. |
| `promx_cricketteam` | `promx_crickettournamentteam` | 1:N, required lookup | Reuse a team across tournaments. |
| `promx_cricketplayer` | `promx_crickettournamentplayer` | 1:N, required lookup | Reuse player identity across tournament registrations. |
| `promx_crickettournament` | `promx_crickettournamentplayer` | 1:N, required lookup | Scope player registration and role data to tournament. |
| `promx_crickettournamentteam` | `promx_crickettournamentplayer` | 1:N, required lookup | Assign tournament player to registered tournament team. |
| `promx_crickettournament` | `promx_cricketmatch` | 1:N, required lookup | Own and partition matches by tournament. |
| `promx_crickettournamentteam` | `promx_cricketmatch` (`promx_teama`, `promx_teamb`, `promx_tosswinner`, `promx_winner`, `promx_loser`) | 1:N, two required and three optional lookups | Identify match sides, toss, and outcome. Each lookup must target one of the match's teams where applicable. |
| `promx_cricketmatch` | `promx_cricketmatchplayer` | 1:N, required lookup | Scope Playing XI snapshot to match. |
| `promx_crickettournamentplayer` | `promx_cricketmatchplayer` | 1:N, required lookup | Trace match snapshot to tournament roster source without using it as mutable history. |
| `promx_cricketmatch` | `promx_cricketinnings` | 1:N, required lookup | Group innings under match. |
| `promx_crickettournamentteam` | `promx_cricketinnings` (`promx_battingteam`, `promx_bowlingteam`) | 1:N, required lookups | Identify innings sides. |
| `promx_cricketinnings` | `promx_cricketover` | 1:N, required lookup | Group ordered overs under innings. |
| `promx_cricketmatchplayer` | `promx_cricketover` (`promx_bowler`) | 1:N, optional lookup | Attribute over bowling assignment. |
| `promx_cricketmatch` | `promx_cricketballevent` | 1:N, required lookup | Match partition for ledger events. |
| `promx_cricketinnings` | `promx_cricketballevent` | 1:N, required lookup | Innings ordering and score attribution. |
| `promx_cricketover` | `promx_cricketballevent` | 1:N, required lookup | Over/delivery ordering. |
| `promx_cricketmatchplayer` | `promx_cricketballevent` (`promx_striker`, `promx_nonstriker`, `promx_bowler`, `promx_dismissedplayer`, striker/nonstriker before/after) | 1:N, optional lookups | Attribute event participants and record player state transitions. |
| `promx_cricketballevent` | `promx_cricketballevent` (`promx_parentballevent`) | Self-referencing 1:N, optional lookup | Link correction/reversal to original event. |
| `promx_cricketmatch` | `promx_cricketmatchstate` | 1:N, optional lookup | Match-scoped live scoreboard projection. |
| `promx_cricketinnings` | `promx_cricketmatchstate` | 1:N, optional lookup | Innings-scoped live scoreboard projection. |
| `promx_cricketmatchplayer` | `promx_cricketmatchstate` (current striker, non-striker, bowler) | 1:N, optional lookups | Current participants in projection. |
| `promx_cricketmatch` | `promx_cricketbatterstatistic` | 1:N, optional lookup | Match aggregation scope. |
| `promx_cricketmatchplayer` | `promx_cricketbatterstatistic` (`promx_player`) | 1:N, optional lookup | Identify batter snapshot in aggregate. |
| `promx_cricketmatch` | `promx_cricketbowlerstatistic` | 1:N, optional lookup | Match aggregation scope. |
| `promx_cricketmatchplayer` | `promx_cricketbowlerstatistic` (`promx_player`) | 1:N, optional lookup | Identify bowler snapshot in aggregate. |
| `promx_crickettournament` | `promx_crickettournamentrule` | 1:N, required lookup | Scope rules to tournament. |
| **Missing:** `promx_crickettournament` | `promx_crickettournamentstanding` | Recommended 1:N | Partition and rebuild standings by tournament. |
| **Missing:** `promx_crickettournamentteam` | `promx_crickettournamentstanding` | Recommended 1:N | Identify the ranked team and enforce one row per tournament/team. |
| `systemuser` | All 15 listed tables (`createdby`, `createdonbehalfby`, `modifiedby`, `modifiedonbehalfby`, `owninguser`) | N:1, platform-managed lookups | Record audit actors and the owning user. |
| `businessunit` | All 15 listed tables (`owningbusinessunit`) | N:1, platform-managed lookup | Record business-unit ownership. |
| Dataverse `team` | All 15 listed tables (`owningteam`) | N:1, platform-managed lookup | Record team ownership. |
| `systemuser` or Dataverse `team` | All 15 listed tables (`ownerid`) | N:1 polymorphic owner lookup | Assign the Dataverse record owner. |

In addition, every table has the standard platform audit and ownership relationships listed in Section 1. These should not be confused with business relationships.

**Other relationship integrity gaps:** Match -> team registrations, Tournament Player -> Tournament Team, Match Player -> Match/Tournament Player, Innings -> Match teams, Over -> Innings bowler, Ball Event -> Match/innings/over/participants, and Match State/Statistics -> their parent records are individually lookup-valid but not guaranteed to be from the same match/tournament. Use server-side validation (and service validation) at write boundaries. No referential cascade configuration was exposed.

## SECTION 3 - Data Ownership Analysis

| Table | Classification | Justification |
|---|---|---|
| `promx_crickettournament` | SOURCE OF TRUTH | Tournament identity and configuration. |
| `promx_cricketteam` | SOURCE OF TRUTH | Reusable current team master; not historical match representation. |
| `promx_cricketplayer` | SOURCE OF TRUTH | Reusable current player master; not historical roster representation. |
| `promx_crickettournamentteam` | SOURCE OF TRUTH | Tournament team registration, group, and seed. |
| `promx_crickettournamentplayer` | SOURCE OF TRUTH | Tournament-specific roster and role assignment. |
| `promx_cricketmatch` | SOURCE OF TRUTH | Match setup, state transitions, toss and finalized result; score totals must not be maintained here. |
| `promx_cricketmatchplayer` | SOURCE OF TRUTH | Match-specific Playing XI/snapshot record preserved from Live onward. |
| `promx_cricketinnings` | SOURCE OF TRUTH | Match/innings/team association is domain setup. Runs, wickets, balls, overs and target progress are projection-owned fields and must be recomputable from events/rules. |
| `promx_cricketover` | SOURCE OF TRUTH | Over sequence and bowler assignment are setup. Delivery counts, runs, wickets and completion are projection-owned fields derived from events. |
| `promx_cricketballevent` | SOURCE OF TRUTH | Permanent scoring ledger per architecture Principle 1. |
| `promx_cricketmatchstate` | PROJECTION | Explicitly rebuildable live scoreboard. |
| `promx_cricketbatterstatistic` | PROJECTION | Derived from Ball Events. |
| `promx_cricketbowlerstatistic` | PROJECTION | Derived from Ball Events. |
| `promx_crickettournamentrule` | SOURCE OF TRUTH | Tournament-specific configuration consumed by separate Rule Engine. |
| `promx_crickettournamentstanding` | PROJECTION | Derived from completed match outcomes, Ball Events, and configured points/rules. |

This hybrid classification for Innings and Over clarifies ownership by field: structural identities and assignments are not scoring totals. Any stored counters remain disposable caches, never alternate scoring truth. It matches the architecture's event-driven principle while preserving necessary setup entities.

## SECTION 4 - Immutability Review

“Match start” means transition to Live. Historical identities/keys and Dataverse created/audit fields are never manually altered. Projection values may be rebuilt, not hand-edited as authoritative corrections.

| Table | Editable before match start | Locked after match start | Locked after completion | Should never be modified |
|---|---|---|---|---|
| Tournament | Name, dates, format defaults, points settings, description, integration setting while Draft | Settings used by any live match | Settings governing completed matches; archive state only by lifecycle policy | Primary ID; settings needed to interpret historical matches without preserving the applied version. |
| Team | Name, short name, color, logo, description, active state | No effect on match snapshots; avoid changes that affect active setup | Avoid history-affecting edits; master may be maintained for future events | Primary ID; do not use master changes to rewrite historic display. |
| Player | Current identity/contact/source metadata | No effect on copied snapshots | Avoid retroactively changing player identity in historical records | Primary ID and source identity; no historical snapshot is to be recalculated from it. |
| Tournament Team | Registration/team, group, seed, status while tournament/matches permit | Once used in a Live match, lock fields that identify historical participants | Lock assignment; future changes should be new registration state where possible | Primary ID and association needed to resolve historical match sides. |
| Tournament Player | Team, jersey, role, captain/vice-captain, age/status before selection/live | Once referenced by a Live Match Player, lock historical source registration or preserve the old values | Do not alter values as if they were match snapshot facts | Primary ID; never rewrite Match Player snapshots from changed registration data. |
| Match | Teams/tournament, schedule, stage, name, number, toss and remarks before Live; lifecycle service manages status/result | Team identities, toss, schedule, and setup used by live innings; only controlled lifecycle transitions/corrections | Final result and identities locked; administrative correction must be audited | Primary ID; no direct match-total fields should be introduced/maintained as scoring truth. |
| Match Player | All snapshot fields and `isplaying` while pre-Live roster selection is open | All snapshot/selection fields at Live; substitutions require explicit auditable policy | Entire match snapshot remains frozen | Player/team/name/category/jersey/gender/captain/wicketkeeper snapshot values; primary ID. |
| Innings | Innings number/type, sides, target, initial status before start | Match/innings identity and sides; score counters only via event projection | Identity/sides frozen; counters only rebuildable | Primary ID and event linkage. Never manually patch score totals. |
| Over | Over number and bowler assignment before delivery starts | Over identity; bowler changes only via scoring workflow; counters/status projection-only | Identity and bowler assignment frozen; counters rebuildable | Primary ID and event linkage. |
| Ball Event | Creation through scoring workflow only; correction reason/parent provided in correction workflow | Existing event facts are append-only; reversal/correction should add linked compensating event, not edit/delete original | Immutable permanently; do not hard-delete | Event identity, delivery sequence, runs/extras, participants, dismissal, before/after state, parent link, original creation/audit. Current status mutation is a known compromise, not strict immutability. |
| Match State | No user editing; projection writer only | Projection writer only | Rebuild/retain per operational policy, but never authoritative | Primary ID; never treat projected score as source truth. |
| Batter Statistic | No user editing; projection writer only | Projection writer only | Projection writer/rebuild only | Primary ID; never use direct edits as scoring corrections. |
| Bowler Statistic | No user editing; projection writer only | Projection writer only | Projection writer/rebuild only | Primary ID; never use direct edits as scoring corrections. |
| Tournament Rule | Edit while not used by any live/completed match | Freeze applied config once match begins; change by adding a new rule definition/config revision, not overwriting history | Keep config used for completed matches resolvable | Rule code/config values for historical versions; primary ID. |
| Tournament Standing | No user editing; projection writer only | Projection writer only | Rebuild from completed results/rules | Primary ID; never make manual points/NRR edits authoritative. |

The schema does not enforce these immutability controls by itself. Apply them through secured write paths/server-side logic and ensure administrators cannot bypass the audit policy unintentionally.

## SECTION 5 - Validation Rules

Required fields below are the required columns reported by live schema metadata. Additional bullets are business validations that must be enforced by the application and, where possible, Dataverse server-side logic. Alternate-key presence is unverified.

| Table | Required Fields | Unique Constraints / Business Validation Rules |
|---|---|---|
| Tournament | `promx_tournamentname`, `promx_oversperinnings`, `promx_playersperteam` | Tournament name unique within agreed scope; start <= end; overs and players > 0; points values nonnegative; Draft -> Active -> Completed/Archived transitions controlled; changes to rules/format freeze when relied upon by live/completed matches. |
| Team | `promx_teamname`, `promx_teamshortname` | Team name and short name unique in agreed scope (or allow duplicate with explicit organization scope); trim/case-normalize before comparison; logo URL valid. |
| Player | `promx_cricketplayer1`, `promx_gender` | Source+source-reference unique when source reference supplied; employee ID unique if business policy says so; valid email; `promx_active` must agree with OOB state/status or be removed from decision logic. |
| Tournament Team | `promx_tournament`, `promx_team`, `promx_tournamentteamname` | Unique Tournament+Team; team registration belongs to stated tournament; seed positive and unique within tournament/group if required; group allowed by format. |
| Tournament Player | `promx_player`, `promx_tournament`, `promx_tournamentteam`, `promx_tournamentplayername` | Unique Tournament+Player unless multiple registrations are explicitly supported; Tournament Team's tournament must equal `promx_tournament`; jersey number unique within team if required; captain and vice-captain cannot be same player and typically at most one active captain/vice-captain per team; age nonnegative; player category valid. |
| Match | `promx_tournament`, `promx_teama`, `promx_teamb` | A != B; both teams belong to Match Tournament; unique tournament+match number when number assigned; toss winner must be A or B and decision required after toss; winner/loser must be A or B and differ for normal win; result type/status/result fields consistent; winner absent for tie/no-result/abandoned as appropriate; status transitions valid; scheduled time/date policy applied. |
| Match Player | `promx_match`, `promx_tournamentplayer`, `promx_playernamesnapshot`, `promx_teamsnapshot` | Unique Match+Tournament Player; Tournament Player tournament equals Match tournament; registered team equals one of Match A/B; snapshots copied from roster at selection; selected count <= format XI; only players on batting/bowling sides participate; no duplicate player across both sides unless explicitly allowed; snapshot fields frozen at Live. |
| Innings | `promx_battingteam`, `promx_bowlingteam`, `promx_inningsname`, `promx_inningsnumber`, `promx_match` | Unique Match+Innings Number; batting != bowling; both are the match's registered teams; regular innings order/number valid; Super Over flag/type consistent; target positive and only present when applicable; counters nonnegative and reconciled to active ledger events. |
| Over | `promx_innings`, `promx_overname`, `promx_overnumber` | Unique Innings+Over Number; over number positive and sequential per innings; bowler belongs to same match and the bowling side; legal deliveries and counters nonnegative and equal event aggregation; completed only under configured legal-ball rules. |
| Ball Event | `promx_balleventname`, `promx_ballnumber`, `promx_deliverysequencenumber`, `promx_innings`, `promx_match`, `promx_over` | Unique Over+Delivery Sequence (sequence includes illegal deliveries); ball/sequence numbering positive and stable; Match=Over.Innings.Match=Event.Innings.Match; participants belong to same match and valid side; runs/extras nonnegative; total runs reconciles to batter+extras; event type determines legal-delivery and extra behavior; boundary type requires boundary; wicket flag and dismissal fields consistent; **dismissal type required only when wicket=yes** (and forbidden/empty otherwise); dismissed player required for applicable wickets; free-hit/dismissal validity follows rules; correction/reversal must reference original event and include reason; original event never deleted/overwritten. |
| Match State | `promx_matchstatename` | Match and innings required except defined match-level state; innings belongs to match; exactly one current state per Match+Innings; player lookups belong to same match; all values deterministic projections and reconciled to event replay; refresh is idempotent. |
| Batter Statistic | `promx_batterstatisticsname` | Match and Match Player should be required for usable stats; player belongs to match; define grain and unique key (Match+Innings+Match Player if per-innings); counts nonnegative; strike rate derived from runs/balls faced with zero-ball handling; boundaries reconcile to events. |
| Bowler Statistic | `promx_bowlerstatisticsname` | Match and Match Player should be required; player belongs to match; define grain and unique key (Match+Innings+Match Player if per-innings); counts nonnegative; overs use legal-ball count representation; economy and wicket credits derive from event/rule replay. |
| Tournament Rule | `promx_configurationjson`, `promx_rulecode`, `promx_rulename`, `promx_tournament` | Unique Tournament+Rule Code; JSON parse/schema validation by rule code; enabled rule compatibility and conflicting rule detection; freeze an applied version for historical matches; do not hardcode rule outcomes in Scoring Engine. |
| Tournament Standing | `promx_standingname` | Add required Tournament and Tournament Team relationships; unique Tournament+Tournament Team; team belongs to tournament; nonnegative W/L/tie/no-result totals and played = wins+losses+ties+no-result as policy defines; points reconcile to rule and outcomes; NRR derived from eligible overs/runs and correctly handles all-outs/abandoned innings. |

## SECTION 6 - Alternate Key Review

The live table descriptions do not return `EntityKeyMetadata`; therefore this section is a recommendation, not confirmation of current key state. Verify key existence, activation status, and duplicate data in Dataverse before relying on upsert or import behavior. Dataverse alternate keys are the appropriate unique constraints for these natural identities; their platform-managed indexes should support the matching lookup filters.

| Table | Recommended alternate key / natural key | Reasoning |
|---|---|---|
| Tournament | Tournament name plus an organization/season discriminator if duplicates are valid | Do not impose name-only uniqueness if the same title can recur. Prefer stable tournament code if one already exists; do not add a new table. |
| Team | Normalized team short name or team name within owning organization | Avoid global uniqueness unless teams are globally unique by business definition. |
| Player | Source + source reference ID; optionally employee ID within employer scope | Makes imports idempotent without relying on mutable name/email. |
| Tournament Team | Tournament + Team | Canonical identity of registration. |
| Tournament Player | Tournament + Player | Prevents duplicate roster registration unless transfer/multiple membership policy explicitly requires otherwise. |
| Match | Tournament + Match Number | Stable tournament-scoped fixture identity; assign number before key activation/use. |
| Match Player | Match + Tournament Player | One snapshot per registered player per match. |
| Innings | Match + Innings Number | Prevents duplicate innings sequence. |
| Over | Innings + Over Number | Prevents duplicate over sequence. |
| Ball Event | Over + Delivery Sequence Number | Stable unique event order including wides/no-balls; never key solely on legal ball number. |
| Match State | Match + Innings | Exactly one state row per innings; define null/match-level break behavior because nullable key components can complicate alternate keys. |
| Batter Statistic | Match + Innings + Match Player, if per-innings | Current schema lacks Innings; if stats are whole-match totals, use Match+Match Player and document that grain instead. |
| Bowler Statistic | Match + Innings + Match Player, if per-innings | Same grain decision as batter statistics. |
| Tournament Rule | Tournament + Rule Code (+ version if versioned) | Deterministic lookup and safe config revisions. |
| Tournament Standing | Tournament + Tournament Team | Requires the two missing lookups first; enforces one row per team per tournament. |

Primary GUID IDs remain the Dataverse record identity. Do not create duplicate tables or add redundant keys that conflict with valid business cases. For teams/players, choose organization scope before enabling uniqueness. For correction events, use event identity/sequence plus parent linkage; do not reuse a sequence to overwrite the original.

## SECTION 7 - Performance Review

- **Frequently queried lookups:** Tournament -> matches/registrations/rules/standings; Tournament Team -> matches/roster/innings; Match -> Match Players/innings/events/state/statistics; Innings -> overs/events/state/statistics; Over -> ordered Ball Events; Match Player -> batter/bowler/event participation; Tournament+Team for standings. Query only required columns, page large event sets, and filter on parent lookups and status/date.
- **Candidate key-backed indexes:** Tournament+Team, Tournament+Player, Tournament+Match Number, Match+Tournament Player, Match+Innings Number, Innings+Over Number, Over+Delivery Sequence, Match+Innings for Match State, Match(+Innings)+Match Player for statistics, Tournament+Rule Code, Tournament+Tournament Team for standings. Dataverse manages physical indexes; validate platform key/index capabilities and activation cost rather than assuming arbitrary SQL indexes can be added.
- **Large-volume table:** Ball Event will dominate row count. Keep the event payload narrow, avoid repeated broad retrievals, use ordered parent-scoped paging by Over+Delivery Sequence, and consider retention/archival only if it preserves permanent auditability and replay access. Avoid expensive synchronous recalculation of full match history for every event.
- **Match State:** one row per active innings with a stable alternate key; update/upsert atomically or through an idempotent projection process. Do not make live clients enumerate/replay all events on each screen refresh. Rebuild must be repeatable and recover from event/projection failure.
- **Statistics:** define per-innings versus per-match grain before coding. Use unique keys and scoped incremental recompute where safe, with full rebuild as reconciliation. Never allow clients to write aggregate figures directly.
- **Standings:** missing parent lookups currently prevent efficient tournament/team scoping. Add both lookups, key the row by Tournament+Tournament Team, and refresh only affected tournament rows after a finalized result; scheduled full recompute remains a recovery path.
- **Projection refresh:** Ball Event commit is authoritative; projection refresh must be idempotent, replayable, and observable. Define event ordering, retry behavior, duplicate protection, and a projection version/checkpoint strategy using existing fields/services where possible. A stale projection must be detectable and never overwrite the ledger.

## SECTION 8 - Architecture Compliance Review

| Principle / strategy | Assessment | Evidence and risk |
|---|---|---|
| Ball Event Source Of Truth | **Aligned structurally; controls unverified** | Dedicated ledger table links to match/innings/over and participant snapshots. Event fields include sequencing, scoring, dismissal, before/after participants, correction reason and parent event. Schema does not itself prevent direct edits or direct summary writes; no server rules/security were inspected. |
| Match State Projection Strategy | **Aligned in intent; key gap** | Table description explicitly says current live state and rebuildability is documented. Match/innings lookups are nullable and there is no visible uniqueness key, so duplicate or orphan projection rows are possible. |
| Rule Engine Design | **Partially aligned** | Tournament Rule table stores category, code, enabled flag and JSON, matching configurable rules. No visible JSON schema/version, match-applied rule snapshot, effective interval, or link from Match to applied rule set. Historical replay may use changed rules. |
| Playing XI Snapshot Strategy | **Mostly aligned** | Match Player stores required player/team text snapshots and gender, jersey, category, captain, wicketkeeper and selection flags. Must confirm snapshot population/locking and validate tournament/team membership. No direct Tournament Team lookup on Match Player; team is text only. |
| Historical Auditability | **Partially aligned / risk** | Parent Ball Event and correction reason support linkage, but `statuscode` includes Reversed/Corrected and architecture itself notes status mutation may be replaced by append-only compensating events. Deletion/edit permissions, audit retention, and immutable-write enforcement are unverified. |
| Projection boundaries | **Mostly aligned** | Match State and both statistics plus standings are documented projections. Innings/Over mix structural records with projected counters and must not become alternate scoring authorities. Standings lacks its necessary parent links. |
| Historical data ownership | **Aligned in model intent** | Tournament registrations and Match Player snapshots decouple reusable master records from historical matches. Complete rule/roster snapshots are not guaranteed by current schema alone. |

No evidence in this review indicates that the application currently bypasses Ball Events; schema metadata alone cannot prove write-path behavior. The highest compliance risks are mutable rule interpretation, mutable/reversible ledger rows, un-enforced snapshot immutability, and nullable/unkeyed projections.

## SECTION 9 - Missing Schema Recommendations

No new table is recommended at this stage. The following can be addressed using the existing tables and their services/keys.

### High Priority Gaps
- Add Tournament and Tournament Team lookups to `promx_crickettournamentstanding`; make them required and unique together. Without them standings are not properly attributable or efficiently rebuildable.
- Add/activate natural alternate keys for roster, fixture, innings, over, delivery, state, rule, and projection grains listed in Section 6 after resolving duplicates. Keys prevent duplicate writes and enable idempotent upsert.
- Enforce cross-lookup scope consistency at server-side write boundaries: tournament/team, match/roster, innings/match/team, over/innings/player, event/match/innings/over/player. Ordinary lookups do not enforce these multi-hop rules.
- Establish an append-only correction/reversal policy for Ball Event. Preserve originals; use linked compensating/correction events with mandatory reason and deterministic active-event semantics. Current status mutation undermines strict immutable history.
- Define and enforce Match Player snapshot creation and lock at Live; validate its tournament/team and XI membership. The schema contains snapshot attributes but no intrinsic freeze rule.
- Define Match State uniqueness/grain and require appropriate parent lookups. Nullable Match and Innings currently permit orphan/ambiguous state.

### Medium Priority Gaps
- Freeze/version Tournament Rule configuration used by each match. Prefer an immutable rule revision represented through existing rule rows and a stable association/manifest in match setup or an equivalent existing field/service; avoid overwriting a version already used historically.
- Resolve innings grain for Batter/Bowler Statistics; the current tables have Match Player and Match but no Innings lookup. Add an Innings lookup only if per-innings scorecards are required; otherwise document match-total grain and key accordingly.
- Clarify which Innings/Over fields are authoritative setup versus derived counters. Ensure counters/statuses are projection-only and fully replayable.
- Resolve duplicate player-active representation (`promx_active` and OOB state/status) and choose one canonical lifecycle rule.
- Define reliable event delivery sequence and correction model; `promx_ballnumber` versus `promx_deliverysequencenumber` semantics need to be explicit, especially for illegal deliveries.
- Define Tournament and Match ruleset/format snapshot behavior so tournament edits cannot change historical scorecards or replay outputs.

### Low Priority Gaps
- Add/standardize descriptions for columns and document choice values/rule JSON shapes, especially result types, dismissal credit, and overs representation.
- Define uniqueness and scope rules for Team/Player master names, tournament names, team short names, and employee/source identifiers.
- Define normalized decimal/ball notation policies for overs and net run rate to avoid ambiguity and floating-point rounding drift.
- Clarify retention/audit policy and operational monitoring for projection lag, failed rebuilds, and event corrections.

## SECTION 10 - Executive Summary

### Scores
- **Architecture Score: 7/10.** The event-ledger and projection boundaries are clearly documented and substantially represented in existing tables. Historical rule snapshots, correction immutability, and enforcement mechanisms remain unresolved.
- **Schema Score: 5/10.** Core entities and many expected lookup paths exist, but standings are unlinked, several projection parents are optional, alternate keys are unverified, and cross-parent constraints are not intrinsic to lookups.
- **Risk Score: 7/10 (High; higher means more risk).** A duplicate/orphan projection or cross-tournament reference is plausible without keys/validation; mutable rules or ledger corrections can compromise replay and historical auditability.

### Top 10 Findings
1. Tournament Standing has no Tournament or Tournament Team lookup.
2. Alternate-key definitions and activation state could not be inspected; duplicate prevention/idempotent upsert is unconfirmed.
3. Match State Match and Innings lookups are optional, and no unique state grain is visible.
4. Cross-tournament/team consistency is not enforced by simple lookup relationships across Match, Tournament Player, Match Player, Innings, Over and Ball Event.
5. Ball Event status supports Reversed/Corrected mutations, which conflicts with strict append-only ledger semantics unless originals remain untouched and compensating events are used.
6. Tournament Rule has no visible version/effective snapshot association to a match; changing JSON can alter historical interpretation.
7. Match Player snapshot fields exist, but write-time capture and lock-after-Live behavior are not schema-enforced; team snapshot is text rather than a registration lookup.
8. Batter/Bowler statistics have nullable parents and no Innings lookup, leaving grain/uniqueness unclear.
9. Innings and Over store both event-derived counters and structural records; ownership of each field must be explicit to prevent direct scoring writes.
10. Player master has both `promx_active` and OOB status, creating conflicting active/inactive signals.

### Recommended Changes Before Coding Starts
1. Add the two missing Standing lookups and decide their requiredness/key.
2. Confirm/activate alternate keys and resolve existing duplicates before development depends on upsert.
3. Approve a data-integrity contract for cross-parent lookup validation and enforce it in authoritative write services/server-side logic.
4. Specify append-only Ball Event correction/reversal behavior and permissions; confirm replay excludes/reinterprets corrections deterministically.
5. Specify Match State/statistics grain, required parent fields, keys, projection writer ownership, and rebuild/idempotency behavior.
6. Freeze/version the rule set used by a match and lock Match Player snapshots at Live.
7. Reconcile redundant player active status and document overs/delivery sequence semantics.

**Ready For Development: NO.** The overall architecture is a sound base and no redesign is required, but coding against the current schema without first closing the standings relationship, uniqueness/idempotency, cross-parent validation, projection grain, rule-history, and immutability decisions risks corrupt or non-reproducible match history. Proceed after these decisions are documented and the required existing-table metadata/keys are verified.
