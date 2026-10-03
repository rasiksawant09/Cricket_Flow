# Cricket Scoring App Repository Contracts

These contracts define repository boundaries for future implementation. The Master Architecture is authoritative; the Implementation Guide defines application layering; Domain Models define persisted model shapes; Repository Design and Service Design define data-access and business-logic ownership. All contracts use the existing `promx_*` tables and existing domain models only. They define no Dataverse schema changes and contain no implementations.

## 1. Repository Architecture Overview

Repositories are the only application layer that communicates directly with Dataverse. They isolate queries, CRUD/persistence operations, paging, and mapping between Dataverse responses and domain models.

Repositories are responsible for:

- Reading and writing the assigned existing Dataverse table.
- Applying requested filters, selected columns, ordering, and paging.
- Mapping Dataverse records to and from the existing domain models.
- Returning typed results without exposing raw Dataverse responses.

Repositories do not decide business rules, validate cricket actions, calculate scores/statistics/points, manage workflows, coordinate other repositories, or render UI. Those responsibilities remain with services or the UI as specified by the design documents.

Services own workflows and business decisions. A service may coordinate multiple repositories and existing services; repositories never call services or other repositories. Dataverse access flows only through repositories.

```text
UI
→ Service
→ Repository
→ Dataverse
```

Ball Events remain the source of truth for scoring. Match State, Batter Statistics, Bowler Statistics, and Tournament Standing are projection records. Repository methods persist or retrieve these records; they do not calculate their contents.

## 2. Repository Standards

### Naming

- Interface names use `I` plus the domain name and `Repository`, for example `ITournamentRepository`.
- Method names use `camelCase` and describe data access, for example `getByTournament` or `upsert`.
- Dataverse table and column logical names remain unchanged and use the exact `promx_*` names in Domain Models.
- Singular model names are used in type references, including `CricketBatterStatistic` and `CricketBowlerStatistic`.
- The authoritative statistic repository interfaces are `IBatterStatisticRepository` and `IBowlerStatisticRepository`; do not use plural interface-name variants.

### Error and Return Types

- Return `Promise<Result<T>>` as recommended by the Implementation Guide. A not-found result is represented by the typed result outcome, not an unexplained `null`.
- Collection reads return `Result<RepositoryPage<T>>`; an empty collection is a successful page with no items.
- `Result<T>` follows the application-wide result contract. Its concrete shape is not defined in the current design documents and is outside these repository contracts.
- Dataverse errors are caught and translated to typed repository failures; repositories log technical failures and do not present UI messages or apply business-specific retry decisions.

### Querying and Mapping

- Filter using existing lookup and status columns only. Do not invent schema fields or relationship paths.
- Select only the columns required by the caller and the model mapping.
- Parent-scoped reads are the default for registrations, matches, innings, overs, scoring events, and projections.
- Page collection queries. Preserve deterministic ordering when the caller needs chronological or sequence order.
- Repositories own Dataverse-to-model and model-to-Dataverse mapping. Mapping is not duplicated in services or UI.
- Lookup model properties use the GUID representation defined by Domain Models; repository contracts do not return expanded raw Dataverse lookup objects.

### Writes

- Repositories persist requested model changes; services validate and authorize the business operation before calling them.
- Projection writes are persistence/upsert only. Projection calculation and replay belong to ProjectionService, StatisticsService, and StandingService.
- No hard-delete method is exposed by default. The Master Architecture prohibits Ball Event deletion and requires historical records to be preserved; any other hard delete requires an explicit existing policy.
- Ball Event corrections use new linked events under the append-only policy. These contracts expose no update or delete operation for existing Ball Event content or status.

### Contract Notation

`Result<T>` is the typed result convention referenced by the Implementation Guide. `RepositoryPage<T>` below is a transport-level paging envelope, not a Dataverse table, domain entity, or new schema field:

```typescript
interface RepositoryPage<T> {
	items: T[];
	nextCursor?: string;
}
```

`pageSize` and `cursor` are query controls, not Dataverse columns. `id` parameters are GUID strings. `statusCode` and `stateCode` parameters write the existing Dataverse status/state values; services own the business decisions about which values are valid.

## 3. Repository Contracts

### ITournamentRepository

**Purpose:** Persist and retrieve tournament master records.

**Dependencies:** `CricketTournament`; Dataverse client and mapper infrastructure. No repository dependencies.

**Supported Operations:** Read by ID, paged list, active list, create, update, status persistence.

