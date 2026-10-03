# Cricket Scoring App
## Master Architecture Document

Version: 1.0

Status: In Progress

---

# IMPORTANT FOR ALL COPILOT AGENTS

Before generating any code:

1. Read this document completely.
2. Treat this document as the project's source of truth.
3. Do not redesign the architecture.
4. Do not introduce Redux.
5. Do not bypass the Ball Event architecture.
6. Do not create duplicate Dataverse tables.
7. Use existing Dataverse logical names.
8. Follow Repository Pattern.
9. Follow React + TypeScript best practices.
10. Ask for clarification if business requirements conflict with this document.

If generated code conflicts with this document, this document wins.

---

# 1. Project Overview

The Cricket Scoring App is a standalone scoring and tournament management application built using:

- Power Apps Code Apps
- React
- TypeScript
- Fluent UI v9
- Dataverse
- Dataverse MCP
- GitHub Copilot Agent

The solution supports:

- Office Cricket Tournaments
- Corporate Cricket Tournaments
- Tennis Ball Cricket
- Custom Cricket Formats

Primary Capabilities:

- Tournament Management
- Team Management
- Player Management
- Tournament Registration
- Playing XI Management
- Toss Management
- Ball-by-Ball Scoring
- Statistics
- Points Table
- Rule Engine
- Scorecards

---

# 2. Project Philosophy

The application follows an Event Driven Architecture.

Core Principle:

Ball Event history is the permanent source of truth.

Derived scoring state and summaries are projections that can be rebuilt from event history. Master, registration, match setup, and historical snapshot records are not scoring projections.

Examples of projections:

- Match State
- Batter Statistics
- Bowler Statistics
- Tournament Standings
- Scorecards
- Leaderboards

---

# 3. Architectural Principles

## Principle 1

Ball Event is the Source of Truth.

All scoring data originates from Ball Events.

No process should bypass Ball Events.

---

## Principle 2

Historical records must be preserved.

Completed matches must remain historically accurate forever.

Future roster changes must never modify historical scorecards.

---

## Principle 3

Every scoring action must be auditable.

The system must support dispute investigation and scoring corrections.

---

## Principle 4

Tournament specific rules must be configurable.

Rules belong in Tournament Rules and must not be hardcoded into Scoring Logic.

---

## Principle 5

Scoring Engine and Rule Engine are separate systems.

Rule Engine validates actions.

Scoring Engine records events.

---

# 4. Dataverse Naming Convention

Architecture discussions may reference simplified names:

- Tournament
- Team
- Player
- Match
- Ball Event

Actual Dataverse implementation uses:

- promx_crickettournament
- promx_cricketteam
- promx_cricketplayer
- promx_crickettournamentteam
- promx_crickettournamentplayer
- promx_cricketmatch
- promx_cricketmatchplayer
- promx_cricketinnings
- promx_cricketover
- promx_cricketballevent
- promx_cricketmatchstate
- promx_cricketbatterstatistic
- promx_cricketbowlerstatistic
- promx_crickettournamentrule
- promx_crickettournamentstanding

IMPORTANT:

Do not create duplicate crs_* tables.

All development must use existing promx_* tables.

---

# 5. Data Ownership Strategy

The Scoring App owns all scoring data.

Data may optionally be imported from the Auction application.

After import:

Scoring App owns:

- Tournaments
- Teams
- Players
- Matches
- Rules
- Statistics
- Scorecards

There must be no runtime dependency on Auction App data.

Historical scoring must remain valid even if Auction data changes later.

---

# 6. Status Management Strategy

The application intentionally uses Dataverse OOB State and Status Reason fields wherever possible.

Avoid creating duplicate custom status columns.

---

## Tournament Status

Table:

promx_crickettournament

Status Reason:

- Draft
- Active
- Completed
- Archived

Default:

Draft

---

## Team Status

Table:

promx_cricketteam

Status Reason:

- Active
- Inactive

Default:

Active

---

## Player Status

Table:

promx_cricketplayer

Status Reason:

- Active
- Inactive

Default:

Active

---

## Tournament Team Status

Table:

promx_crickettournamentteam

Status Reason:

- Active
- Inactive

Default:

Active

---

## Tournament Player Status

Table:

promx_crickettournamentplayer

Status Reason:

- Active
- Inactive

Default:

Active

---

## Match Status

Table:

promx_cricketmatch

Status Reason:

- Draft
- Ready
- Live
- Innings Break
- Completed
- Interrupted
- Abandoned
- Cancelled
- Super Over Required
- Super Over Live

Default:

Draft

