import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

/** Map route paths to page titles */
const pageTitles: Record<string, string> = {
  "/": "Command Center",
  "/live": "Live View",
  "/modules": "Modules",
  "/modules/anpr": "ANPR Test Bench",
  "/search": "Search",
  "/alerts": "Alerts",
  "/vehicles": "Vehicle Log",
  "/zones": "Zones & Cameras",
  "/analytics": "Analytics",
  "/settings": "Settings",
};

export function AppShell() {
  const location = useLocation();

  const title =
    pageTitles[location.pathname] ??
    (location.pathname.startsWith("/modules/")
      ? "Module Detail"
      : location.pathname.startsWith("/events")
        ? "Event Detail"
        : "Hawk-I Intelligence");

  return (
    <div className="relative flex min-h-screen bg-hawk-bg">
      {/* Agex Top Vertical Spotlight Beam & Liquid Atmosphere */}
      <div className="hawk-atmosphere">
        <div className="hawk-spotlight-beam" />
        <div className="hawk-aura hawk-aura--blue" />
        <div className="hawk-aura hawk-aura--violet" />
        <div className="hawk-aura hawk-aura--crimson" />
      </div>

      <Sidebar />

      {/* Main content area — offset by sidebar width */}
      <div className="relative z-10 ml-64 flex flex-1 flex-col">
        <TopBar title={title} />
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
