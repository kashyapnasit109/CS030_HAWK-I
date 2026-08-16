import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search, 
  Video, 
  LayoutDashboard, 
  ShieldAlert, 
  Car, 
  MapPin, 
  BarChart3, 
  Settings, 
  ScanLine, 
  Gauge, 
  Boxes, 
  LogIn, 
  ArrowRight
} from "lucide-react";

interface GlobalCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ActionItem {
  id: string;
  title: string;
  category: "Navigation" | "Vision Benches" | "Operations" | "Actions";
  icon: any;
  shortcut?: string;
  action: () => void;
  keywords?: string[];
}

export function CommandPalette({ isOpen, onClose }: GlobalCommandPaletteProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const actions: ActionItem[] = [
    {
      id: "nav-dashboard",
      title: "Mission Control Center",
      category: "Navigation",
      icon: LayoutDashboard,
      shortcut: "1",
      action: () => { navigate("/"); onClose(); },
      keywords: ["home", "dashboard", "overview", "matrix"]
    },
    {
      id: "nav-live",
      title: "Live Surveillance Matrix (CCTV)",
      category: "Navigation",
      icon: Video,
      shortcut: "2",
      action: () => { navigate("/live"); onClose(); },
      keywords: ["cctv", "camera", "stream", "live", "rtsp"]
    },
    {
      id: "nav-search",
      title: "Semantic Intelligence Search",
      category: "Navigation",
      icon: Search,
      shortcut: "3",
      action: () => { navigate("/search"); onClose(); },
      keywords: ["nlp", "vector", "query", "find", "events"]
    },
    {
      id: "nav-alerts",
      title: "Threat Radar & Incident Log",
      category: "Navigation",
      icon: ShieldAlert,
      shortcut: "4",
      action: () => { navigate("/alerts"); onClose(); },
      keywords: ["threats", "incidents", "critical", "radar", "alarms"]
    },
    {
      id: "nav-vehicles",
      title: "Vehicle Registry & ANPR Database",
      category: "Navigation",
      icon: Car,
      action: () => { navigate("/vehicles"); onClose(); },
      keywords: ["cars", "plates", "license", "registry", "whitelist", "blacklist"]
    },
    {
      id: "nav-zones",
      title: "Zone Topography & Geospatial Mapping",
      category: "Navigation",
      icon: MapPin,
      action: () => { navigate("/zones"); onClose(); },
      keywords: ["map", "topology", "sectors", "cameras", "locations"]
    },
    {
      id: "nav-analytics",
      title: "Operational Analytics Hub",
      category: "Navigation",
      icon: BarChart3,
      action: () => { navigate("/analytics"); onClose(); },
      keywords: ["stats", "accuracy", "latency", "volume", "charts"]
    },
    {
      id: "nav-settings",
      title: "System Configuration & API Settings",
      category: "Navigation",
      icon: Settings,
      action: () => { navigate("/settings"); onClose(); },
      keywords: ["config", "cuda", "tensorrt", "thresholds", "webhooks"]
    },
    {
      id: "bench-anpr",
      title: "Launch ANPR Vision Engine Bench",
      category: "Vision Benches",
      icon: ScanLine,
      action: () => { navigate("/modules/anpr"); onClose(); },
      keywords: ["ocr", "number plate", "plate recognition", "yolo"]
    },
    {
      id: "bench-velocity",
      title: "Launch Velocity & Trajectory Bench",
      category: "Vision Benches",
      icon: Gauge,
      action: () => { navigate("/modules/velocity"); onClose(); },
      keywords: ["speed", "bytetrack", "kmh", "calibration", "radar"]
    },
    {
      id: "bench-misplacement",
      title: "Launch Spatial Object Misplacement Bench",
      category: "Vision Benches",
      icon: Boxes,
      action: () => { navigate("/modules/misplacement"); onClose(); },
      keywords: ["background differencing", "missing", "unattended", "bag"]
    },
    {
      id: "bench-threat",
      title: "Launch Threat & Intrusion Polygon Bench",
      category: "Vision Benches",
      icon: ShieldAlert,
      action: () => { navigate("/modules/threat"); onClose(); },
      keywords: ["weapons", "intrusion", "polygon", "breach", "loitering"]
    },
    {
      id: "bench-entry",
      title: "Launch Access Control Correlation Bench",
      category: "Vision Benches",
      icon: LogIn,
      action: () => { navigate("/modules/entry"); onClose(); },
      keywords: ["gate", "interior", "tailgating", "unauthorized"]
    }
  ];

  const filteredActions = actions.filter((a) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q) ||
      a.keywords?.some((k) => k.toLowerCase().includes(q))
    );
  });

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredActions.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredActions.length) % Math.max(1, filteredActions.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredActions[selectedIndex]) {
        filteredActions[selectedIndex].action();
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start justify-center pt-24 px-4 select-none animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-[#090B10] border border-white/15 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-hawk-sapphire via-hawk-emerald to-hawk-sapphire opacity-70" />

        {/* Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-white/[0.08] gap-3">
          <Search className="h-5 w-5 text-hawk-sapphire shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="Type a command, camera, module, or search query..."
            className="flex-1 bg-transparent text-white font-mono text-sm outline-none placeholder:text-white/30"
          />
          <span className="text-[9px] font-mono text-white/40 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {filteredActions.length === 0 ? (
            <div className="py-12 text-center text-white/40 font-mono text-xs">
              No instrument actions matched "{query}"
            </div>
          ) : (
            filteredActions.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? "bg-hawk-sapphire/20 border border-hawk-sapphire/40 text-white shadow-[0_0_12px_rgba(59,130,246,0.2)]"
                      : "text-white/70 hover:text-white hover:bg-white/[0.03] border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${isSelected ? "bg-hawk-sapphire text-white" : "bg-white/5 text-hawk-muted"}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-mono font-bold block">{item.title}</span>
                      <span className="text-[9px] font-mono text-white/40">{item.category}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.shortcut && (
                      <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono text-white/60">
                        {item.shortcut}
                      </kbd>
                    )}
                    <ArrowRight className={`h-3.5 w-3.5 ${isSelected ? "text-hawk-sapphire translate-x-0.5" : "text-white/20"} transition-transform`} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hint */}
        <div className="p-3 bg-[#050608] border-t border-white/[0.06] flex items-center justify-between text-[9px] font-mono text-white/40">
          <div className="flex items-center gap-3">
            <span><strong className="text-white/70">&uarr;&darr;</strong> Navigate</span>
            <span><strong className="text-white/70">&crarr;</strong> Execute</span>
          </div>
          <span>HAWK-I INSTRUMENT COMMANDER</span>
        </div>
      </div>
    </div>
  );
}