---

## Innings Status

Table:

promx_cricketinnings

Status Reason:

- Not Started
- Live
- Completed
- Retired
- All Out

---

## Over Status

Table:

promx_cricketover

Status Reason:

- Not Started
- In Progress
- Completed

---

## Ball Event Status

Table:

promx_cricketballevent

Status Reason:

- Active
- Inactive
- Reversed
- Corrected

NOTE:

These status reasons remain defined in Dataverse. Corrections append linked Ball Events; original event content and status are not modified.

---

## Match State Status

Table:

promx_cricketmatchstate

Status Reason:

- Live
- Innings Break
- Completed

Match State is a projection and may be rebuilt from Ball Events.

---

# 7. Domain Model

The application is divided into five logical domains.

1. Tournament Domain
2. Match Domain
3. Scoring Domain
4. Statistics Domain
5. Rules & Standings Domain

Each domain has clearly defined ownership and responsibilities.

---

# 8. Entity Relationship Model (ERD)

## Tournament Domain

Tournament owns tournament-specific registrations.

Physical teams and players are reusable across tournaments.

```text
promx_crickettournament
    │
    ├──< promx_crickettournamentteam >── promx_cricketteam
    │
    └──< promx_crickettournamentplayer >── promx_cricketplayer

promx_crickettournamentteam
    │
    └──< promx_crickettournamentplayer
```

### Relationship Rules

Tournament Team represents:

Tournament + Team

Example:

IPL 2026 + Mumbai

Office Tournament + Team Alpha

---

Tournament Player represents:

Tournament + Team + Player

A player record inside a tournament.

This allows:

- Jersey Number
- Captain Flag
- Vice Captain Flag
- Category
- Team Assignment

to be tournament specific.

---

Historical registrations must never be derived directly from Player Master data.

## Match Domain

Match setup uses Tournament Team records instead of Team Master records.

This ensures matches remain historically accurate.

```text
promx_crickettournament
    │
    └──< promx_cricketmatch

promx_crickettournamentteam
    │
    ├── Team A
    │
    └── Team B

promx_cricketmatch
    │
    └──< promx_cricketmatchplayer

promx_crickettournamentplayer
    │
    └──< promx_cricketmatchplayer
```

### Match Player Snapshot Strategy

Match Player is a historical snapshot.

Purpose:

Preserve Playing XI information.

Snapshot fields include:

- Name
- Team
- Gender
- Jersey Number
- Category
- Captain Flag
- Wicket Keeper Flag

Once a match enters Live status:

These fields become immutable.

Changes to Tournament Player records must not affect historical Match Player records.

## Scoring Domain

The Scoring Domain follows Event Sourcing principles.

Ball Event is the system of record.

```text
promx_cricketmatch
        │
        └──< promx_cricketinnings
                    │
                    └──< promx_cricketover
                                │
                                └──< promx_cricketballevent
```

Live projections:

```text
promx_cricketmatch
        │
        └── promx_cricketmatchstate
```

---

### Source Of Truth

Table:

promx_cricketballevent

This is the permanent scoring ledger.

Every scoring action creates a Ball Event.

Nothing may update scoring directly.

Examples:

✅ Create Ball Event

❌ Directly update Match Total

❌ Directly update Batter Statistics

❌ Directly update Bowler Statistics

---

### Projection Tables

The following tables are projections:

- promx_cricketmatchstate
- promx_cricketbatterstatistic
- promx_cricketbowlerstatistic
- promx_crickettournamentstanding

Projection data can be rebuilt from Ball Events.

Ball Events remain authoritative.

Innings and Over counters may be persisted for performance and reporting. Runs, wickets, balls, overs, and legal deliveries remain derived from Ball Events; Innings and Over records must not become alternate scoring authorities.

# 9. Scoring Engine Architecture

The Scoring Engine is responsible for recording cricket events and maintaining all projections.

The Scoring Engine does not contain tournament-specific rules.

Tournament-specific rules are delegated to the Rule Engine.

---

## Scoring Flow

User Action
↓
Rule Validation
↓
Create Ball Event
↓
ProjectionService Refresh / Rebuild
↓
Refresh UI

---

## Source Of Truth

Table:

promx_cricketballevent

All scoring actions create Ball Events.

No other table may become scoring authority.

---

## Scoring Responsibilities

The Scoring Engine is responsible for:

- Recording deliveries
- Recording runs
- Recording extras
- Recording wickets
- Managing strike changes
- Managing over transitions
- Managing innings transitions
- Managing match completion

---

## Scoring Engine Functions

processBall()

