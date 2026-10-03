# Cricket Scoring App
## Repository Design

Version: 1.0

Status: Draft

Related documents:

- `CricketScoringApp_Master_Architecture.md` is authoritative for architecture decisions.
- `CricketScoringApp_Implementation_Guide.md` defines the application layering.
- `CricketScoringApp_Domain_Models.md` defines the returned/persisted model shapes.
- `CricketScoringApp_Service_Design.md` defines business workflow ownership.

---

# 1. Purpose

Repositories provide a consistent access layer between the application and Dataverse.

Repositories are responsible for:

- Dataverse Queries
- Dataverse CRUD Operations
- Dataverse Record Mapping
- Query Optimization
- Data Retrieval

Repositories are not responsible for:

- Business Rules
- Rule Validation
- Scoring Logic
- Statistics Calculation
- UI Rendering

---

# 2. Architecture Position

Application Flow:

React UI
↓
Service Layer
↓
Repository Layer
↓
Dataverse

---

## Allowed

UI
→ Service
→ Repository
→ Dataverse

---

## Not Allowed

UI
→ Dataverse

UI
→ Web API

UI
→ Repository
→ Business Logic

Repository
→ UI

---

# 3. Repository Design Principles

---

## Principle 1

Single Responsibility

Every repository owns one aggregate/domain.

Examples:

TournamentRepository

owns:

- Tournament

MatchRepository

owns:

- Match

BallEventRepository

owns:

- Ball Event

---

## Principle 2

Repositories Return Models

Repositories should return:

Domain Models

Examples:

CricketTournament

CricketMatch

CricketBallEvent

Repositories should not return:

Raw Dataverse Responses

---

## Principle 3

Repositories Are Dataverse-Aware

Repositories understand:

- Table Names
- Logical Names
- Query Structures
- Dataverse Mappings

Services should not need Dataverse knowledge.

---

## Principle 4

Repositories Are Business Rule Agnostic

Repositories must not contain:

- Match Rules
- Tournament Rules
- Validation Rules
- Cricket Logic

That logic belongs in Services.

---

# 4. Base Repository Contract

All repositories should follow consistent patterns.

Common Operations:

- getById()
- getAll()
- create()
- update()
- setState()
- delete() (only where allowed)

---

# 5. Tournament Repository

Repository:

TournamentRepository

Dataverse Table:

promx_crickettournament

Responsibilities:

- Get Tournament
- Create Tournament
- Update Tournament
- Archive Tournament
- Retrieve Active Tournaments

Suggested Operations:

- getById()
- getAll()
- getActive()
- create()
- update()
- archive()

---

# 6. Team Repository

Repository:

TeamRepository

Dataverse Table:

promx_cricketteam

Responsibilities:

- Manage Team Master Data

Suggested Operations:

- getById()
- getAll()
- create()
- update()
- activate()
- deactivate()

---

# 7. Player Repository

Repository:

PlayerRepository

Dataverse Table:

promx_cricketplayer

Responsibilities:

- Manage Player Master Data

Suggested Operations:

- getById()
- getAll()
- create()
- update()
- activate()
- deactivate()

---

# 8. Tournament Team Repository

Repository:

TournamentTeamRepository

Dataverse Table:

promx_crickettournamentteam

Responsibilities:

- Team Registration
- Tournament Team Lookup

Suggested Operations:

- getById()
- getByTournament()
- create()
- update()

---

# 9. Tournament Player Repository

Repository:

TournamentPlayerRepository

Dataverse Table:

promx_crickettournamentplayer

Responsibilities:

- Player Registration
- Roster Maintenance

Suggested Operations:

- getById()
- getByTournament()
- getByTournamentTeam()
- create()
- update()

---

# 10. Match Repository

Repository:

MatchRepository

Dataverse Table:

promx_cricketmatch

Responsibilities:

- Persist Match Setup and lifecycle/status changes requested by services
- Match Retrieval

Match lifecycle decisions and validation belong to MatchService; this repository persists the resulting Match changes.

Suggested Operations:

- getById()
- getByTournament()
- getUpcomingMatches()
- getLiveMatches()
- create()
- update()
- updateStatus()

---

# 11. Match Player Repository

Repository:

MatchPlayerRepository

Dataverse Table:

promx_cricketmatchplayer

Responsibilities:

- Playing XI Storage
- Match Snapshots

Suggested Operations:

- getById()
- getByMatch()
- create()
- update()

Important:

Match Player snapshots must not be modified after Match becomes Live.

---

# 12. Innings Repository

Repository:

InningsRepository

