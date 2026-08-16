import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { Atmosphere } from "./Atmosphere";
import { CommandPalette } from "../ui/CommandPalette";

// Title map for routes
const routeTitles: Record<string, string> = {
  "/": "Command Center",
  "/live": "Live Camera Matrix",
  "/search": "Semantic Search",
  "/alerts": "Threat Radar & Triage",
  "/vehicles": "Vehicle Registry",
  "/zones": "Zone Topography",
  "/analytics": "Analytics Hub",
  "/settings": "System Settings",
  "/modules/anpr": "ANPR Engine Bench",
  "/modules/velocity": "Velocity & Trajectory Bench",
  "/modules/misplacement": "Spatial Object Anomaly Bench",
  "/modules/threat": "Perimeter & Weapon Threat Bench",
  "/modules/entry": "Access Control Temporal Bench",
};

export function AppShell() {
  const location = useLocation();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Global Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const getTitle = () => {
    if (location.pathname.startsWith("/events/")) {
      return "Forensic Event Audit";
    }
    return routeTitles[location.pathname] || "Surveillance Platform";
  };

  return (
    <div className="relative min-h-screen bg-[#050608] text-[#F3F4F6] flex overflow-x-hidden font-sans">
      {/* Ambient Lighting & Particle Atmosphere */}
      <Atmosphere />

      {/* Global Command Launcher */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      {/* Sleek Navigation Dock */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 ml-[270px] relative z-10">
        <TopBar title={getTitle()} />
        <main className="flex-1 px-8 lg:px-12 py-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