undoBall()

endOver()

changeBowler()

selectNewBatter()

retireBatter()

endInnings()

completeMatch()

The Scoring Engine owns the scoring-side completion decision. MatchService owns the Match lifecycle/status transition and is called to persist completion.

---

## Projection Updates

ProjectionService coordinates refresh and rebuild of:

- Match State
- Batter Statistics
- Bowler Statistics
- Tournament Standings

These tables remain rebuildable from Ball Events.

---

## Match State

Match State is an optimization.

Match State is never a permanent scoring record.

If Match State becomes corrupted:

Ball Events should be replayed.

---

## Batter Statistics

Derived From:

Ball Events

Examples:

- Runs
- Balls Faced
- Strike Rate
- Fours
- Sixes

---

## Bowler Statistics

Derived From:

Ball Events

Examples:

- Overs
- Maidens
- Wickets
- Economy

---

## Tournament Standing

Derived From:

Completed Matches

Contains:

- Matches Played
- Points
- NRR

Tournament Standing is rebuildable.

# 10. Undo Strategy

All scoring actions must remain auditable.

The application must preserve historical scoring activity.

---

## Design Goal

A score correction must never remove the ability to understand what happened originally.

---

## Ball Event Corrections

Table:

promx_cricketballevent

Supports:

- Active
- Reversed
- Corrected

---

## Append-Only Event History

Append-only event history is the approved correction policy.

Example:

Event 101
4 Runs

Event 102
Reversal Of Event 101

Event 103
Corrected Event

This preserves a complete audit trail.

---

## Correction Rules

Never:

- Delete Ball Events

Avoid:

- Modifying historical scoring events

Prefer:

- Creating correction events
- Linking correction events using Parent Ball Event

---

## Projection Recalculation

After Undo:

1. Recalculate Match State
2. Recalculate Batter Statistics
3. Recalculate Bowler Statistics
4. Recalculate Tournament Standing

Ball Event history remains authoritative.

## Authoritative Ball Event Correction Policy

The Cricket Scoring App follows an append-only correction strategy.

Ball Events are considered historical records.

Original Ball Events must not be deleted.

Corrections should be implemented by creating a new Ball Event linked to the original event using:

- promx_parentballevent
- promx_correctionreason

Example:

Event 101
Four Runs

Event 102
Correction For Event 101

Event 103
One Run

This preserves a complete audit trail and supports event replay.

Projection tables including:

- Match State
- Batter Statistics
- Bowler Statistics
- Tournament Standing

must be recalculated using the effective event history.

Append-only history takes precedence over direct modification of completed Ball Events.

# 11. Rule Engine Architecture

The Rule Engine is responsible for validating cricket actions.

The Rule Engine does not create scores.

The Scoring Engine records scores.

---

## Separation Of Responsibilities

Rule Engine

- Validate actions
- Enforce tournament rules
- Determine allowed actions

Scoring Engine

- Record Ball Events
- Update projections

---

## Rule Storage

Table:

promx_crickettournamentrule

Rules are stored as JSON configuration.

---

## Supported Rules

- Female Batter Rule
- Female Bowler Rule
- Last Batter Rule
- Team Retirement Rule
- Super Over Rule
- Dead Ball Rule
- Maximum Overs Per Bowler Rule

---

## Example

{
  "canBatAlone": true
}

---

## Rule Processing

User Action
↓
Rule Engine Validation
↓
Allowed / Rejected
↓
Scoring Engine

# 12. React Application Architecture

The application is built using:

- React
- TypeScript
- Fluent UI v9
- Power Apps Code Apps

---

## Design Principles

The UI layer is responsible only for:

- Rendering data
- User interaction
- Navigation
- Triggering application actions

The UI layer must not contain business logic.

---

## State Management

State management will use:

- React Context
- React Hooks

Do not introduce:

- Redux
- MobX

unless explicitly approved.

---

## Component Design

Prefer small reusable components.

Examples:

- TournamentCard
- MatchScoreCard
- PlayerSelector
- BatterScoreWidget
- BowlerScoreWidget

Avoid large monolithic screens.

---

## Folder Structure

src/

- pages/
- components/
- hooks/
- context/
- services/
- repositories/
- models/
- utils/
- constants/

---

## Routing

Routing should be feature based.

Examples:

- Tournament Routes
- Match Routes
- Scoring Routes
- Statistics Routes

The application should remain modular and extendable.

# 13. Repository Pattern

Repositories are the only layer allowed to communicate directly with Dataverse.

---

## Purpose

Repositories isolate:

- Dataverse queries
- Dataverse updates
- Dataverse mapping

from business logic and UI logic.

---

## Responsibilities

Repositories:

- Create records
- Read records
- Update records
- Delete records when permitted
- Execute Dataverse queries

Repositories do not implement business rules.

---

## Examples

- TournamentRepository
- TeamRepository
- PlayerRepository
- MatchRepository
- BallEventRepository
- MatchStateRepository
- StatisticsRepository

---

## Architecture Rule

Allowed:

UI
→ Service
→ Repository
→ Dataverse

Not Allowed:

UI
→ Dataverse

UI
→ Web API

UI
→ Repository
→ Business Logic

All Dataverse communication must flow through repositories.

# 14. Service Layer

Services contain application business logic.

Services orchestrate workflows between UI and repositories.

---

## Responsibilities

Services:

- Validate business rules
- Coordinate repositories
- Execute scoring workflows
- Execute rule validation
- Generate projections

Services do not interact directly with the user interface.

---

## Example Services

### RuleEngineService

Responsibilities:

- Validate tournament rules
- Validate scoring actions
- Return rule violations

---

### ScoringService

Responsibilities:

- Process deliveries
- Record Ball Events
- Request projection updates after Ball Events are recorded
- Handle innings transitions

### ProjectionService

Responsibilities:

- Orchestrate projection refreshes
- Coordinate projection rebuilds
- Manage projection refresh workflows
- Rebuild Match State
- Delegate Batter and Bowler Statistics calculations to StatisticsService
- Delegate Tournament Standing calculations to StandingService

---

### StatisticsService

Responsibilities:

- Calculate batter statistics
- Calculate bowler statistics

---

### StandingService

Responsibilities:

- Calculate tournament standings
- Calculate tournament points
- Calculate NRR

---

## Architecture Rule

Allowed:

UI
→ Service
→ Repository
→ Dataverse

Not Allowed:

UI
→ Repository
→ Dataverse

All business logic must remain in services.

# 15. Navigation & Screen Inventory

The application follows a feature-oriented navigation structure.

Navigation should remain simple and optimized for live scoring workflows.

---

## Home

Purpose:

Provide quick access to active tournaments, upcoming matches, and live matches.

Primary Widgets:

- Tournament Summary
- Active Matches
- Upcoming Matches
- Quick Statistics

---

## Tournament Module

### Tournament List

Purpose:

View and search tournaments.

Functions:

- Create Tournament
- Edit Tournament
- Archive Tournament

---

### Tournament Detail

Purpose:

Manage tournament configuration.

Functions:

- View Details
- Manage Teams
- Manage Players
- Manage Rules

---

### Tournament Teams

Purpose:

Manage Tournament Team registrations.

Functions:

- Add Team
- Remove Team
- Assign Group
- Assign Seed

---

### Tournament Players

Purpose:

Manage tournament player registrations.

Functions:

- Add Player
- Assign Team
- Assign Category
- Assign Captain
- Assign Vice Captain

---

### Tournament Rules

Purpose:

Manage configurable tournament rules.

Functions:

- Enable Rules
- Disable Rules
- Maintain Configuration JSON

---

## Match Module

### Match List

Purpose:

View tournament matches.

Functions:

- Create Match
- Edit Match
- View Details

---

### Match Setup

Purpose:

Configure match participants.

Functions:

- Select Team A
- Select Team B
- Schedule Match

---

### Playing XI

Purpose:

Select match players.

Functions:

- Select Playing XI
- Select Captain
- Select Wicket Keeper

---

### Toss

Purpose:

Record toss details.

Functions:

- Toss Winner
- Toss Decision

---

## Scoring Module

### Live Scoring

Purpose:

Record ball-by-ball scoring.

Functions:

- Runs
- Extras
- Wickets
- Free Hit
- Strike Rotation
- New Batter Selection

---

### Over Summary

Purpose:

Review over history.

Functions:

- View Ball Events
- Correct Events
- Undo Events

---

### Scorecard

Purpose:

Display match scorecard.

Contains:

- Batting Statistics
- Bowling Statistics
- Match Summary

---

## Statistics Module

### Batting Statistics

Purpose:

View batting performance.

---

### Bowling Statistics

Purpose:

View bowling performance.

---

### Tournament Leaderboards

Purpose:

Display top performers.

Examples:

- Most Runs
- Most Wickets
- Highest Strike Rate

---

## Standings Module

### Tournament Standings

Purpose:

Display points table.

Contains:

- Matches
- Wins
- Losses
- Points
- Net Run Rate

---

## Administration