Dataverse Table:

promx_cricketinnings

Responsibilities:

- Create Innings
- Retrieve Innings
- Persist runs, wickets, balls, and overs only as counters derived from Ball Events

Innings counters may be persisted for performance and reporting, but Ball Events remain authoritative for runs, wickets, balls, and overs. Innings records must not become an alternate scoring authority.

Suggested Operations:

- getById()
- getByMatch()
- create()
- update()

---

# 13. Over Repository

Repository:

OverRepository

Dataverse Table:

promx_cricketover

Responsibilities:

- Over Tracking
- Persist runs, wickets, and legal deliveries only as counters derived from Ball Events

Over counters may be persisted for performance and reporting, but Ball Events remain authoritative for runs, wickets, and legal deliveries. Over records must not become an alternate scoring authority.

Suggested Operations:

- getById()
- getByInnings()
- create()
- update()

---

# 14. Ball Event Repository

Repository:

BallEventRepository

Dataverse Table:

promx_cricketballevent

Responsibilities:

- Ball Event Storage
- Ball Event Retrieval

This is the most critical repository.

Suggested Operations:

- getById()
- getByMatch()
- getByInnings()
- getByOver()
- createEvent()
- Create correction events with `promx_parentballevent` and `promx_correctionreason`
- Create reversal events linked with `promx_parentballevent` and `promx_correctionreason`

Important:

Ball Event is the source of truth.

Ball Events are immutable historical records. Corrections and reversals append new Ball Events; existing event content and status are never modified, and deletion is not supported.

---

# 15. Match State Repository

Repository:

MatchStateRepository

Dataverse Table:

promx_cricketmatchstate

Responsibilities:

- Read Current Match State
- Save Projection Updates

Suggested Operations:

- getByMatch()
- getByInnings()
- upsert()

Important:

Match State is a projection.

---

# 16. Batter Statistics Repository

Repository:

IBatterStatisticRepository

Dataverse Table:

promx_cricketbatterstatistic

Responsibilities:

- Store Derived Batter Statistics

Suggested Operations:

- getByMatch()
- getByPlayer()
- upsert()

---

# 17. Bowler Statistics Repository

Repository:

IBowlerStatisticRepository

Dataverse Table:

promx_cricketbowlerstatistic

Responsibilities:

- Store Derived Bowler Statistics

Suggested Operations:

- getByMatch()
- getByPlayer()
- upsert()

---

# 18. Tournament Rule Repository

Repository:

TournamentRuleRepository

Dataverse Table:

promx_crickettournamentrule

Responsibilities:

- Retrieve Rule Configuration
- Maintain Rule Definitions

Suggested Operations:

- getByTournament()
- getEnabledRules()
- create()
- update()

---

# 19. Tournament Standing Repository

Repository:

TournamentStandingRepository

Dataverse Table:

promx_crickettournamentstanding

Responsibilities:

- Store Tournament Standings
- Retrieve Points Table

Suggested Operations:

- getByTournament()
- getByTournamentTeam()
- upsert()

Important:

Tournament Standing is a projection.

---

# 20. Dataverse Mapping Strategy

Mapping Logic Location:

src/mappers/

Examples:

- TournamentMapper
- MatchMapper
- BallEventMapper

Responsibilities:

- Dataverse → Domain Model
- Domain Model → Dataverse

Mapping logic must not exist inside:

- React Components
- Services

---

# 21. Query Strategy

Always:

- Retrieve only required columns
- Use parent lookups for filtering
- Use paging for large result sets
- Use status filtering when appropriate

Avoid:

- Retrieving full entity payloads
- N+1 query patterns
- Unbounded Ball Event queries

---

# 22. Error Handling

Repositories should:

- Catch Dataverse exceptions
- Log failures
- Return typed results

Repositories should not:

- Display UI messages
- Implement retry policies tied to business logic

---

# 23. Repository Ownership Summary

Source-Of-Truth Repositories

- TournamentRepository
- TeamRepository
- PlayerRepository
- TournamentTeamRepository
- TournamentPlayerRepository
- MatchRepository
- MatchPlayerRepository
- InningsRepository
- OverRepository
- BallEventRepository
- TournamentRuleRepository

Projection Repositories

- MatchStateRepository
- IBatterStatisticRepository
- IBowlerStatisticRepository
- TournamentStandingRepository

---

# 24. Future Extensibility

Additional repositories may be introduced when new bounded domains appear.

Examples:

- ReportingRepository
- AuditRepository
- NotificationRepository

Do not introduce repositories that duplicate the responsibility of existing repositories.