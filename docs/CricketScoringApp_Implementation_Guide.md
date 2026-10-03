# Cricket Scoring App
## Implementation Guide

Version: 1.0

Status: In Progress

---

# Important

This document complements:

CricketScoringApp_Master_Architecture.md

Related design documents:

- CricketScoringApp_Domain_Models.md defines the Dataverse-aligned model shapes.
- CricketScoringApp_Repository_Design.md defines Dataverse access ownership.
- CricketScoringApp_Service_Design.md defines workflow and business-logic ownership.

The Architecture Document remains the primary source of truth.

This document describes implementation guidance for GitHub Copilot Agent.

---

# 1. Implementation Principles

Always follow:

UI
→ Service
→ Repository
→ Dataverse

Never:

UI
→ Dataverse

UI
→ Web API

UI
→ Business Logic

---

# 2. Technology Stack

Frontend

- React
- TypeScript
- Fluent UI v9

Backend

- Dataverse

Development

- Power Apps Code Apps
- GitHub Copilot Agent
- Dataverse MCP

---

# 3. Folder Structure

src/

├── app/
├── pages/
├── components/
├── hooks/
├── context/
├── services/
├── repositories/
├── models/
├── mappers/
├── constants/
├── utils/
├── types/
├── routing/
├── assets/

---

# 4. Layer Responsibilities

## Pages

Purpose:

Feature screens.

Examples:

- TournamentListPage
- TournamentDetailPage
- MatchListPage
- LiveScoringPage

Pages should:

- Coordinate UI
- Call services

Pages should not:

- Call Dataverse directly
- Contain business logic

---

## Components

Purpose:

Reusable UI controls.

Examples:

- TournamentCard
- TeamSelector
- PlayerSelector
- ScoreWidget
- BatterWidget
- BowlerWidget

Components should remain small.

---

## Hooks

Purpose:

Encapsulate reusable client logic.

Examples:

- useTournament()
- useMatches()
- useLiveScore()
- useStandings()

Hooks may call services.

---

## Context

Purpose:

Shared application state.

Examples:

- TournamentContext
- MatchContext
- ScoringContext

Use Context before considering any additional state management library.

---

## Services

Purpose:

Business logic.

Examples:

- TournamentService
- MatchService
- ScoringService
- ProjectionService
- RuleEngineService
- StatisticsService
- StandingService

---

## Repositories

Purpose:

Dataverse access.

Repositories are the only layer allowed to access Dataverse.

Examples:

- TournamentRepository
- TeamRepository
- PlayerRepository
- MatchRepository
- BallEventRepository
- IBatterStatisticRepository
- IBowlerStatisticRepository

---

# 5. Domain Models

One model should exist for every Dataverse table.

Examples:

- Tournament
- Team
- Player
- TournamentTeam
- TournamentPlayer
- Match
- MatchPlayer
- Innings
- Over
- BallEvent
- MatchState
- BatterStatistic
- BowlerStatistic
- TournamentRule
- TournamentStanding

Models should reflect Dataverse schema.

Do not invent properties that do not exist.

---

# 6. Repository Contracts

Repositories own:

- Querying
- Creating records
- Updating records
- Mapping Dataverse responses

Repositories do not:

- Validate business rules
- Execute scoring logic

---

## Example Repository Methods

TournamentRepository

- getById()
- getAll()
- create()
- update()

MatchRepository

- getById()
- getMatchesByTournament()
- create()
- update()

BallEventRepository

- createEvent()
- getEventsByMatch()
- getEventsByInnings()

---

# 7. Service Contracts

Services own application logic.

---

## TournamentService

Responsibilities:

- Tournament validation
- Registration workflows

---

## MatchService

Responsibilities:

- Match lifecycle
- Match setup
- Toss tracking

---

## RuleEngineService

Responsibilities:

- Rule validation
- Rule processing
- Rule configuration parsing

---

## ScoringService

Responsibilities:

- Process deliveries
- Create Ball Events
- Request projection refresh through ProjectionService

## ProjectionService

Responsibilities:

- Refresh projections after Ball Event persistence
- Rebuild projections from Ball Event history

---

## StatisticsService

Responsibilities:

- Batter statistics calculation
- Bowler statistics calculation

---

## StandingService

Responsibilities:

- Points calculation
- NRR calculation
- Standings generation

---

# 8. Dataverse Mapping Rules

Dataverse logical names remain authoritative.

Use:

promx_cricketmatch

Not:

MatchEntity

Dataverse columns should be mapped into strongly typed models.

Mapping logic belongs in:

mappers/

Never in React components.

---

# 9. Error Handling

Always:

- Catch exceptions
- Log errors
- Return typed results

Never:

- Swallow exceptions
- Return null without explanation

Prefer:

Result<T>

style responses.

---

# 10. Live Scoring Workflow

Expected Flow:

User Action
↓
RuleEngineService
↓
ScoringService
↓
BallEventRepository
↓
Dataverse
↓
ProjectionService
↓
StatisticsService
↓
StandingService
↓
UI Refresh

---

# 11. Projection Update Strategy

Projection Tables:

- Match State
- Batter Statistics
- Bowler Statistics
- Tournament Standing

Rules:

- Rebuildable
- Non-authoritative
- Derived from Ball Events

Ball Events remain authoritative.

---

# 12. Navigation Routes

/

Home

/tournaments

Tournament List

/tournaments/:id

Tournament Detail

/matches

Match List

/matches/:id

Match Detail

/matches/:id/playing-xi

Playing XI

/matches/:id/toss

Toss

/scoring/:id

Live Scoring

/standings

Tournament Standings

/statistics

Statistics

---

# 13. Testing Strategy

Unit Test:

- Services
- Rule Engine
- Scoring Logic

Integration Test:

- Repository Layer
- Dataverse Mapping

Business Rules should be testable without React UI.

---

# 14. Coding Standards

Always:

- Use TypeScript strict mode
- Use async/await
- Use interfaces
- Create reusable components

Never:

- Use any
- Hardcode GUIDs
- Duplicate business logic
- Call Dataverse from React components

---

# 15. Implementation Order

Phase 1

- Models
- Mappers
- Repositories

Phase 2

- Services

Phase 3

- Context Providers

Phase 4

- Navigation Shell

Phase 5

- Tournament Module

Phase 6

- Match Module

Phase 7

- Playing XI

Phase 8

- Live Scoring

Phase 9

- Statistics

Phase 10

- Standings

Phase 11

- Advanced Rules

---

# 16. Definition Of Done

A module is complete when:

- UI implemented
- Service implemented
- Repository implemented
- Unit tested
- Dataverse integrated
- Architecture compliant

If implementation conflicts with the Master Architecture Document:

The Master Architecture Document wins.