Purpose:

Administrative maintenance.

Examples:

- Data Validation
- Rebuild Projections
- Audit Review

# 16. Development Roadmap

Development should follow incremental delivery.

The application should be built in phases.

---

## Phase 1

Foundation

Deliverables:

- Solution Structure
- React Framework
- Dataverse Integration
- Models
- Repositories
- Navigation Shell

Status:

Completed / In Progress

---

## Phase 2

Tournament Module

Deliverables:

- Tournament Management
- Team Registration
- Player Registration
- Tournament Rules

---

## Phase 3

Match Management

Deliverables:

- Match Setup
- Match Scheduling
- Match Lifecycle

---

## Phase 4

Playing XI

Deliverables:

- Playing XI Selection
- Captain Selection
- Wicket Keeper Selection
- Match Player Snapshots

---

## Phase 5

Toss Management

Deliverables:

- Toss Winner
- Toss Decision

---

## Phase 6

Live Scoring MVP

Deliverables:

- Ball Event Creation
- Run Entry
- Extras
- Wickets
- Over Completion
- Innings Completion

---

## Phase 7

Rule Engine

Deliverables:

- Tournament Rule Validation
- Rule Service
- Rule Configuration Processing

---

## Phase 8

Statistics Engine

Deliverables:

- Batter Statistics
- Bowler Statistics
- Projection Rebuild

---

## Phase 9

Tournament Standings

Deliverables:

- Points Calculation
- Net Run Rate
- Standings Projection

---

## Phase 10

Advanced Cricket Features

Potential Features:

- Super Overs
- Rain Rules
- Last Batter Rule
- Tournament Reports
- Advanced Analytics

---

## Go-Live Criteria

The application is ready for production when:

- Ball Event scoring is stable
- Match State projections are stable
- Statistics reconcile correctly
- Standings reconcile correctly
- Historical replay is possible

# 17. Agent Coding Rules

All GitHub Copilot Agent implementations must comply with the following rules.

---

## General Rules

Always:

- Use TypeScript strict mode
- Create reusable components
- Use async/await
- Use strongly typed interfaces
- Follow React best practices

Never:

- Use any
- Bypass repositories
- Hardcode Dataverse identifiers
- Duplicate business logic

---

## Architecture Rules

Allowed:

UI
→ Service
→ Repository
→ Dataverse

Not Allowed:

UI
→ Dataverse

UI
→ Web API

UI
→ Business Logic

---

## Dataverse Rules

Use existing:

promx_*

tables.

Do not create:

crs_*

tables.

Do not create duplicate entities.

---

## Ball Event Rules

Ball Event is the Source of Truth.

Never treat:

- Match State
- Batter Statistics
- Bowler Statistics
- Tournament Standing

as authoritative data.

---

## Projection Rules

Projection tables may be rebuilt.

Projection tables include:

- Match State
- Batter Statistics
- Bowler Statistics
- Tournament Standing

---

## Repository Rules

Repositories own:

- Queries
- CRUD Operations
- Dataverse Mapping

Repositories do not contain business logic.

---

## Service Rules

Services own:

- Scoring Logic
- Rule Validation
- Projection Updates
- Statistics Updates

Services do not contain UI logic.

---

## User Interface Rules

Components should remain focused.

Prefer:

- Small Components
- Reusable Controls
- Composition

Avoid:

- Large Monolithic Screens

---

## Match Player Rules

Match Player records are historical snapshots.

Do not overwrite snapshot values after Match Status becomes Live.

---

## Rule Engine Rules

Tournament Rules are configurable.

Do not hardcode rule values into scoring logic.

Rule evaluation belongs to RuleEngineService.

---

## Architecture Compliance

If code generation conflicts with this document:

This document wins.

Agents must explain any proposed deviation before implementation.

# Agent Validation Checklist

Before generating implementation code, answer the following:

## Architecture Validation

1. Explain why Ball Event is the source of truth.

2. Explain why Match State is a projection.

3. Explain how Undo works without deleting history.

4. Explain how Match Player preserves Playing XI history.

5. Explain why Tournament Rules cannot be hardcoded.

---

## Dataverse Validation

1. Review all promx_* tables.

2. Identify missing required relationships.

3. Identify missing alternate keys.

4. Identify recommended indexes.

5. Validate lookup cardinality.

---

## Implementation Validation

1. Proposed folder structure.

2. Proposed TypeScript models.

3. Proposed Repository contracts.

4. Proposed Service contracts.

5. Proposed React routing structure.

6. Sprint implementation order.

Do not generate code until these questions are answered.