**Suggested Method Signatures:**

```typescript
interface ITournamentRepository {
	getById(id: string): Promise<Result<CricketTournament>>;
	getAll(pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketTournament>>>;
	getActive(pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketTournament>>>;
	create(model: CricketTournament): Promise<Result<CricketTournament>>;
	update(model: CricketTournament): Promise<Result<CricketTournament>>;
	updateStatus(id: string, statusCode: number): Promise<Result<CricketTournament>>;
}
```

**Expected Return Types:** `Result<CricketTournament>` for single records; `Result<RepositoryPage<CricketTournament>>` for lists.

**Query Responsibilities:** Filter active records using existing state/status fields; page and select mapped columns.

**Write Responsibilities:** Create/update tournament fields and persist requested status changes. TournamentService owns lifecycle validation and archive/completion decisions.

### ITeamRepository

**Purpose:** Persist and retrieve reusable team master records.

**Dependencies:** `CricketTeam`; Dataverse client and mapper infrastructure. No repository dependencies.

**Supported Operations:** Read by ID, paged list, create, update, status persistence.

**Suggested Method Signatures:**

```typescript
interface ITeamRepository {
	getById(id: string): Promise<Result<CricketTeam>>;
	getAll(pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketTeam>>>;
	create(model: CricketTeam): Promise<Result<CricketTeam>>;
	update(model: CricketTeam): Promise<Result<CricketTeam>>;
	updateStatus(id: string, statusCode: number): Promise<Result<CricketTeam>>;
}
```

**Expected Return Types:** `Result<CricketTeam>` or a paged `Result<RepositoryPage<CricketTeam>>`.

**Query Responsibilities:** Page team master reads and filter by existing state/status when requested.

**Write Responsibilities:** Persist master-field changes and status changes requested by TeamService; no team validation or activation policy.

### IPlayerRepository

**Purpose:** Persist and retrieve reusable player master records.

**Dependencies:** `CricketPlayer`; Dataverse client and mapper infrastructure. No repository dependencies.

**Supported Operations:** Read by ID, paged list, create, update, status persistence.

**Suggested Method Signatures:**

```typescript
interface IPlayerRepository {
	getById(id: string): Promise<Result<CricketPlayer>>;
	getAll(pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketPlayer>>>;
	create(model: CricketPlayer): Promise<Result<CricketPlayer>>;
	update(model: CricketPlayer): Promise<Result<CricketPlayer>>;
	updateStatus(id: string, statusCode: number): Promise<Result<CricketPlayer>>;
}
```

**Expected Return Types:** `Result<CricketPlayer>` or a paged `Result<RepositoryPage<CricketPlayer>>`.

**Query Responsibilities:** Page player master reads; apply supplied filters only against existing columns.

**Write Responsibilities:** Persist player master fields and requested status changes. PlayerService owns validation and import-source policy.

### ITournamentTeamRepository

**Purpose:** Persist and retrieve team registrations scoped to a tournament.

**Dependencies:** `CricketTournamentTeam`; Dataverse client and mapper infrastructure. No repository dependencies.

**Supported Operations:** Read by ID, paged reads by tournament, create, update.

**Suggested Method Signatures:**

```typescript
interface ITournamentTeamRepository {
	getById(id: string): Promise<Result<CricketTournamentTeam>>;
	getByTournament(tournamentId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketTournamentTeam>>>;
	create(model: CricketTournamentTeam): Promise<Result<CricketTournamentTeam>>;
	update(model: CricketTournamentTeam): Promise<Result<CricketTournamentTeam>>;
}
```

**Expected Return Types:** Single model result or paged tournament-scoped model result.

**Query Responsibilities:** Filter through the existing `promx_tournament` lookup; do not query Team Master as a substitute for registration.

**Write Responsibilities:** Persist registration fields and lookup IDs supplied by TournamentRegistrationService.

### ITournamentPlayerRepository

**Purpose:** Persist and retrieve tournament roster registrations.

**Dependencies:** `CricketTournamentPlayer`; Dataverse client and mapper infrastructure. No repository dependencies.

**Supported Operations:** Read by ID, paged reads by tournament/team registration, create, update.

**Suggested Method Signatures:**

