# Cricket Scoring App
## Service Design

Version: 1.0

Status: Draft

Related documents:

- `CricketScoringApp_Master_Architecture.md` is authoritative for architecture decisions.
- `CricketScoringApp_Implementation_Guide.md` defines the application layering.
- `CricketScoringApp_Domain_Models.md` defines the Dataverse-aligned model shapes.
- `CricketScoringApp_Repository_Design.md` defines Dataverse access ownership.

---

# 1. Purpose

Services contain application business logic.

Services coordinate:

- Repositories
- Domain Models
- Validation
- Workflows

Services do not:

- Render UI
- Execute Dataverse Queries
- Perform Direct Dataverse CRUD

Those responsibilities belong to Repositories.

---

# 2. Architecture Position

Application Flow

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
→ Repository

Service
→ UI

Repository
→ Business Logic

---

# 3. Service Design Principles

---

## Principle 1

Services Own Business Logic

Examples:

✅ Match Creation Validation

✅ Playing XI Validation

✅ Toss Validation

✅ Scoring Validation

✅ Rule Evaluation

Services are the application brain.

---

## Principle 2

Services Coordinate Repositories

A service may call:

- MatchRepository
- TournamentRepository
- BallEventRepository

within the same operation.

Repositories must never coordinate each other.

---

## Principle 3

Services Return Business Results

Services should return:

- Domain Models
- DTOs
- Validation Results

Services should not return:

- Raw Dataverse Responses

---

# 4. Tournament Service

Service:

TournamentService

Purpose:

Manage tournament lifecycle.

Responsibilities:

- Tournament Creation
- Tournament Validation
- Tournament Activation
- Tournament Completion
- Tournament Rule Definition Maintenance

Dependencies:

- TournamentRepository
- TournamentRuleRepository

Example Operations:

- createTournament()
- activateTournament()
- completeTournament()
- archiveTournament()
- createTournamentRule()
- updateTournamentRule()
- setTournamentRuleEnabled()

---

# 5. Team Service

Service:

TeamService

Purpose:

Manage team master records.

Responsibilities:

- Team Validation
- Team Activation
- Team Deactivation

Dependencies:

- TeamRepository

Example Operations:

- createTeam()
- updateTeam()
- activateTeam()
- deactivateTeam()

---

# 6. Player Service

Service:

PlayerService

Purpose:

Manage player master records.

Responsibilities:

- Player Creation
- Player Validation

Dependencies:

- PlayerRepository

Example Operations:

- createPlayer()
- updatePlayer()
- activatePlayer()
- deactivatePlayer()

---

# 7. Tournament Registration Service

Service:

TournamentRegistrationService

Purpose:

Manage tournament registrations.

Responsibilities:

- Team Registration
- Player Registration
- Captain Assignment
- Vice Captain Assignment

Dependencies:

- TournamentTeamRepository
- TournamentPlayerRepository

Example Operations:

- registerTeam()
- registerPlayer()
- assignCaptain()
- assignViceCaptain()

---

# 8. Auction Import Service

Service:

AuctionImportService

Purpose:

Perform a user-confirmed, one-time copy of selected Auction teams and their active players into Cricket Flow master records.

Dependencies:

- AuctionRepository (read-only source access)
- TeamRepository
- PlayerRepository

Responsibilities:

- Load Auction teams in caller-requested pages
- Preview selected team and associated active-player counts
- Skip existing copies by Auction source reference
- Create Scoring master teams and players, returning imported/skipped/failed counts

This service does not create tournament registrations. Users register the copied Cricket Flow master records through TournamentRegistrationService. No synchronization or ongoing Auction dependency is introduced.

---

# 9. Match Service

Service:

MatchService

Purpose:

Manage match lifecycle.

Responsibilities:

- Match Setup
- Schedule Match
- Match Activation
- Match lifecycle/status transitions, including completion

Dependencies:

- MatchRepository
- TournamentRepository
- TournamentTeamRepository

Example Operations:

- createMatch()
- updateMatch()
- startMatch()
- completeMatch()
- abandonMatch()
- cancelMatch()

---

# 10. Playing XI Service

Service:

PlayingXIService

Purpose:

Manage match participant snapshots.

Responsibilities:

- Create Match Player Snapshots
- Validate Playing XI
- Lock Playing XI

Dependencies:

- MatchPlayerRepository
- TournamentPlayerRepository
- MatchRepository
- TournamentRepository
- MatchService

Example Operations:

- createPlayingXI()
- addPlayer()
- removePlayer()
- lockPlayingXI()

Important:

Snapshots become immutable once Match Status becomes Live.

---

# 11. Toss Service

Service:

TossService

Purpose:

Manage toss operations.

Responsibilities:

- Record Toss Winner
- Record Toss Decision

Dependencies:

- MatchRepository

Example Operations:

