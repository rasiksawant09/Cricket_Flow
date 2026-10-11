import {
  ArrowImport24Regular,
  CalendarLtr24Regular,
  DataBarVertical24Regular,
  Home24Regular,
  PeopleTeam24Regular,
  PlayCircle24Regular,
  Settings24Regular,
  Trophy24Regular,
} from "@fluentui/react-icons";
import { Dropdown, Option } from "@fluentui/react-components";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMatchContext } from "../hooks/useMatchContext";
import { useTournamentContext } from "../hooks/useTournamentContext";
import { ROUTE_PATHS, routeFor } from "../routing/routeConstants";

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { matches } = useMatchContext();
  const { tournaments, currentTournament, loadTournament } = useTournamentContext();
  const activeMatch = matches.find((match) => match.statuscode === 796280002 || match.statuscode === 796280005);
  const primaryLinks = [
    { label: "Home", path: ROUTE_PATHS.home, icon: <Home24Regular /> },
    { label: "Tournaments", path: ROUTE_PATHS.tournamentList, icon: <Trophy24Regular /> },
    { label: "Matches", path: ROUTE_PATHS.matchList, icon: <CalendarLtr24Regular /> },
    { label: "Statistics", path: ROUTE_PATHS.statistics, icon: <DataBarVertical24Regular /> },
    { label: "Standings", path: ROUTE_PATHS.standings, icon: <PeopleTeam24Regular /> },
  ];
  const operationsLinks = [
    { label: "Administration", path: ROUTE_PATHS.administration, icon: <Settings24Regular /> },
    { label: "Auction Import", path: ROUTE_PATHS.auctionImport, icon: <ArrowImport24Regular /> },
    { label: "More", path: ROUTE_PATHS.more, icon: <PeopleTeam24Regular /> },
  ];
  const currentLabel = [...primaryLinks, ...operationsLinks].find(({ path }) =>
    path === ROUTE_PATHS.home ? location.pathname === path : location.pathname.startsWith(path),
  )?.label ?? (location.pathname.startsWith("/scoring/") ? "Live Match Center" : "Cricket Flow");

  function openMatchCenter() {
    navigate(activeMatch?.promx_cricketmatchid
      ? routeFor.liveScoring(activeMatch.promx_cricketmatchid)
      : ROUTE_PATHS.matchList);
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-brand" aria-label="Cricket Flow">
          <span className="app-brand-mark">CF</span>
          <span className="app-brand-copy"><strong>Cricket Flow</strong><span>TOURNAMENT OPERATIONS</span></span>
        </div>
        <nav className="app-nav" aria-label="Primary navigation">
          <span className="app-nav-label">Workspace</span>
          {primaryLinks.map(({ label, path, icon }) => (
            <NavLink key={path} to={path} end={path === ROUTE_PATHS.home} className="app-nav-link">
              {icon}<span>{label}</span>
            </NavLink>
          ))}
          <button className="app-nav-link" type="button" onClick={openMatchCenter} aria-current={location.pathname.startsWith("/scoring/") ? "page" : undefined}>
            <PlayCircle24Regular /><span>Live Match Center</span>
          </button>
          <span className="app-nav-label">Manage</span>
          {operationsLinks.map(({ label, path, icon }) => (
            <NavLink key={path} to={path} className="app-nav-link">
              {icon}<span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="app-sidebar-footer">Match day, made clear.<br />One source for every score.</div>
      </aside>
      <div className="app-workspace">
        <header className="app-topbar">
          <div>
            <div className="app-breadcrumb">CRICKET FLOW / WORKSPACE</div>
            <div className="app-topbar-title">{currentLabel}</div>
          </div>
          <div className="app-topbar-actions">
            {tournaments.length > 0 && (
              <Dropdown
                className="app-tournament-picker"
                aria-label="Selected tournament"
                placeholder="Select tournament"
                value={currentTournament?.promx_tournamentname ?? "Select tournament"}
                selectedOptions={currentTournament?.promx_crickettournamentid ? [currentTournament.promx_crickettournamentid] : []}
                onOptionSelect={(_, data) => {
                  if (data.optionValue) void loadTournament(data.optionValue);
                }}
              >
                {tournaments.flatMap((tournament) => tournament.promx_crickettournamentid ? [
                  <Option key={tournament.promx_crickettournamentid} value={tournament.promx_crickettournamentid}>
                    {tournament.promx_tournamentname}
                  </Option>,
                ] : [])}
              </Dropdown>
            )}
            <span className="app-user-mark" aria-label="Cricket Flow user">CF</span>
          </div>
        </header>
        <div className="app-content"><Outlet /></div>
      </div>
    </div>
  );
}