```typescript
interface ITournamentPlayerRepository {
	getById(id: string): Promise<Result<CricketTournamentPlayer>>;
	getByTournament(tournamentId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketTournamentPlayer>>>;
	getByTournamentTeam(tournamentTeamId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketTournamentPlayer>>>;
	create(model: CricketTournamentPlayer): Promise<Result<CricketTournamentPlayer>>;
	update(model: CricketTournamentPlayer): Promise<Result<CricketTournamentPlayer>>;
}
```

**Expected Return Types:** Single model result or paged roster result.

**Query Responsibilities:** Filter using existing `promx_tournament` or `promx_tournamentteam` lookups.

**Write Responsibilities:** Persist roster registration fields. TournamentRegistrationService owns registration, captain, vice-captain, and validation decisions.

### IMatchRepository

**Purpose:** Persist and retrieve match setup and lifecycle/status fields.

**Dependencies:** `CricketMatch`; Dataverse client and mapper infrastructure. No repository dependencies.

**Supported Operations:** Read by ID/tournament, paged upcoming/live lists, create, update, status persistence.

**Suggested Method Signatures:**

```typescript
interface IMatchRepository {
	getById(id: string): Promise<Result<CricketMatch>>;
	getByTournament(tournamentId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketMatch>>>;
	getUpcoming(pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketMatch>>>;
	getLive(pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketMatch>>>;
	create(model: CricketMatch): Promise<Result<CricketMatch>>;
	update(model: CricketMatch): Promise<Result<CricketMatch>>;
	updateStatus(id: string, statusCode: number): Promise<Result<CricketMatch>>;
}
```

**Expected Return Types:** `Result<CricketMatch>` or paged match results.

**Query Responsibilities:** Filter by existing Tournament lookup, schedule, and state/status fields; retrieve Tournament Team lookup IDs without substituting Team Master IDs.

**Write Responsibilities:** Persist match fields and status requested by MatchService, TossService, or ScoringService. Match lifecycle validation and transitions remain service-owned.

### IMatchPlayerRepository

**Purpose:** Persist and retrieve match-player snapshots and Playing XI selection records.

**Dependencies:** `CricketMatchPlayer`; Dataverse client and mapper infrastructure. No repository dependencies.

**Supported Operations:** Read by ID/match, create, update.

**Suggested Method Signatures:**

```typescript
interface IMatchPlayerRepository {
	getById(id: string): Promise<Result<CricketMatchPlayer>>;
	getByMatch(matchId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketMatchPlayer>>>;
	create(model: CricketMatchPlayer): Promise<Result<CricketMatchPlayer>>;
	update(model: CricketMatchPlayer): Promise<Result<CricketMatchPlayer>>;
}
```

**Expected Return Types:** `Result<CricketMatchPlayer>` or paged match-player results.

**Query Responsibilities:** Filter by the existing Match lookup and map snapshot columns without refreshing them from mutable roster/master data.

**Write Responsibilities:** Persist service-supplied snapshots. PlayingXIService owns snapshot creation, validation, and the lock at Live; repository writes do not authorize post-Live changes.

### IInningsRepository

**Purpose:** Persist and retrieve match innings records.

**Dependencies:** `CricketInnings`; Dataverse client and mapper infrastructure. No repository dependencies.

**Supported Operations:** Read by ID/match, create, update.

**Suggested Method Signatures:**

```typescript
interface IInningsRepository {
	getById(id: string): Promise<Result<CricketInnings>>;
	getByMatch(matchId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketInnings>>>;
	create(model: CricketInnings): Promise<Result<CricketInnings>>;
	update(model: CricketInnings): Promise<Result<CricketInnings>>;
}
```

**Expected Return Types:** `Result<CricketInnings>` or paged innings results.

**Query Responsibilities:** Filter and order by existing Match lookup and innings-number column.

**Write Responsibilities:** Persist innings identity, team lookups, status, and counters supplied by ScoringService only when derived from Ball Events. Runs, wickets, balls, and overs may be persisted for performance/reporting but remain event-derived; Innings must not become an alternate scoring authority.

### IOverRepository

**Purpose:** Persist and retrieve innings-scoped over records.

**Dependencies:** `CricketOver`; Dataverse client and mapper infrastructure. No repository dependencies.

**Supported Operations:** Read by ID/innings, create, update.

**Suggested Method Signatures:**

```typescript
interface IOverRepository {
	getById(id: string): Promise<Result<CricketOver>>;
	getByInnings(inningsId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketOver>>>;
	create(model: CricketOver): Promise<Result<CricketOver>>;
	update(model: CricketOver): Promise<Result<CricketOver>>;
}
```

