import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Video,
  Search,
  Bell,
  Car,
  MapPin,
  BarChart3,
  Settings,
  ScanLine,
  Gauge,
  Boxes,
} from "lucide-react";
import { Logo } from "../ui/Logo";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/live", icon: Video, label: "Live View" },
  { to: "/modules/anpr", icon: ScanLine, label: "ANPR Module" },
  { to: "/modules/velocity", icon: Gauge, label: "Velocity Module" },
  { to: "/modules/misplacement", icon: Boxes, label: "Misplacement" },
  { to: "/search", icon: Search, label: "Search" },
  { to: "/alerts", icon: Bell, label: "Alerts" },
  { to: "/vehicles", icon: Car, label: "Vehicle Log" },
  { to: "/zones", icon: MapPin, label: "Zones & Cameras" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/settings", icon: Settings, label: "Settings" },
] as const;

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 z-40 flex w-64 flex-col border-r border-white/[0.08] bg-[#020306]/90 backdrop-blur-2xl">
      {/* Brand Logo Header — HAWK-I */}
      <div className="px-6 py-6">
        <Logo size={42} showWordmark />
      </div>

      {/* Specular Divider */}
      <div className="mx-5 border-t border-white/[0.08]" />

      {/* Navigation Links (Agex Active Pill Style) */}
      <nav className="mt-4 flex flex-1 flex-col gap-1 px-3.5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `group flex items-center gap-3.5 px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? "hawk-sidebar-active text-white font-bold"
                  : "rounded-xl text-hawk-muted hover:bg-white/[0.04] hover:text-white"
              }`
            }
          >
            <Icon className="h-5 w-5 shrink-0" strokeWidth={1.8} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer System Status */}
      <div className="mx-5 border-t border-white/[0.08]" />
      <div className="px-6 py-4.5">
        <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 backdrop-blur-md">
          <span className="hawk-dot hawk-dot--emerald" />
          <span className="text-xs font-bold text-hawk-muted">Hawk Engine Active</span>
        </div>
      </div>
    </aside>
  );
}
