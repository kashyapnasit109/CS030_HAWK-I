import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { 
  LogOut, 
  User, 
  Bell, 
  Clock, 
  X, 
  ShieldAlert, 
  CheckCheck, 
  ExternalLink,
  Trash2
} from "lucide-react";
import { Badge } from "../ui/Badge";
import { Link } from "react-router-dom";

export function TopBar({ title }: { title: string }) {
  const { user, logout } = useAuth();
  const [timeString, setTimeString] = useState("");
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState([
    {
      id: "notif-1",
      title: "Human Intrusion in Restricted Vault",
      time: "Just now",
      zone: "Vault Sector B",
      severity: "critical",
      read: false,
    },
    {
      id: "notif-2",
      title: "Speed Violation Clocked at 84 km/h",
      time: "4 min ago",
      zone: "Loading Bay North",
      severity: "warning",
      read: false,
    },
    {
      id: "notif-3",
      title: "Unregistered Blacklist Plate Flagged",
      time: "22 min ago",
      zone: "Sector 1 Gate",
      severity: "critical",
      read: false,
    },
    {
      id: "notif-4",
      title: "CUDA TensorRT Precision Quantized to FP16",
      time: "1 hour ago",
      zone: "Node Engine Alpha",
      severity: "info",
      read: true,
    },
  ]);

  // Live UTC Clock ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toISOString().replace("T", " ").substring(0, 19) + " UTC"
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close notifications on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    if (isNotificationsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isNotificationsOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  return (
    <header className="sticky top-0 z-30 h-[72px] bg-[#050608]/85 backdrop-blur-2xl border-b border-white/[0.08] flex items-center justify-between px-8 select-none shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
      
      {/* Left: Section Title & Coordinates */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-hawk-sapphire animate-pulse" />
          <h2 className="text-sm font-display font-extrabold text-white tracking-wider uppercase">
            {title}
          </h2>
        </div>

        <span className="hidden lg:inline-block text-[9px] font-mono text-white/30 border-l border-white/10 pl-4 py-0.5 tracking-widest">
          37.7749° N, 122.4194° W
        </span>
      </div>

      {/* Right: Live Clock, Status, Profile & Terminate */}
      <div className="flex items-center gap-4 lg:gap-6 relative">
        
        {/* Live UTC Clock */}
        <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs font-mono text-white/80 tracking-wider">
          <Clock className="h-3.5 w-3.5 text-hawk-sapphire" />
          <span>{timeString}</span>
        </div>

        {/* System Stream Status */}
        <div className="hidden sm:flex items-center gap-2">
          <Badge variant="emerald" size="sm" dot>
            STREAM: 30 FPS
          </Badge>
        </div>

        {/* Interactive Notifications Bell & Flyout Menu */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className={`interactive relative p-2.5 rounded-xl border transition-all outline-none cursor-pointer ${
              isNotificationsOpen
                ? "bg-hawk-sapphire/20 border-hawk-sapphire text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                : "bg-white/[0.03] hover:bg-white/[0.08] border-white/5 text-hawk-muted hover:text-white"
            }`}
            title="Active Security Alerts"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <>
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-hawk-burgundy animate-ping" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-hawk-burgundy shadow-[0_0_8px_rgba(244,63,94,1)]" />
              </>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {isNotificationsOpen && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl bg-[#0B0E17]/95 backdrop-blur-3xl border border-white/[0.12] shadow-[0_20px_60px_rgba(0,0,0,0.9)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              
              {/* Header */}
              <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-hawk-sapphire" />
                  <span className="text-xs font-display font-bold text-white uppercase tracking-wider">
                    Alert Center
                  </span>
                  {unreadCount > 0 && (
                    <span className="text-[9px] font-mono font-bold bg-hawk-burgundy/20 text-hawk-burgundy border border-hawk-burgundy/40 px-1.5 py-0.2 rounded-full">
                      {unreadCount} NEW
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {notifications.length > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-hawk-muted hover:text-white transition-colors text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                      title="Mark all as read"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setIsNotificationsOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-hawk-muted hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Notification List */}
              <div className="max-h-72 overflow-y-auto divide-y divide-white/[0.04] custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-xs font-mono text-hawk-muted space-y-1">
                    <ShieldAlert className="h-6 w-6 text-white/20 mx-auto mb-2" />
                    <p className="text-white font-semibold">All Systems Normal</p>
                    <p className="text-[10px] text-hawk-muted">No pending security or telemetry alerts</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3.5 transition-colors hover:bg-white/[0.03] space-y-1.5 cursor-pointer ${
                        !notif.read ? "bg-hawk-sapphire/[0.04]" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              notif.severity === "critical"
                                ? "bg-hawk-burgundy"
                                : notif.severity === "warning"
                                ? "bg-hawk-amber"
                                : "bg-hawk-sapphire"
                            }`}
                          />
                          <span className="text-xs font-display font-semibold text-white line-clamp-1">
                            {notif.title}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono text-hawk-muted whitespace-nowrap">
                          {notif.time}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-hawk-muted pl-3">
                        <span>{notif.zone}</span>
                        <Badge
                          variant={
                            notif.severity === "critical"
                              ? "burgundy"
                              : notif.severity === "warning"
                              ? "amber"
                              : "neutral"
                          }
                          size="sm"
                        >
                          {notif.severity.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="p-3 border-t border-white/[0.08] bg-black/40 flex items-center justify-between text-xs font-mono">
                  <button
                    onClick={clearAllNotifications}
                    className="text-[10px] text-hawk-muted hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" /> Clear All
                  </button>
                  <Link
                    to="/alerts"
                    onClick={() => setIsNotificationsOpen(false)}
                    className="text-[10px] text-hawk-sapphire hover:text-blue-400 font-bold flex items-center gap-1 transition-colors"
                  >
                    Threat Radar <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}

            </div>
          )}
        </div>

        {/* User Profile Capsule */}
        <div className="flex items-center gap-3 bg-gradient-to-r from-white/[0.03] to-white/[0.01] hover:from-white/[0.06] hover:to-white/[0.03] border border-white/10 rounded-xl px-3.5 py-1.5 transition-all shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
          <div className="flex flex-col items-end">
            <span className="text-xs font-display font-extrabold tracking-wider uppercase text-white">
              {user?.username || "ADMIN"}
            </span>
            <span className="text-[8px] font-mono font-bold tracking-widest uppercase text-hawk-sapphire">
              SECURITY LEVEL 4
            </span>
          </div>
          
          <div className="h-8 w-8 rounded-lg bg-hawk-sapphire/20 border border-hawk-sapphire/40 flex items-center justify-center text-hawk-sapphire">
            <User className="h-4 w-4" />
          </div>
        </div>

        {/* Session Terminate */}
        <button
          onClick={logout}
          className="interactive p-2.5 rounded-xl bg-hawk-burgundy/10 hover:bg-hawk-burgundy/25 border border-hawk-burgundy/30 text-hawk-burgundy hover:text-white transition-all shadow-[0_0_15px_rgba(244,63,94,0.2)] outline-none cursor-pointer"
          title="Terminate Session"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