**Expected Return Types:** `Result<CricketOver>` or paged over results.

**Query Responsibilities:** Filter/order by existing Innings lookup and over-number column.

**Write Responsibilities:** Persist over identity, bowler lookup, status, and counters supplied by ScoringService only when derived from Ball Events. Runs, wickets, and legal deliveries may be persisted for performance/reporting but remain event-derived; Over must not become an alternate scoring authority. Do not calculate over totals in the repository.

### IBallEventRepository

**Purpose:** Persist and retrieve the append-only Ball Event scoring ledger.

**Dependencies:** `CricketBallEvent`; Dataverse client and mapper infrastructure. No repository dependencies.

**Supported Operations:** Read by ID/match/innings/over with paging; append a new event. No update or delete operation for existing events.

**Suggested Method Signatures:**

```typescript
interface IBallEventRepository {
	getById(id: string): Promise<Result<CricketBallEvent>>;
	getByMatch(matchId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketBallEvent>>>;
	getByInnings(inningsId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketBallEvent>>>;
	getByOver(overId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketBallEvent>>>;
	createEvent(model: CricketBallEvent): Promise<Result<CricketBallEvent>>;
}
```

**Expected Return Types:** `Result<CricketBallEvent>` for a single event; paged event results for collection reads.

**Query Responsibilities:** Filter on existing Match, Innings, or Over lookup columns. Order deterministically by delivery sequence within the requested scope. Page all collection reads.

**Write Responsibilities:** Append original scoring events, correction events, and reversal events. Correction/reversal events link to the original using `promx_parentballevent` and record `promx_correctionreason`. Ball Events are immutable historical records: do not update status/content or delete existing events.

### IMatchStateRepository

**Purpose:** Read and persist Match State projection records.

**Dependencies:** `CricketMatchState`; Dataverse client and mapper infrastructure. No repository dependencies.

**Supported Operations:** Read by match/innings; upsert projection record.

**Suggested Method Signatures:**

```typescript
interface IMatchStateRepository {
	getByMatch(matchId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketMatchState>>>;
	getByInnings(inningsId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketMatchState>>>;
	upsert(model: CricketMatchState): Promise<Result<CricketMatchState>>;
}
```

**Expected Return Types:** Paged projection results for match and innings lookups; `Result<CricketMatchState>` for upsert.

**Query Responsibilities:** Filter only through existing Match/Innings lookups and page multi-row results. These lookups are nullable in the model.

**Write Responsibilities:** Save projection values supplied by ProjectionService; no scoreboard calculation or event replay.

### IBatterStatisticRepository

**Purpose:** Read and persist batter-statistic projection records.

**Dependencies:** `CricketBatterStatistic`; Dataverse client and mapper infrastructure. No repository dependencies.

**Supported Operations:** Read by match/player; upsert projection record.

**Suggested Method Signatures:**

```typescript
interface IBatterStatisticRepository {
	getByMatch(matchId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketBatterStatistic>>>;
	getByPlayer(matchPlayerId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketBatterStatistic>>>;
	upsert(model: CricketBatterStatistic): Promise<Result<CricketBatterStatistic>>;
}
```

**Expected Return Types:** Paged statistic results; `Result<CricketBatterStatistic>` for upsert.

**Query Responsibilities:** Filter by existing Match or Match Player lookups. Do not imply an Innings lookup; none exists on this Dataverse table.

**Write Responsibilities:** Persist calculated projection values supplied by StatisticsService; no statistics calculation.

### IBowlerStatisticRepository

**Purpose:** Read and persist bowler-statistic projection records.

**Dependencies:** `CricketBowlerStatistic`; Dataverse client and mapper infrastructure. No repository dependencies.

**Supported Operations:** Read by match/player; upsert projection record.

**Suggested Method Signatures:**

```typescript
interface IBowlerStatisticRepository {
	getByMatch(matchId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketBowlerStatistic>>>;
	getByPlayer(matchPlayerId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketBowlerStatistic>>>;
	upsert(model: CricketBowlerStatistic): Promise<Result<CricketBowlerStatistic>>;
}
```

**Expected Return Types:** Paged statistic results; `Result<CricketBowlerStatistic>` for upsert.

**Query Responsibilities:** Filter by existing Match or Match Player lookups. Do not imply an Innings lookup; none exists on this Dataverse table.

**Write Responsibilities:** Persist calculated projection values supplied by StatisticsService; no statistics calculation.

