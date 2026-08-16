import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Search,
  Car,
  MapPin,
  BarChart3,
  Settings,
  ScanLine,
  Gauge,
  Boxes,
  ShieldAlert,
  LogIn,
  Video,
  Radio,
} from "lucide-react";
import { Logo } from "../ui/Logo";

interface NavItem {
  path: string;
  label: string;
  icon: any;
  alert?: boolean;
  tag?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "Core Operations",
    items: [
      { path: "/", label: "Command Center", icon: LayoutDashboard },
      { path: "/live", label: "Live Camera Matrix", icon: Video },
      { path: "/search", label: "Semantic Search", icon: Search },
    ],
  },
  {
    title: "Threat & Telemetry",
    items: [
      { path: "/alerts", label: "Threat Radar", icon: ShieldAlert, alert: true },
      { path: "/vehicles", label: "Vehicle Registry", icon: Car },
      { path: "/zones", label: "Zone Topography", icon: MapPin },
      { path: "/analytics", label: "Analytics Hub", icon: BarChart3 },
    ],
  },
  {
    title: "Vision Neural Benches",
    items: [
      { path: "/modules/anpr", label: "ANPR Engine", icon: ScanLine, tag: "OCR" },
      { path: "/modules/velocity", label: "Velocity Tracking", icon: Gauge, tag: "SPD" },
      { path: "/modules/misplacement", label: "Object Detection", icon: Boxes, tag: "SPATIAL" },
      { path: "/modules/threat", label: "Threat Matrix", icon: ShieldAlert, tag: "YOLO" },
      { path: "/modules/entry", label: "Access Control", icon: LogIn, tag: "GATE" },
    ],
  },
];

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 w-[275px] bg-gradient-to-b from-[#090C16]/98 via-[#060810]/98 to-[#04050A]/98 backdrop-blur-3xl border-r border-white/[0.08] z-40 flex flex-col justify-between select-none shadow-[25px_0_60px_rgba(0,0,0,0.85)]">
      
      {/* Prominent Brand Header */}
      <div>
        <div className="px-5 py-5 border-b border-white/[0.08] bg-gradient-to-r from-white/[0.03] to-transparent">
          <NavLink to="/" className="flex items-center gap-3.5 group cursor-pointer outline-none">
            
            {/* Enlarged 3D Iridescent Orb with Glowing Ambient Aura */}
            <div className="relative group/orb shrink-0">
              <div className="relative flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                <div className="absolute inset-0 bg-hawk-sapphire/35 rounded-full blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <Logo size={46} showWordmark={false} />
              </div>
            </div>
            
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base font-display font-black text-white tracking-[0.16em] uppercase group-hover:text-hawk-sapphire transition-colors duration-300">
                  HAWK-I
                </span>
                <span className="text-[8.5px] font-mono font-bold bg-hawk-sapphire/20 text-hawk-sapphire border border-hawk-sapphire/40 px-1.5 py-0.5 rounded-full">
                  v2.4
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-hawk-emerald opacity-75"></span>
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-hawk-emerald"></span>
                </span>
                <span className="text-[8.5px] font-mono tracking-widest text-hawk-emerald font-bold uppercase">
                  VISION ONLINE
                </span>
              </div>
            </div>
          </NavLink>
        </div>

        {/* Navigation Sections with Balanced Vertical Spacing */}
        <nav className="overflow-y-auto overflow-x-hidden scrollbar-none py-5 px-3 space-y-5 max-h-[calc(100vh-160px)] custom-scrollbar">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1.5">
              <div className="px-3 mb-1.5 flex items-center justify-between">
                <h3 className="text-[9.5px] font-mono font-bold tracking-[0.2em] text-hawk-muted uppercase">
                  {group.title}
                </h3>
              </div>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        className={({ isActive }) =>
                          `interactive group relative flex items-center justify-between rounded-xl px-3.5 py-2.5 transition-all duration-200 outline-none ${
                            isActive
                              ? "bg-gradient-to-r from-hawk-sapphire/25 to-hawk-sapphire/10 text-white border border-hawk-sapphire/50 shadow-[0_0_25px_rgba(59,130,246,0.25)]"
                              : "text-hawk-muted hover:text-white hover:bg-white/[0.04] border border-transparent"
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && (
                              <motion.div
                                layoutId="activeNavTab"
                                className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-hawk-sapphire shadow-[0_0_10px_rgba(59,130,246,1)]"
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                              />
                            )}
                            
                            <div className="flex items-center gap-3 min-w-0">
                              <Icon 
                                className={`h-4.5 w-4.5 shrink-0 transition-colors duration-200 ${
                                  isActive ? "text-hawk-sapphire" : "text-hawk-muted group-hover:text-white"
                                }`} 
                                strokeWidth={isActive ? 2.2 : 1.8} 
                              />
                              <span className="text-xs font-display font-semibold tracking-wide truncate">
                                {item.label}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {item.alert && (
                                <span className="h-2 w-2 rounded-full bg-hawk-burgundy animate-pulse shadow-[0_0_8px_rgba(244,63,94,1)]" />
                              )}
                              {item.tag && (
                                <span className="text-[8.5px] font-mono font-bold text-white/60 group-hover:text-white bg-white/[0.06] px-1.5 py-0.5 rounded border border-white/10">
                                  {item.tag}
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer System Status & Settings */}
      <div className="p-3 border-t border-white/[0.08] bg-[#05060A]/90 space-y-1.5">
        <div className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="h-3.5 w-3.5 text-hawk-sapphire animate-pulse" />
            <span className="text-[9px] font-mono text-white/80 font-bold uppercase">YOLOv8 Engine</span>
          </div>
          <span className="text-[8.5px] font-mono text-hawk-emerald font-bold bg-hawk-emerald/10 border border-hawk-emerald/20 px-2 py-0.5 rounded">14.2ms</span>
        </div>
        
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `interactive group flex items-center gap-3 rounded-xl px-3 py-2 transition-all outline-none ${
              isActive
                ? "bg-white/15 text-white"
                : "text-hawk-muted hover:text-white hover:bg-white/[0.04]"
            }`
          }
        >
          <Settings className="h-4.5 w-4.5 group-hover:rotate-45 transition-transform duration-300" />
          <span className="text-xs font-display font-bold uppercase tracking-wider">System Settings</span>
        </NavLink>
      </div>
    </aside>
  );
}