- recordToss()
- updateToss()

---

# 12. Rule Engine Service

Service:

RuleEngineService

Purpose:

Validate tournament-specific rules.

Responsibilities:

- Evaluate Rules
- Load Rule Configuration
- Return Validation Results

Dependencies:

- TournamentRuleRepository
- MatchRepository

Example Operations:

- validateBall()
- validateWicket()
- validateBatter()
- validateBowler()
- validateInningsTransition()

Important:

Rule Engine validates.

Rule Engine does not score.

---

# 13. Scoring Service

Service:

ScoringService

Purpose:

Execute scoring workflows.

This is the most important service in the application.

Dependencies:

- BallEventRepository
- OverRepository
- InningsRepository
- MatchRepository
- RuleEngineService
- MatchService
- ProjectionService

Responsibilities:

- Process Ball
- Record Runs
- Record Extras
- Record Wickets
- Manage Strike Change
- Manage Over Completion
- Manage Innings Completion
- Derive and persist Innings/Over runs, wickets, balls, overs, and legal deliveries from Ball Events only
- Determine scoring completion and delegate Match lifecycle/status transition to MatchService
- Request projection refresh after Ball Event persistence

Example Operations:

- processBall()
- processWide()
- processNoBall()
- processWicket()
- endOver()
- endInnings()
- completeMatch()

Important:

Every scoring operation creates a Ball Event.

---

# 14. Projection Service

Service:

ProjectionService

Purpose:

Orchestrate projection refreshes, rebuild coordination, and refresh workflows.

Dependencies:

- BallEventRepository
- MatchRepository
- TournamentRepository
- MatchStateRepository
- StatisticsService
- StandingService

Dependency purposes:

- MatchRepository and TournamentRepository: enumerate matches for requested full rebuilds.
- BallEventRepository: replay authoritative scoring history.
- MatchStateRepository: persist rebuilt live-state projections.
- StatisticsService and StandingService: coordinate their respective projection calculations.

Responsibilities:

- Projection orchestration
- Projection rebuild coordination
- Refresh workflow management
- Rebuild Match State

Example Operations:

- rebuildMatchState()
- refreshAfterEvent()
- rebuildAllProjections()

Projection refresh/rebuild interaction order:

```text
ProjectionService
	-> StatisticsService
	-> StandingService
```

This is orchestration order, not a service dependency: ProjectionService invokes StatisticsService for batter/bowler calculations and then StandingService for standings, points, and NRR calculations.

---

# 15. Statistics Service

Service:

StatisticsService

Purpose:

Generate batting and bowling statistics.

Dependencies:

- BallEventRepository
- MatchPlayerRepository
- OverRepository
- IBatterStatisticRepository
- IBowlerStatisticRepository

Dependency purposes:

- BallEventRepository: source events for batting and bowling calculations.
- MatchPlayerRepository: resolve match-specific player snapshot names for statistic records.
- OverRepository: group bowling events by over for over-level statistics.
- IBatterStatisticRepository and IBowlerStatisticRepository: persist calculated projections.

Responsibilities:

- Calculate Batter Statistics
- Calculate Bowler Statistics

Example Operations:

- calculateBattingStats()
- calculateBowlingStats()
- calculateStatisticsFromEvents()

---

# 16. Standing Service

Service:

StandingService

Purpose:

Manage tournament standings.

Dependencies:

- MatchRepository
- BallEventRepository
- InningsRepository
- TournamentTeamRepository
- TournamentRepository
- TournamentRuleRepository
- TournamentStandingRepository

Dependency purposes:

- MatchRepository: identify completed matches and their tournament outcomes.
- BallEventRepository: derive runs, wickets, balls, and overs from authoritative scoring history for NRR.
- TournamentRepository: read tournament-level points settings.
- InningsRepository: associate innings scoring with batting and bowling tournament teams for NRR.
- TournamentTeamRepository: enumerate registered teams when building tournament rows.
- TournamentRepository: read tournament-level points settings and innings limits.
- TournamentRuleRepository: read configured tournament rules used by points and standings calculations.
- TournamentStandingRepository: persist and retrieve the standings projection.

Responsibilities:

- Calculate Tournament Points
- Calculate NRR
- Generate Standings

Example Operations:

- updateStandings()
- calculateNRR()
- rebuildTournamentTable()

Important:

Tournament Standing is a projection.

---

# 17. Undo Service

Service:

UndoService

Purpose:

Handle scoring corrections.

Dependencies:

- BallEventRepository
- ProjectionService

Responsibilities:

- Append reversal Ball Events linked to the original event
- Append correction Ball Events linked to the original event
- Request projection rebuild through ProjectionService

Example Operations:

- reverseBall(ballEvent, reversalReason)
- correctBall()
- rebuildAfterCorrection()

Important:

Never delete Ball Events.

Preserve audit history.