### ITournamentRuleRepository

**Purpose:** Read and persist tournament rule definitions/configuration.

**Dependencies:** `CricketTournamentRule`; Dataverse client and mapper infrastructure. No repository dependencies.

**Supported Operations:** Read by ID, read by tournament, read enabled rules, create, update.

**Suggested Method Signatures:**

```typescript
interface ITournamentRuleRepository {
	getById(id: string): Promise<Result<CricketTournamentRule>>;
	getByTournament(tournamentId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketTournamentRule>>>;
	getEnabledRules(tournamentId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketTournamentRule>>>;
	create(model: CricketTournamentRule): Promise<Result<CricketTournamentRule>>;
	update(model: CricketTournamentRule): Promise<Result<CricketTournamentRule>>;
}
```

**Expected Return Types:** Paged rule results; `Result<CricketTournamentRule>` for writes.

**Query Responsibilities:** Filter by required Tournament lookup and existing enabled/state/status fields.

**Write Responsibilities:** Persist rule definitions and configuration JSON. TournamentService owns maintenance workflows; RuleEngineService owns loading/evaluation policy. Repository does not parse or validate rule JSON.

### ITournamentStandingRepository

**Purpose:** Read and persist Tournament Standing projection records.

**Dependencies:** `CricketTournamentStanding`; Dataverse client and mapper infrastructure. No repository dependencies.

**Supported Operations:** Read by tournament/team; upsert projection record.

**Suggested Method Signatures:**

```typescript
interface ITournamentStandingRepository {
	getByTournament(tournamentId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketTournamentStanding>>>;
	getByTournamentTeam(tournamentTeamId: string, pageSize?: number, cursor?: string): Promise<Result<RepositoryPage<CricketTournamentStanding>>>;
	upsert(model: CricketTournamentStanding): Promise<Result<CricketTournamentStanding>>;
}
```

**Expected Return Types:** Paged standing results; `Result<CricketTournamentStanding>` for upsert.

**Query Responsibilities:** Filter by the required `promx_tournament` or `promx_tournamentteam` lookup.

**Write Responsibilities:** Persist calculated standing values and both required lookup references supplied by StandingService; no points or NRR calculation.

## 4. Repository Dependency Matrix

“Dependencies” in the contract sections means consumed domain model plus shared Dataverse/mapping infrastructure; it does not mean dependency on another repository. Services are the only layer that coordinates repository calls.

| Repository | Consumes Model | Used By Services | Dataverse Table | Ownership |
|---|---|---|---|---|
| `ITournamentRepository` | `CricketTournament` | TournamentService, MatchService, ProjectionService, StandingService | `promx_crickettournament` | Source-of-truth master |
| `ITeamRepository` | `CricketTeam` | TeamService | `promx_cricketteam` | Source-of-truth master |
| `IPlayerRepository` | `CricketPlayer` | PlayerService | `promx_cricketplayer` | Source-of-truth master |
| `ITournamentTeamRepository` | `CricketTournamentTeam` | MatchService, StandingService, TournamentRegistrationService | `promx_crickettournamentteam` | Source-of-truth registration |
| `ITournamentPlayerRepository` | `CricketTournamentPlayer` | TournamentRegistrationService, PlayingXIService | `promx_crickettournamentplayer` | Source-of-truth registration |
| `IMatchRepository` | `CricketMatch` | MatchService, PlayingXIService, ProjectionService, RuleEngineService, TossService, ScoringService, StandingService | `promx_cricketmatch` | Source-of-truth match setup/lifecycle |
| `IMatchPlayerRepository` | `CricketMatchPlayer` | PlayingXIService, StatisticsService | `promx_cricketmatchplayer` | Source-of-truth historical snapshot |
| `IInningsRepository` | `CricketInnings` | ScoringService | `promx_cricketinnings` | Source-of-truth structure; scoring remains event-derived |
| `IInningsRepository` | `CricketInnings` | ScoringService, StandingService | `promx_cricketinnings` | Source-of-truth structure; scoring remains event-derived |
| `IOverRepository` | `CricketOver` | ScoringService | `promx_cricketover` | Source-of-truth structure; scoring remains event-derived |
| `IOverRepository` | `CricketOver` | ScoringService, StatisticsService | `promx_cricketover` | Source-of-truth structure; scoring remains event-derived |
| `IBallEventRepository` | `CricketBallEvent` | ScoringService, ProjectionService, StatisticsService, StandingService, UndoService | `promx_cricketballevent` | Scoring source of truth |
| `IMatchStateRepository` | `CricketMatchState` | ProjectionService | `promx_cricketmatchstate` | Projection |
| `IBatterStatisticRepository` | `CricketBatterStatistic` | StatisticsService | `promx_cricketbatterstatistic` | Projection |
| `IBowlerStatisticRepository` | `CricketBowlerStatistic` | StatisticsService | `promx_cricketbowlerstatistic` | Projection |
| `ITournamentRuleRepository` | `CricketTournamentRule` | TournamentService, RuleEngineService, StandingService | `promx_crickettournamentrule` | Source-of-truth configuration |
| `ITournamentStandingRepository` | `CricketTournamentStanding` | StandingService | `promx_crickettournamentstanding` | Projection |

