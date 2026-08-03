import { Eye, EyeOff } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Logo } from "../components/ui/Logo";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      
      // Guard against empty responses (e.g. network error, server crash)
      const text = await res.text();
      if (!text) {
        throw new Error("Server returned an empty response. Is the backend running?");
      }
      
      const data = JSON.parse(text);
      
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      login(data.token, data.user);
      
      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-hawk-bg px-4">
      {/* Background Atmosphere */}
      <div className="hawk-atmosphere fixed inset-0 z-0 pointer-events-none">
        <div className="hawk-spotlight-beam" />
        <div className="hawk-aura hawk-aura--blue" />
        <div className="hawk-aura hawk-aura--violet" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 flex justify-center">
          <Logo size={56} />
        </div>

        {/* Login card */}
        <Card padding="lg" className="border-white/[0.08] bg-black/40 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <h2 className="mb-6 text-center text-xl font-semibold text-white tracking-wide" style={{ fontFamily: "'Clash Display', sans-serif" }}>
            Operator Authentication
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400 text-center">
                {error}
              </div>
            )}
            
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-hawk-muted uppercase tracking-wider">
                Operator ID
              </label>
              <input
                type="text"
                placeholder="admin, operator, or viewer"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-12 w-full rounded-full border border-white/10 bg-black/40 px-4 text-sm text-white placeholder:text-white/30 outline-none transition-all duration-300 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 focus:bg-black/60"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-hawk-muted uppercase tracking-wider">
                Security Clearance Key
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 w-full rounded-full border border-white/10 bg-black/40 px-4 pr-12 text-sm text-white placeholder:text-white/30 outline-none transition-all duration-300 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 focus:bg-black/60"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" strokeWidth={1.75} />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={1.75} />
                  )}
                </button>
              </div>
            </div>

            <Button variant="primary" size="lg" className="w-full mt-2" type="submit" disabled={loading}>
              {loading ? "Authenticating..." : "Initialize Session"}
            </Button>
          </form>

          <p className="mt-6 text-center text-[10px] uppercase tracking-widest text-hawk-muted/60">
            Secure Connection <span className="mx-1">•</span> Live System
          </p>
        </Card>
      </div>
    </div>
  );
}
