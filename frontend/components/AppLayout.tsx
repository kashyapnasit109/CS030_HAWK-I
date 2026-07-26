"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import {
  DashboardIcon,
  UploadIcon,
  SearchIcon,
  ResultsIcon,
  CameraIcon,
  LiveIcon,
  FolderIcon,
  AlertIcon,
  SettingsIcon,
  ShieldIcon,
  EyeIcon,
  BellIcon,
  WarningIcon,
  LockIcon,
  SignalIcon,
  TrendingUpIcon,
  CheckIcon
} from "./Icons";

interface NavItem {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  roles: string[];
}

const monitorItems: NavItem[] = [
  { href: "/",         icon: DashboardIcon, label: "Dashboard",   roles: ["admin", "supervisor", "investigator", "operator"] },
  { href: "/analytics",icon: ResultsIcon,   label: "VMS Analytics", roles: ["admin", "supervisor", "investigator", "operator"] },
  { href: "/live",     icon: LiveIcon,      label: "Live Wall",   roles: ["admin", "supervisor", "operator"] },
  { href: "/playback", icon: CameraIcon,    label: "Recordings",  roles: ["admin", "supervisor", "operator"] },
  { href: "/cameras",  icon: CameraIcon,    label: "CCTV Streams", roles: ["admin", "supervisor", "investigator", "operator"] },
];

const investigateItems: NavItem[] = [
  { href: "/cases",     icon: FolderIcon,    label: "Cases",            roles: ["admin", "supervisor", "investigator"] },
  { href: "/upload",    icon: UploadIcon,    label: "Batch Ingestion",   roles: ["admin", "supervisor", "investigator"] },
  { href: "/search",    icon: SearchIcon,    label: "AI Search",        roles: ["admin", "supervisor", "investigator"] },
  { href: "/results",   icon: ResultsIcon,   label: "Results",          roles: ["admin", "supervisor", "investigator", "operator"] },
  { href: "/watchlists",icon: AlertIcon,     label: "Watchlists",       roles: ["admin", "supervisor", "investigator"] },
];

