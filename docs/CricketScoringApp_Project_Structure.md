# Cricket Scoring App Project Structure

This document proposes folders and file inventories for the existing Cricket Scoring App architecture. It follows the Master Architecture, Implementation Guide, Domain Models, Repository Design, Repository Contracts, and Service Design. It introduces no Dataverse tables or columns and defines no implementation code. The current `src/App.tsx`, `src/main.tsx`, `src/App.css`, `src/index.css`, and `src/assets/` remain the application entry and existing root-level files.

## 1. Folder Structure

```text
Cricket_Flow/
├── docs/
│   ├── CricketScoringApp_Master_Architecture.md
│   ├── CricketScoringApp_Implementation_Guide.md
│   ├── CricketScoringApp_Domain_Models.md
│   ├── CricketScoringApp_Repository_Design.md
│   ├── CricketScoringApp_Repository_Contracts.md
│   ├── CricketScoringApp_Service_Design.md
│   └── CricketScoringApp_Project_Structure.md
├── public/
├── src/
│   ├── App.tsx
│   ├── App.css
│   ├── main.tsx
│   ├── index.css
│   ├── app/
│   ├── pages/
│   ├── components/
│   ├── hooks/
│   ├── context/
│   ├── services/
│   │   ├── interfaces/
│   │   └── implementations/
│   ├── repositories/
│   │   ├── interfaces/
│   │   └── implementations/
│   ├── models/
│   ├── mappers/
│   ├── constants/
│   ├── utils/
│   ├── types/
│   ├── routing/
│   └── assets/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── power.config.json
```

The `services/` and `repositories/` subfolders separate contracts from their concrete classes while retaining the documented UI → Service → Repository → Dataverse layers. The root bootstrap files are shown where they currently exist; the `app/` folder is available for application-level composition defined by the Implementation Guide.

## 2. File Structure

```text
src/
├── App.tsx
├── App.css
├── main.tsx
├── index.css
├── app/
│   └── [application composition files as required]
├── pages/
│   ├── HomeScreen.tsx
│   ├── AdministrationScreen.tsx
│   ├── tournaments/
│   │   ├── TournamentDetailScreen.tsx
│   │   ├── TournamentLeaderboardsScreen.tsx
│   │   ├── TournamentListScreen.tsx
│   │   ├── TournamentPlayersScreen.tsx
│   │   ├── TournamentRulesScreen.tsx
│   │   ├── TournamentStandingsScreen.tsx
│   │   └── TournamentTeamsScreen.tsx
│   ├── matches/
│   │   ├── LiveScoringScreen.tsx
│   │   ├── MatchDetailScreen.tsx
│   │   ├── MatchListScreen.tsx
│   │   ├── MatchSetupScreen.tsx
│   │   ├── OverSummaryScreen.tsx
│   │   ├── PlayingXIScreen.tsx
│   │   ├── ScorecardScreen.tsx
│   │   └── TossScreen.tsx
│   └── statistics/
│       ├── BattingStatisticsScreen.tsx
│       └── BowlingStatisticsScreen.tsx
├── components/
│   └── [reusable feature components]
├── hooks/
│   └── [service-backed application hooks]
├── context/
│   ├── TournamentContext.tsx
│   ├── MatchContext.tsx
│   └── ScoringContext.tsx
├── services/
│   ├── interfaces/
│   └── implementations/
├── repositories/
│   ├── interfaces/
│   └── implementations/
├── models/
├── mappers/
│   └── [Dataverse-to-model and model-to-Dataverse mappings]
├── constants/
├── utils/
├── types/
├── routing/
│   ├── AppRoutes.tsx
│   ├── TournamentRoutes.tsx
│   ├── MatchRoutes.tsx
│   ├── ScoringRoutes.tsx
│   ├── StatisticsRoutes.tsx
│   └── StandingRoutes.tsx
└── assets/
```

Bracketed entries describe folder contents, not required files. The file inventory below specifies the domain-facing interfaces and repository/service classes.

## 3. TypeScript Model File Inventory

One model file maps to each existing Dataverse table. `DataverseRecord.ts` contains the shared platform-column model already defined by Domain Models; it does not represent a Dataverse table.