## 5. Repository Usage Rules

### Allowed

```text
Service
→ Repository
```

Services may coordinate multiple repositories for a workflow. A repository may use shared Dataverse client/mapper infrastructure, but does not call another repository.

### Not Allowed

```text
UI
→ Repository

UI
→ Dataverse

Repository
→ Business Logic

Repository
→ Repository
```

Repositories do not apply tournament rules, validate Playing XI or toss choices, calculate scoring/statistics/points, decide match transitions, or decide whether a workflow is allowed. Those decisions belong to services. UI and hooks use services, not repository contracts.

## 6. Dataverse Query Guidelines

### Filtering Strategy

- Use existing lookup columns as parent filters: Tournament, Tournament Team, Match, Innings, Over, and Match Player as defined by each table's current schema.
- Filter status/state only through existing OOB `statecode` and `statuscode` or existing custom fields.
- Do not infer transitive relationships from IDs in the client. If a query requires data from another table, the service coordinates repository calls.
- Do not add filter fields to contracts unless they correspond to existing columns or documented query controls.

### Paging Strategy

- Page all collection reads with deterministic ordering and a continuation cursor.
- Return one `RepositoryPage<T>` per query page; callers continue until `nextCursor` is absent.
- Do not silently truncate a collection and report it as complete.
- Keep page size bounded and allow the caller to continue reads when a full rebuild requires all records.

### Projection Query Strategy

- Read projection records by their existing parent lookups.
- Write projection values only when requested by ProjectionService, StatisticsService, or StandingService.
- Treat a missing/stale projection as rebuildable; do not use it to repair or override Ball Event history.
- Tournament Standing queries are scoped by the live required `promx_tournament` and `promx_tournamentteam` lookups.

### Lookup Expansion Strategy

- Prefer lookup GUIDs and targeted repository reads over broad Dataverse expansion.
- Expand only when the calling service needs the related values in the same operation and the existing lookup is known.
- Map expanded values into existing model fields; do not return raw Dataverse payloads or invent navigation properties on persisted models.

### Large-Volume Table Strategy: `promx_cricketballevent`

- Always constrain collection reads by Match, Innings, or Over where possible; avoid unbounded reads.
- Page results and order by the existing delivery sequence within the requested scope. Do not use legal ball number alone as the event ordering key because illegal deliveries are also events.
- Retrieve only event columns needed by the caller/replay operation.
- Preserve all correction/reversal records and parent-event relationships; do not delete or overwrite existing events.
- Projection rebuilds may scan the required event history through pages, but repositories do not replay, aggregate, or calculate scores.

## 7. Future Implementation Notes

- Implement exactly the 15 interfaces and table mappings in this document; do not introduce new Dataverse tables or columns.
- Keep concrete repository classes behind these interfaces. They own Dataverse query syntax, persistence, and record mapping only.
- Use the existing domain model names and logical columns from Domain Models; do not return raw Dataverse records.
- Keep business validation, match lifecycle decisions, scoring, correction orchestration, and projection calculations in the documented services.
- Preserve append-only Ball Event history: create correction and reversal events linked to the original with `promx_parentballevent` and `promx_correctionreason`; never modify or delete the original event.
- Do not add repository-to-repository calls. When a workflow needs multiple data sources, the owning service coordinates the calls.
- Add tests for logical-name mapping, required-field writes, parent filters, paging continuation, typed failures, and projection persistence. These tests validate repository behavior and do not move business rules into repositories.
- The design documents do not define the concrete `Result<T>` envelope or continuation-token format. Keep their final shape consistent across repositories when the shared application type is defined.