const systemItems: NavItem[] = [
  { href: "/settings",  icon: SettingsIcon,  label: "Settings",         roles: ["admin", "supervisor"] },
  { href: "/audit",     icon: ShieldIcon,    label: "Audit Trail",      roles: ["admin", "auditor"] },
  { href: "/verify",    icon: ShieldIcon,    label: "Verify PDF",       roles: ["admin", "auditor", "supervisor", "investigator", "operator"] },
  { href: "/investors", icon: TrendingUpIcon, label: "Investor Deck",    roles: ["admin", "supervisor"] },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  interface CaseInfo {
    case_id: number;
    case_number: string;
    title: string;
    status: string;
  }

  interface BgJob {
    id: string;
    type: string;
    query: string;
    timestamp: string;
    videosCount: number;
    status: "queued" | "running" | "completed" | "failed";
    match_count: number;
    frames_processed?: number;
    frames_matched?: number;
    error?: string;
  }

  interface LiveAlert {
    id: string;
    camera_id: string;
    camera_name: string;
    timestamp: number;
    timestamp_str: string;
    detections: Array<{ type: string; label: string; confidence: number }>;
    snapshot_url: string;
  }

  const [activeCase, setActiveCase] = useState("FIR/2026/012");
  const [activeCaseId, setActiveCaseId] = useState<string>("");
  const [cases, setCases] = useState<CaseInfo[]>([]);
  const [alertsCount, setAlertsCount] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Background Tasks & Notifications states
  const [bgJobs, setBgJobs] = useState<BgJob[]>([]);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [completedJobPopup, setCompletedJobPopup] = useState<BgJob | null>(null);
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ username: string; name: string; role: string } | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupRole, setSignupRole] = useState("operator");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);

  // Check auth on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("visioncctv_token");
    const savedUser = localStorage.getItem("visioncctv_user");
    if (savedToken && savedUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Shortcut listener for Cmd/Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Load dynamic cases
  useEffect(() => {
    if (!isAuthenticated) return;
    async function load() {
      try {
        const data = await apiFetch<{ cases: CaseInfo[]; count: number }>("/api/cases/list");
        setCases(data.cases || []);
        
        const savedId = localStorage.getItem("visioncctv_active_case_id");
        if (savedId) {
          setActiveCaseId(savedId);
          const matched = (data.cases || []).find(c => String(c.case_id) === savedId);
          if (matched) {
            setActiveCase(matched.case_number);
          }
        } else if (data.cases && data.cases.length > 0) {
          const firstCase = data.cases[0];
          localStorage.setItem("visioncctv_active_case_id", String(firstCase.case_id));
          localStorage.setItem("visioncctv_active_case_number", firstCase.case_number);
          setActiveCaseId(String(firstCase.case_id));
          setActiveCase(firstCase.case_number);
        }
      } catch (err) {
        console.error("Failed to load cases in layout:", err);
      }
    }
    load();
  }, [isAuthenticated]);

  // Listen to activeCaseChanged custom event
  useEffect(() => {
    const handleCaseChange = () => {
      const savedId = localStorage.getItem("visioncctv_active_case_id") || "";
      setActiveCaseId(savedId);
      const savedNum = localStorage.getItem("visioncctv_active_case_number") || "";
      if (savedNum) {
        setActiveCase(savedNum);
      }
    };
    window.addEventListener("activeCaseChanged", handleCaseChange);
    return () => window.removeEventListener("activeCaseChanged", handleCaseChange);
  }, []);

  const handleCaseSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    setActiveCaseId(selectedId);
    if (selectedId) {
      localStorage.setItem("visioncctv_active_case_id", selectedId);
      const matched = cases.find(c => String(c.case_id) === selectedId);
      if (matched) {
        localStorage.setItem("visioncctv_active_case_number", matched.case_number);
        setActiveCase(matched.case_number);
      }
      window.dispatchEvent(new Event("activeCaseChanged"));
    } else {
      localStorage.removeItem("visioncctv_active_case_id");
      localStorage.removeItem("visioncctv_active_case_number");
      setActiveCase("");
      window.dispatchEvent(new Event("activeCaseChanged"));
    }
  };

  // Background Search Jobs Polling
  useEffect(() => {
    if (!isAuthenticated) return;

    const pollBackgroundJobs = async () => {
      const savedJobsRaw = localStorage.getItem("visioncctv_background_jobs");
      if (!savedJobsRaw) return;

      let savedJobs: BgJob[] = [];
      try {
        savedJobs = JSON.parse(savedJobsRaw);
      } catch {
        return;
      }

      if (savedJobs.length === 0) return;

      let changed = false;
      const updatedJobs = await Promise.all(
        savedJobs.map(async (job) => {
          if (job.status === "completed" || job.status === "failed") {
            return job;
          }

          try {
            const status = await apiFetch<any>(`/api/search/job/${job.id}`);
            changed = true;
            
            if (status.status === "completed" && (job.status as string) !== "completed") {
              try {
                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                oscillator.type = "sine";
                oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
                gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.35);
              } catch (e) {
                console.error("Audio beep blocked:", e);
              }
              // Set floating modal popup for completion notice
              setCompletedJobPopup({
                ...job,
                status: "completed",
                match_count: status.match_count
              });
            }

            return {
              ...job,
              status: status.status,
              match_count: status.match_count,
              frames_processed: status.frames_processed,
              frames_matched: status.frames_matched,
              error: status.error
            };
          } catch (err) {
            return job;
          }
        })
      );

      if (changed) {
        setBgJobs(updatedJobs);
        localStorage.setItem("visioncctv_background_jobs", JSON.stringify(updatedJobs));
      }
    };

    const savedJobsRaw = localStorage.getItem("visioncctv_background_jobs");
    if (savedJobsRaw) {
      try {
        setBgJobs(JSON.parse(savedJobsRaw));
      } catch {}
    }

    const interval = setInterval(pollBackgroundJobs, 3000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Listen to bgJobsChanged custom event
  useEffect(() => {
    const handleBgJobsChange = () => {
      const savedJobsRaw = localStorage.getItem("visioncctv_background_jobs");
      if (savedJobsRaw) {
        try {
          setBgJobs(JSON.parse(savedJobsRaw));
        } catch {}
      }
    };
    window.addEventListener("bgJobsChanged", handleBgJobsChange);
    return () => window.removeEventListener("bgJobsChanged", handleBgJobsChange);
  }, []);

  // Poll alerts
  useEffect(() => {
    if (!isAuthenticated) return;

    const pollAlerts = async () => {
      try {
        const data = await apiFetch<{ alerts: LiveAlert[]; count: number }>("/api/cameras/alerts/all?since=0");
        if (data.alerts) {
          const sorted = data.alerts.sort((a, b) => b.timestamp - a.timestamp);
          setAlerts(sorted.slice(0, 10));
          setAlertsCount(sorted.length > 5 ? 5 : sorted.length);
        }
      } catch (err) {
        console.error("Failed to load alerts:", err);
      }
    };

    pollAlerts();
    const interval = setInterval(pollAlerts, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameInput, password: passwordInput })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Authentication failed");
      }

      const data = await res.json();

      if (data.mfa_required) {
        setMfaRequired(true);
        setLoginError("");
      } else {
        localStorage.setItem("visioncctv_token", data.token);
        localStorage.setItem("visioncctv_user", JSON.stringify(data.user));
        setUser(data.user);
        setIsAuthenticated(true);
        setUsernameInput("");
        setPasswordInput("");
      }
    } catch (err: any) {
      setLoginError(err.message || "Failed to connect to authentication server");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signupName,
          username: usernameInput,
          password: passwordInput,
          role: signupRole,
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Registration failed");
      }

      const data = await res.json();
      localStorage.setItem("visioncctv_token", data.token);
      localStorage.setItem("visioncctv_user", JSON.stringify(data.user));
      setUser(data.user);
      setIsAuthenticated(true);
      setUsernameInput("");
      setPasswordInput("");
      setSignupName("");
    } catch (err: any) {
      setLoginError(err.message || "Failed to register new account");
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/auth/mfa-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameInput, code: mfaCode })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Invalid code");
      }

      const data = await res.json();
      localStorage.setItem("visioncctv_token", data.token);
      localStorage.setItem("visioncctv_user", JSON.stringify(data.user));
      setUser(data.user);
      setIsAuthenticated(true);
      setMfaRequired(false);
      setMfaCode("");
      setUsernameInput("");
      setPasswordInput("");
    } catch (err: any) {
      setLoginError(err.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("visioncctv_token");
    localStorage.removeItem("visioncctv_user");
    setUser(null);
    setIsAuthenticated(false);
    router.push("/");
  };

  // Filter menu items by user role
  const isRoleAllowed = (item: NavItem) => {
    if (!user) return false;
    return item.roles.includes(user.role);
  };

  const allowedMonitorItems = monitorItems.filter(isRoleAllowed);
  const allowedInvestigateItems = investigateItems.filter(isRoleAllowed);
  const allowedSystemItems = systemItems.filter(isRoleAllowed);

  const allAllowedItems = [...allowedMonitorItems, ...allowedInvestigateItems, ...allowedSystemItems];
  const filteredItems = allAllowedItems.filter(item => 
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNavigate = (href: string) => {
    router.push(href);
    setPaletteOpen(false);
    setSearchQuery("");
  };

  // Access check for the current page
  const isPageAuthorized = () => {
    if (!user) return false;
    const currentItem = [...monitorItems, ...investigateItems, ...systemItems].find(item => item.href === pathname);
    if (!currentItem) return true; // Unlisted sub-pages are passed
    return currentItem.roles.includes(user.role);
  };

  if (pathname === "/verify") {
    return <div style={{ background: "#0B0F14", minHeight: "100vh" }}>{children}</div>;
  }

  if (!isAuthenticated) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "#050709", fontFamily: "sans-serif", padding: "20px" }}>
        <div style={{ width: "100%", maxWidth: "420px", background: "#0A0D12", border: "1px solid rgba(59,130,246,0.18)", borderRadius: "20px", padding: "32px", boxShadow: "0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(59,130,246,0.08)" }}>
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "52px", height: "52px", background: "linear-gradient(135deg, #2563EB, #1D4ED8)", borderRadius: "14px", marginBottom: "12px", boxShadow: "0 0 24px rgba(59,130,246,0.45)" }}>
              <EyeIcon size={26} style={{ color: "white" }} />
            </div>
            <h1 style={{ color: "#F1F5F9", fontSize: "1.6rem", fontWeight: 700, margin: 0, letterSpacing: "-0.5px" }}>Sentinel<span style={{ color: "#60A5FA" }}>Vision</span></h1>
            <p style={{ color: "#475569", fontSize: "0.85rem", marginTop: "6px" }}>Law Enforcement CCTV Intelligence Portal</p>
          </div>

          {/* Mode Switcher Tabs */}
          {!mfaRequired && (
            <div style={{ display: "flex", background: "#0E1117", padding: "4px", borderRadius: "10px", marginBottom: "24px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <button
                type="button"
                onClick={() => { setAuthMode("login"); setLoginError(""); }}
                style={{
                  flex: 1,
                  padding: "8px 16px",
                  borderRadius: "7px",
                  border: "none",
                  background: authMode === "login" ? "linear-gradient(135deg, #2563EB, #1D4ED8)" : "transparent",
                  color: authMode === "login" ? "white" : "#94a3b8",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: authMode === "login" ? "0 2px 10px rgba(59,130,246,0.4)" : "none"
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode("signup"); setLoginError(""); }}
                style={{
                  flex: 1,
                  padding: "8px 16px",
                  borderRadius: "7px",
                  border: "none",
                  background: authMode === "signup" ? "linear-gradient(135deg, #2563EB, #1D4ED8)" : "transparent",
                  color: authMode === "signup" ? "white" : "#94a3b8",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: authMode === "signup" ? "0 2px 10px rgba(59,130,246,0.4)" : "none"
                }}
              >
                Sign Up
              </button>
            </div>
          )}

          {loginError && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.35)", borderRadius: "10px", padding: "12px", color: "#EF4444", fontSize: "0.85rem", marginBottom: "20px" }}>
              <WarningIcon size={16} /> {loginError}
            </div>
          )}

          {mfaRequired ? (
            <form onSubmit={handleMfaSubmit}>
              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", color: "#94a3b8", fontSize: "0.8rem", fontWeight: 600, marginBottom: "8px", textTransform: "uppercase" }}>Authenticator Code</label>
                <input 
                  type="text" 
                  required
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", background: "#161e27", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px", padding: "12px", color: "#E6EDF3", fontSize: "1.2rem", letterSpacing: "8px", textAlign: "center", outline: "none" }}
                />
                <p style={{ color: "#64748b", fontSize: "0.75rem", marginTop: "8px", textAlign: "center" }}>Enter code from Google Authenticator</p>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                style={{ width: "100%", background: "linear-gradient(135deg, #2563EB, #1D4ED8)", color: "white", border: "none", borderRadius: "8px", padding: "12px", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(59,130,246,0.4)" }}
              >
                {loading ? "Verifying..." : "Verify Code"}
              </button>
              
              <button 
                type="button"
                onClick={() => setMfaRequired(false)}
                style={{ width: "100%", background: "transparent", color: "#94a3b8", border: "none", marginTop: "12px", fontSize: "0.85rem", cursor: "pointer" }}
              >
                Back to Sign In
              </button>
            </form>
          ) : authMode === "login" ? (
            <form onSubmit={handleLoginSubmit}>
              <div style={{ marginBottom: "18px" }}>
                <label style={{ display: "block", color: "#94a3b8", fontSize: "0.75rem", fontWeight: 600, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Username</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. investigator"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", background: "#161e27", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "12px", color: "#E6EDF3", fontSize: "0.95rem", outline: "none" }}
                />
              </div>

              <div style={{ marginBottom: "22px" }}>
                <label style={{ display: "block", color: "#94a3b8", fontSize: "0.75rem", fontWeight: 600, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Password</label>
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", background: "#161e27", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "12px", color: "#E6EDF3", fontSize: "0.95rem", outline: "none" }}
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                style={{ width: "100%", background: "linear-gradient(135deg, #2563EB, #1D4ED8)", color: "white", border: "none", borderRadius: "8px", padding: "12px", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer", transition: "0.15s all", boxShadow: "0 4px 16px rgba(59,130,246,0.4)" }}
              >
                {loading ? "Authenticating..." : "Sign In"}
              </button>

              {/* Demo User Shortcuts */}
              <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ color: "#475569", fontSize: "0.75rem", marginBottom: "8px", textAlign: "center" }}>Quick Demo Accounts (Password: <code style={{ color: "#60A5FA" }}>hawki</code>):</p>
                <div style={{ display: "flex", gap: "6px", justifyContent: "center", flexWrap: "wrap" }}>
                  {["admin", "investigator", "operator", "supervisor"].map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => { setUsernameInput(u); setPasswordInput("hawki"); }}
                      style={{ background: "#0E1117", border: "1px solid rgba(59,130,246,0.2)", borderRadius: "6px", padding: "4px 10px", color: "#94a3b8", fontSize: "0.75rem", cursor: "pointer" }}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", color: "#94a3b8", fontSize: "0.75rem", fontWeight: 600, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Full Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Inspector Rajan"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", background: "#161e27", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "10px 12px", color: "#E6EDF3", fontSize: "0.9rem", outline: "none" }}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", color: "#94a3b8", fontSize: "0.75rem", fontWeight: 600, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Username</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. rajan_officer"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", background: "#161e27", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "10px 12px", color: "#E6EDF3", fontSize: "0.9rem", outline: "none" }}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", color: "#94a3b8", fontSize: "0.75rem", fontWeight: 600, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Password</label>
                <input 
                  type="password" 
                  required
                  placeholder="At least 4 characters"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", background: "#161e27", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "10px 12px", color: "#E6EDF3", fontSize: "0.9rem", outline: "none" }}
                />
              </div>

              <div style={{ marginBottom: "22px" }}>
                <label style={{ display: "block", color: "#94a3b8", fontSize: "0.75rem", fontWeight: 600, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Assigned System Role</label>
                <select
                  value={signupRole}
                  onChange={(e) => setSignupRole(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", background: "#161e27", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "10px 12px", color: "#E6EDF3", fontSize: "0.9rem", outline: "none" }}
                >
                  <option value="operator">Control Room Operator</option>
                  <option value="investigator">Cyber Cell Investigator</option>
                  <option value="supervisor">Duty Supervisor</option>
                  <option value="auditor">Forensic Auditor</option>
                  <option value="admin">System Administrator</option>
                </select>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                style={{ width: "100%", background: "linear-gradient(135deg, #2563EB, #1D4ED8)", color: "white", border: "none", borderRadius: "8px", padding: "12px", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer", transition: "0.15s all", boxShadow: "0 4px 16px rgba(59,130,246,0.4)" }}
              >
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="layout">
      {/* Topbar */}
      <header className="topbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div className="topbar-logo" style={{ cursor: "pointer" }} onClick={() => router.push("/")}>
            <div className="icon" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "30px", height: "30px", background: "linear-gradient(135deg, #2563EB, #1D4ED8)", borderRadius: "7px", boxShadow: "0 0 12px rgba(59,130,246,0.4)" }}>
              <EyeIcon size={16} style={{ color: "white" }} />
            </div>
            <span>Sentinel<span className="accent">Vision</span></span>
          </div>
          
          {/* Active Case Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "6px", padding: "4px 12px" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Case:</span>
            <select 
              value={activeCaseId}
              onChange={handleCaseSelectChange}
              style={{ background: "transparent", color: "var(--text-primary)", border: "none", outline: "none", fontSize: "0.85rem", cursor: "pointer", fontWeight: 500 }}
            >
              <option value="" style={{ background: "var(--bg-surface)" }}>Select Case...</option>
              {cases.map((c) => (
                <option key={c.case_id} value={String(c.case_id)} style={{ background: "var(--bg-surface)" }}>
                  {c.case_number} — {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Bar / Ctrl+K hint */}
        <div 
          onClick={() => setPaletteOpen(true)}
          style={{ display: "flex", alignItems: "center", gap: "12px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "8px", padding: "6px 14px", width: "240px", cursor: "pointer", color: "var(--text-muted)", fontSize: "0.85rem" }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><SearchIcon size={14} /> Search commands...</span>
          <kbd style={{ marginLeft: "auto", background: "var(--bg-card)", border: "1px solid var(--border)", padding: "1px 6px", borderRadius: "4px", fontSize: "0.7rem", fontFamily: "monospace" }}>Ctrl+K</kbd>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {/* Active Tasks Tracker */}
          <div style={{ position: "relative" }}>
            <div 
              onClick={() => { setTasksOpen(!tasksOpen); setAlertsOpen(false); }}
              style={{ position: "relative", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", borderRadius: "50%", background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
              title="Active Search Jobs"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={bgJobs.some(j => j.status === 'running' || j.status === 'queued') ? "spin-pulse" : ""}>
                <line x1="22" y1="12" x2="2" y2="12" />
                <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                <path d="M6 16h.01" />
                <path d="M10 16h.01" />
              </svg>
              {bgJobs.some(j => j.status === 'running' || j.status === 'queued') && (
                <span style={{ position: "absolute", top: "-2px", right: "-2px", display: "flex", width: "10px", height: "10px" }}>
                  <span className="animate-ping" style={{ position: "absolute", display: "inline-flex", height: "100%", width: "100%", borderRadius: "50%", background: "#3B82F6", opacity: 0.75 }}></span>
                  <span style={{ position: "relative", display: "inline-flex", borderRadius: "50%", width: "10px", height: "10px", background: "#3B82F6" }}></span>
                </span>
              )}
            </div>

            {tasksOpen && (
              <div 
                style={{
                  position: "absolute", top: "50px", right: "-20px", width: "400px",
                  maxHeight: "500px", overflowY: "auto", background: "rgba(10, 13, 18, 0.97)",
                  backdropFilter: "blur(20px)", border: "1px solid rgba(59,130,246,0.25)",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.8), 0 0 20px rgba(59,130,246,0.12)",
                  borderRadius: "12px", padding: "18px", zIndex: 500, display: "flex", flexDirection: "column", gap: "12px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
                  <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                    <SearchIcon size={16} style={{ color: "var(--accent)" }} /> AI Search Jobs ({bgJobs.length})
                  </span>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <button 
                      onClick={() => {
                        localStorage.setItem("visioncctv_background_jobs", "[]");
                        setBgJobs([]);
                      }}
                      style={{ background: "transparent", color: "var(--text-muted)", border: "none", cursor: "pointer", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700 }}
                    >Clear All</button>
                    <button 
                      onClick={() => setTasksOpen(false)}
                      style={{ background: "transparent", color: "var(--text-muted)", border: "none", cursor: "pointer", fontSize: "0.85rem" }}
                    >✕</button>
                  </div>
                </div>

                {bgJobs.length === 0 ? (
                  <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center", padding: "30px 0" }}>
                    No search jobs triggered yet. Use AI Search to start background jobs.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {bgJobs.map((job) => (
                      <div 
                        key={job.id}
                        style={{
                          background: "rgba(59,130,246,0.03)", border: "1px solid rgba(59,130,246,0.15)",
                          borderRadius: "8px", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "6px"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#60A5FA", textTransform: "capitalize" }}>
                            {job.type.replace("_", " ")}
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span className={`status-pill status-${job.status}`} style={{ fontSize: "0.55rem", padding: "1px 5px" }}>
                              {job.status}
                            </span>
                            <button 
                              onClick={() => {
                                const updated = bgJobs.filter(j => j.id !== job.id);
                                setBgJobs(updated);
                                localStorage.setItem("visioncctv_background_jobs", JSON.stringify(updated));
                              }}
                              style={{ background: "transparent", color: "var(--text-muted)", border: "none", cursor: "pointer", fontSize: "0.85rem", padding: 0 }}
                            >✕</button>
                          </div>
                        </div>

                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          Query: <span style={{ color: "var(--text-primary)" }}>{job.query}</span>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.68rem", color: "var(--text-muted)" }}>
                          <span>ID: #{job.id}</span>
                          <button 
                            onClick={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
                            style={{ background: "transparent", color: "var(--accent)", border: "none", cursor: "pointer", fontWeight: 700, padding: 0 }}
                          >
                            {expandedJobId === job.id ? "Hide Details" : "Show Details"}
                          </button>
                        </div>

                        {expandedJobId === job.id && (
                          <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: "4px", padding: "6px 8px", fontSize: "0.68rem", display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
                            <div>Videos scanned: {job.videosCount}</div>
                            <div>Triggered: {job.timestamp}</div>
                            {job.status === "running" && job.frames_processed !== undefined && (
                              <div>Progress: {job.frames_processed} frames parsed, {job.frames_matched} matches found</div>
                            )}
                            {job.status === "completed" && (
                              <div style={{ color: "var(--green)" }}>Completed successfully! Found {job.match_count} matches.</div>
                            )}
                            {job.status === "failed" && (
                              <div style={{ color: "var(--accent)" }}>Error: {job.error || "Search pipeline failed"}</div>
                            )}
                          </div>
                        )}

                        {(job.status === "running" || job.status === "queued") && (
                          <div style={{ height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", overflow: "hidden", marginTop: "4px" }}>
                            <div className="progress-bar-fill pulse" style={{ width: "100%", height: "100%", animation: "pulse 1.5s infinite" }}></div>
                          </div>
                        )}

                        {job.status === "completed" && (
                          <button 
                            onClick={() => {
                              router.push(`/results#${job.id}`);
                              setTasksOpen(false);
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ marginTop: "4px", display: "flex", justifyContent: "center", fontSize: "0.7rem", padding: "4px 8px" }}
                          >
                            View Matching Results →
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Realtime Alert Bell */}
          <div style={{ position: "relative" }}>
            <div 
              onClick={() => {
                setAlertsOpen(!alertsOpen);
                setTasksOpen(false);
                setAlertsCount(0); // Reset alerts count when bell is clicked
              }}
              style={{ position: "relative", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", borderRadius: "50%", background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
            >
              <BellIcon size={18} />
              {alertsCount > 0 && (
                <span style={{ position: "absolute", top: "-2px", right: "-2px", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--yellow)", color: "#000", fontSize: "0.65rem", fontWeight: "bold", borderRadius: "50%", width: "16px", height: "16px" }}>
                  {alertsCount}
                </span>
              )}
            </div>

            {alertsOpen && (
              <div 
                style={{
                  position: "absolute", top: "50px", right: "-20px", width: "360px",
                  maxHeight: "400px", overflowY: "auto", background: "rgba(10, 13, 18, 0.97)",
                  backdropFilter: "blur(20px)", border: "1px solid rgba(59,130,246,0.25)",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.8), 0 0 20px rgba(59,130,246,0.1)",
                  borderRadius: "12px", padding: "16px", zIndex: 500, display: "flex", flexDirection: "column", gap: "12px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
                  <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--text-primary)" }}>Recent VMS Alerts</span>
                  <button 
                    onClick={() => setAlertsOpen(false)}
                    style={{ background: "transparent", color: "var(--text-muted)", border: "none", cursor: "pointer", fontSize: "0.85rem" }}
                  >✕</button>
                </div>

                {alerts.length === 0 ? (
                  <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center", padding: "20px 0" }}>
                    No recent live alerts. Active cameras will list detections here.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {alerts.map((alert) => (
                      <div 
                        key={alert.id}
                        onClick={() => { router.push("/results"); setAlertsOpen(false); }}
                        style={{
                          display: "flex", gap: "10px", alignItems: "center", padding: "8px",
                          background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)",
                          borderRadius: "8px", cursor: "pointer", transition: "var(--transition)"
                        }}
                        className="history-item-hover"
                      >
                        <div style={{ width: "40px", height: "40px", borderRadius: "4px", background: "#000", overflow: "hidden", flexShrink: 0 }}>
                          {alert.snapshot_url ? (
                            <img src={`http://localhost:8000${alert.snapshot_url}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><AlertIcon size={18} style={{ color: "var(--text-muted)" }} /></div>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--yellow)" }}>{alert.camera_name || alert.camera_id}</span>
                            <span style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>{alert.timestamp_str.split(" ").pop()}</span>
                          </div>
                          <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {alert.detections.map(d => `${d.label} (${(d.confidence * 100).toFixed(0)}%)`).join(", ")}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>{user?.name}</span>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>{user?.role}</span>
          </div>

          <button 
            onClick={handleLogout}
            style={{ background: "transparent", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "6px", padding: "6px 12px", fontSize: "0.8rem", cursor: "pointer" }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <nav className="sidebar" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          {allowedMonitorItems.length > 0 && <div className="nav-section-label">Monitor</div>}
          {allowedMonitorItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div className={`nav-item ${pathname === item.href ? "active" : ""}`}>
                  <Icon size={16} />
                  {item.label}
                </div>
              </Link>
            );
          })}

          {allowedInvestigateItems.length > 0 && <div className="nav-section-label">Investigate</div>}
          {allowedInvestigateItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div className={`nav-item ${pathname === item.href ? "active" : ""}`}>
                  <Icon size={16} />
                  {item.label}
                </div>
              </Link>
            );
          })}

          {allowedSystemItems.length > 0 && <div className="nav-section-label">System</div>}
          {allowedSystemItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div className={`nav-item ${pathname === item.href ? "active" : ""}`}>
                  <Icon size={16} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Dynamic Legacy / Offline status */}
        <div style={{ marginTop: "auto", borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
          <a href="http://localhost:8000/docs" target="_blank" rel="noopener">
            <div className="nav-item">
              <SignalIcon size={16} />
              Swagger API Docs
            </div>
          </a>

          {/* Branding */}
          <div className="sidebar-branding" style={{ marginTop: "12px" }}>
            <div className="branding-label">SentinelVision Platform</div>
            <div className="branding-members">
              <span style={{ color: "var(--accent)", fontWeight: 600 }}>Active Database Connected</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {isPageAuthorized() ? (
          children
        ) : (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", alignItems: "center", justifyContent: "center", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "40px", textAlign: "center" }}>
            <LockIcon size={48} style={{ color: "var(--accent)", marginBottom: "16px" }} />
            <h2 style={{ color: "var(--text-primary)", fontSize: "1.5rem", marginBottom: "8px" }}>Access Denied</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: "400px", margin: "0 auto 24px" }}>
              Your account role ({user?.role.toUpperCase()}) does not have permissions to access this page. Please contact your administrator.
            </p>
            <button 
              onClick={() => router.push("/")}
              style={{ background: "var(--accent)", color: "#0B0F14", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "0.9rem", fontWeight: "bold", cursor: "pointer" }}
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </main>

      {/* Command Palette Modal */}
      {paletteOpen && (
        <div 
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "15vh", zIndex: 1000 }}
          onClick={() => setPaletteOpen(false)}
        >
          <div 
            style={{ width: "100%", maxWidth: "520px", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden", boxShadow: "var(--shadow-card)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center" }}>
              <SearchIcon size={18} style={{ marginRight: "12px", color: "var(--text-muted)" }} />
              <input 
                type="text" 
                autoFocus
                placeholder="Type a command or page name..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ background: "transparent", border: "none", outline: "none", color: "var(--text-primary)", fontSize: "1rem", width: "100%" }}
              />
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>ESC to exit</span>
            </div>
            
            <div style={{ maxHeight: "300px", overflowY: "auto", padding: "8px" }}>
              {filteredItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div 
                    key={item.href}
                    onClick={() => handleNavigate(item.href)}
                    style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "0.9rem", color: "var(--text-secondary)", transition: "var(--transition)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--bg-elevated)";
                      e.currentTarget.style.color = "var(--text-primary)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--text-secondary)";
                    }}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                    <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "var(--text-muted)" }}>Go to page</span>
                  </div>
                );
              })}
              {filteredItems.length === 0 && (
                <div style={{ padding: "16px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                  No commands found matching "{searchQuery}"
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Background Job Completed Popup Modal */}
      {completedJobPopup && (
        <div 
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            width: "350px",
            background: "rgba(10, 13, 18, 0.97)",
            backdropFilter: "blur(20px)",
            border: "1.5px solid rgba(59,130,246,0.45)",
            boxShadow: "0 10px 40px rgba(0,0,0,0.8), 0 0 20px rgba(59,130,246,0.2)",
            borderRadius: "12px",
            padding: "16px",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            animation: "slideIn 0.3s ease-out"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "#60A5FA", display: "flex", alignItems: "center", gap: 6 }}>
              <CheckIcon size={16} style={{ color: "var(--green)" }} /> AI Search Completed
            </span>
            <button 
              onClick={() => setCompletedJobPopup(null)}
              style={{ background: "transparent", color: "var(--text-muted)", border: "none", cursor: "pointer", fontSize: "0.85rem" }}
            >✕</button>
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
            Job <span className="mono" style={{ color: "var(--text-primary)" }}>#{completedJobPopup.id}</span> ({completedJobPopup.type.replace("_", " ")}) has completed scanning all target video footage.
          </div>
          <div style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--green)" }}>
            Found {completedJobPopup.match_count} evidence matches!
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
            <button 
              className="btn btn-primary btn-sm"
              style={{ flex: 1, justifyContent: "center" }}
              onClick={() => {
                router.push(`/results#${completedJobPopup.id}`);
                setCompletedJobPopup(null);
              }}
            >
              View Results
            </button>
            <button 
              className="btn btn-secondary btn-sm"
              style={{ flex: 1, justifyContent: "center" }}
              onClick={() => setCompletedJobPopup(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      <style>{`
        @keyframes spin-pulse {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.15); }
          100% { transform: rotate(360deg) scale(1); }
        }
        .spin-pulse {
          animation: spin-pulse 3s linear infinite;
        }
        @keyframes animate-ping {
          0% { transform: scale(1); opacity: 1; }
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        .animate-ping {
          animation: animate-ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
}