| File | Model | Dataverse table |
|---|---|---|
| `models/DataverseRecord.ts` | `DataverseRecord` | Shared platform columns; no table |
| `models/CricketTournament.ts` | `CricketTournament` | `promx_crickettournament` |
| `models/CricketTeam.ts` | `CricketTeam` | `promx_cricketteam` |
| `models/CricketPlayer.ts` | `CricketPlayer` | `promx_cricketplayer` |
| `models/CricketTournamentTeam.ts` | `CricketTournamentTeam` | `promx_crickettournamentteam` |
| `models/CricketTournamentPlayer.ts` | `CricketTournamentPlayer` | `promx_crickettournamentplayer` |
| `models/CricketMatch.ts` | `CricketMatch` | `promx_cricketmatch` |
| `models/CricketMatchPlayer.ts` | `CricketMatchPlayer` | `promx_cricketmatchplayer` |
| `models/CricketInnings.ts` | `CricketInnings` | `promx_cricketinnings` |
| `models/CricketOver.ts` | `CricketOver` | `promx_cricketover` |
| `models/CricketBallEvent.ts` | `CricketBallEvent` | `promx_cricketballevent` |
| `models/CricketMatchState.ts` | `CricketMatchState` | `promx_cricketmatchstate` |
| `models/CricketBatterStatistic.ts` | `CricketBatterStatistic` | `promx_cricketbatterstatistic` |
| `models/CricketBowlerStatistic.ts` | `CricketBowlerStatistic` | `promx_cricketbowlerstatistic` |
| `models/CricketTournamentRule.ts` | `CricketTournamentRule` | `promx_crickettournamentrule` |
| `models/CricketTournamentStanding.ts` | `CricketTournamentStanding` | `promx_crickettournamentstanding` |

## 4. Repository Interface File Inventory

Each interface maps to one existing Dataverse table and the model listed above. Statistic repository names use the canonical singular interface names from Repository Contracts.

| File | Interface | Dataverse table |
|---|---|---|
| `repositories/interfaces/ITournamentRepository.ts` | `ITournamentRepository` | `promx_crickettournament` |
| `repositories/interfaces/ITeamRepository.ts` | `ITeamRepository` | `promx_cricketteam` |
| `repositories/interfaces/IPlayerRepository.ts` | `IPlayerRepository` | `promx_cricketplayer` |
| `repositories/interfaces/ITournamentTeamRepository.ts` | `ITournamentTeamRepository` | `promx_crickettournamentteam` |
| `repositories/interfaces/ITournamentPlayerRepository.ts` | `ITournamentPlayerRepository` | `promx_crickettournamentplayer` |
| `repositories/interfaces/IMatchRepository.ts` | `IMatchRepository` | `promx_cricketmatch` |
| `repositories/interfaces/IMatchPlayerRepository.ts` | `IMatchPlayerRepository` | `promx_cricketmatchplayer` |
| `repositories/interfaces/IInningsRepository.ts` | `IInningsRepository` | `promx_cricketinnings` |
| `repositories/interfaces/IOverRepository.ts` | `IOverRepository` | `promx_cricketover` |
| `repositories/interfaces/IBallEventRepository.ts` | `IBallEventRepository` | `promx_cricketballevent` |
| `repositories/interfaces/IMatchStateRepository.ts` | `IMatchStateRepository` | `promx_cricketmatchstate` |
| `repositories/interfaces/IBatterStatisticRepository.ts` | `IBatterStatisticRepository` | `promx_cricketbatterstatistic` |
| `repositories/interfaces/IBowlerStatisticRepository.ts` | `IBowlerStatisticRepository` | `promx_cricketbowlerstatistic` |
| `repositories/interfaces/ITournamentRuleRepository.ts` | `ITournamentRuleRepository` | `promx_crickettournamentrule` |
| `repositories/interfaces/ITournamentStandingRepository.ts` | `ITournamentStandingRepository` | `promx_crickettournamentstanding` |

## 5. Repository Implementation File Inventory

Each implementation corresponds to one interface in Section 4. Implementations perform Dataverse queries, persistence, paging, and model mapping only. They do not call other repositories or contain business/scoring calculations.

