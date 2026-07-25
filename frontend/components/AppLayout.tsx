"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useState, useEffect } from "react";
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
  SignalIcon
} from "./Icons";

interface NavItem {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  roles: string[];
}

const monitorItems: NavItem[] = [
  { href: "/",         icon: DashboardIcon, label: "Dashboard",   roles: ["admin", "supervisor", "investigator", "operator"] },
  { href: "/live",     icon: LiveIcon,      label: "Live Wall",   roles: ["admin", "supervisor", "operator"] },
  { href: "/playback", icon: CameraIcon,    label: "Recordings",  roles: ["admin", "supervisor", "operator"] },
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
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeCase, setActiveCase] = useState("FIR/2026/012");
  const [alertsCount, setAlertsCount] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
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

  useEffect(() => {
    setAlertsCount(3);
  }, []);

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

  if (!isAuthenticated) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "#0B0F14", fontFamily: "sans-serif", padding: "20px" }}>
        <div style={{ width: "100%", maxWidth: "420px", background: "#121821", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "32px", boxShadow: "0 12px 40px rgba(0,0,0,0.6)" }}>
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "52px", height: "52px", background: "linear-gradient(135deg, #2DD4BF, #00ff88)", borderRadius: "14px", marginBottom: "12px", boxShadow: "0 0 20px rgba(45, 212, 191, 0.3)" }}>
              <EyeIcon size={28} style={{ color: "#0B0F14" }} />
            </div>
            <h1 style={{ color: "#E6EDF3", fontSize: "1.6rem", fontWeight: 700, margin: 0, letterSpacing: "-0.5px" }}>Sentinel<span style={{ color: "#2DD4BF" }}>Vision</span></h1>
            <p style={{ color: "#64748b", fontSize: "0.85rem", marginTop: "6px" }}>Law Enforcement CCTV Intelligence Portal</p>
          </div>

          {/* Mode Switcher Tabs */}
          {!mfaRequired && (
            <div style={{ display: "flex", background: "#161e27", padding: "4px", borderRadius: "10px", marginBottom: "24px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <button
                type="button"
                onClick={() => { setAuthMode("login"); setLoginError(""); }}
                style={{
                  flex: 1,
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "none",
                  background: authMode === "login" ? "#2DD4BF" : "transparent",
                  color: authMode === "login" ? "#0B0F14" : "#94a3b8",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
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
                  borderRadius: "8px",
                  border: "none",
                  background: authMode === "signup" ? "#2DD4BF" : "transparent",
                  color: authMode === "signup" ? "#0B0F14" : "#94a3b8",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
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
                style={{ width: "100%", background: "#2DD4BF", color: "#0B0F14", border: "none", borderRadius: "8px", padding: "12px", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer" }}
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
                style={{ width: "100%", background: "linear-gradient(135deg, #2DD4BF, #14b8a6)", color: "#0B0F14", border: "none", borderRadius: "8px", padding: "12px", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer", transition: "0.15s opacity" }}
              >
                {loading ? "Authenticating..." : "Sign In"}
              </button>

              {/* Demo User Shortcuts */}
              <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ color: "#64748b", fontSize: "0.75rem", marginBottom: "8px", textAlign: "center" }}>Quick Demo Accounts (Password: <code style={{ color: "#2DD4BF" }}>hawki</code>):</p>
                <div style={{ display: "flex", gap: "6px", justifyContent: "center", flexWrap: "wrap" }}>
                  {["admin", "investigator", "operator", "supervisor"].map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => { setUsernameInput(u); setPasswordInput("hawki"); }}
                      style={{ background: "#161e27", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "4px 8px", color: "#94a3b8", fontSize: "0.75rem", cursor: "pointer" }}
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
                style={{ width: "100%", background: "linear-gradient(135deg, #2DD4BF, #14b8a6)", color: "#0B0F14", border: "none", borderRadius: "8px", padding: "12px", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer", transition: "0.15s opacity" }}
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
            <div className="icon" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", background: "linear-gradient(135deg, var(--accent), #00ff88)", borderRadius: "8px" }}>
              <EyeIcon size={18} style={{ color: "#0B0F14" }} />
            </div>
            <span>Sentinel<span className="accent">Vision</span></span>
          </div>
          
          {/* Active Case Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "6px", padding: "4px 12px" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Case:</span>
            <select 
              value={activeCase}
              onChange={(e) => setActiveCase(e.target.value)}
              style={{ background: "transparent", color: "var(--text-primary)", border: "none", outline: "none", fontSize: "0.85rem", cursor: "pointer", fontWeight: 500 }}
            >
              <option value="FIR/2026/012" style={{ background: "var(--bg-surface)" }}>FIR/2026/012 — MG Road Theft</option>
              <option value="FIR/2026/015" style={{ background: "var(--bg-surface)" }}>FIR/2026/015 — Missing Person</option>
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
          {/* Realtime Alert Bell */}
          <div 
            onClick={() => router.push("/results")}
            style={{ position: "relative", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", borderRadius: "50%", background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
          >
            <BellIcon size={18} />
            {alertsCount > 0 && (
              <span style={{ position: "absolute", top: "-2px", right: "-2px", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--yellow)", color: "#000", fontSize: "0.65rem", fontWeight: "bold", borderRadius: "50%", width: "16px", height: "16px" }}>
                {alertsCount}
              </span>
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
    </div>
  );
}