| File | Implements | Dataverse table |
|---|---|---|
| `repositories/implementations/TournamentRepository.ts` | `ITournamentRepository` | `promx_crickettournament` |
| `repositories/implementations/TeamRepository.ts` | `ITeamRepository` | `promx_cricketteam` |
| `repositories/implementations/PlayerRepository.ts` | `IPlayerRepository` | `promx_cricketplayer` |
| `repositories/implementations/TournamentTeamRepository.ts` | `ITournamentTeamRepository` | `promx_crickettournamentteam` |
| `repositories/implementations/TournamentPlayerRepository.ts` | `ITournamentPlayerRepository` | `promx_crickettournamentplayer` |
| `repositories/implementations/MatchRepository.ts` | `IMatchRepository` | `promx_cricketmatch` |
| `repositories/implementations/MatchPlayerRepository.ts` | `IMatchPlayerRepository` | `promx_cricketmatchplayer` |
| `repositories/implementations/InningsRepository.ts` | `IInningsRepository` | `promx_cricketinnings` |
| `repositories/implementations/OverRepository.ts` | `IOverRepository` | `promx_cricketover` |
| `repositories/implementations/BallEventRepository.ts` | `IBallEventRepository` | `promx_cricketballevent` |
| `repositories/implementations/MatchStateRepository.ts` | `IMatchStateRepository` | `promx_cricketmatchstate` |
| `repositories/implementations/BatterStatisticRepository.ts` | `IBatterStatisticRepository` | `promx_cricketbatterstatistic` |
| `repositories/implementations/BowlerStatisticRepository.ts` | `IBowlerStatisticRepository` | `promx_cricketbowlerstatistic` |
| `repositories/implementations/TournamentRuleRepository.ts` | `ITournamentRuleRepository` | `promx_crickettournamentrule` |
| `repositories/implementations/TournamentStandingRepository.ts` | `ITournamentStandingRepository` | `promx_crickettournamentstanding` |

## 6. Service Interface File Inventory

These interfaces correspond only to services already defined in Service Design. They add no services.

| File | Existing service contract |
|---|---|
| `services/interfaces/ITournamentService.ts` | TournamentService |
| `services/interfaces/ITeamService.ts` | TeamService |
| `services/interfaces/IPlayerService.ts` | PlayerService |
| `services/interfaces/ITournamentRegistrationService.ts` | TournamentRegistrationService |
| `services/interfaces/IMatchService.ts` | MatchService |
| `services/interfaces/IPlayingXIService.ts` | PlayingXIService |
| `services/interfaces/ITossService.ts` | TossService |
| `services/interfaces/IRuleEngineService.ts` | RuleEngineService |
| `services/interfaces/IScoringService.ts` | ScoringService |
| `services/interfaces/IProjectionService.ts` | ProjectionService |
| `services/interfaces/IStatisticsService.ts` | StatisticsService |
| `services/interfaces/IStandingService.ts` | StandingService |
| `services/interfaces/IUndoService.ts` | UndoService |

## 7. Service Implementation File Inventory

Each implementation corresponds to one service already defined in Service Design. Service implementations own business workflows and may coordinate existing services and repository interfaces; they do not access Dataverse directly.

| File | Implements |
|---|---|
| `services/implementations/TournamentService.ts` | `ITournamentService` |
| `services/implementations/TeamService.ts` | `ITeamService` |
| `services/implementations/PlayerService.ts` | `IPlayerService` |
| `services/implementations/TournamentRegistrationService.ts` | `ITournamentRegistrationService` |
| `services/implementations/MatchService.ts` | `IMatchService` |
| `services/implementations/PlayingXIService.ts` | `IPlayingXIService` |
| `services/implementations/TossService.ts` | `ITossService` |
| `services/implementations/RuleEngineService.ts` | `IRuleEngineService` |
| `services/implementations/ScoringService.ts` | `IScoringService` |
| `services/implementations/ProjectionService.ts` | `IProjectionService` |
| `services/implementations/StatisticsService.ts` | `IStatisticsService` |
| `services/implementations/StandingService.ts` | `IStandingService` |
| `services/implementations/UndoService.ts` | `IUndoService` |

## 8. React Context File Inventory

The Implementation Guide identifies three shared contexts. Contexts hold UI/application state and call services; they do not access Dataverse or contain business rules.

| File | Context |
|---|---|
| `context/TournamentContext.tsx` | TournamentContext |
| `context/MatchContext.tsx` | MatchContext |
| `context/ScoringContext.tsx` | ScoringContext |

## 9. Routing File Inventory

Routing remains feature-based as described by the Master Architecture and Implementation Guide. These files represent the documented route groups and screens; they do not change the existing route set.

| File | Documented route responsibility |
|---|---|
| `routing/AppRoutes.tsx` | Application route composition and home route `/` |
| `routing/TournamentRoutes.tsx` | `/tournaments`, `/tournaments/:id` |
| `routing/MatchRoutes.tsx` | `/matches`, `/matches/:id`, `/matches/:id/playing-xi`, `/matches/:id/toss` |
| `routing/ScoringRoutes.tsx` | `/scoring/:id` |
| `routing/StatisticsRoutes.tsx` | `/statistics` |
| `routing/StandingRoutes.tsx` | `/standings` |
