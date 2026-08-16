import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/Button";
import { Logo } from "../components/ui/Logo";
import { LuminousQuantumFlow } from "../components/ui/LuminousQuantumFlow";
import { 
  ShieldCheck, 
  Lock, 
  User, 
  AlertCircle,
  Fingerprint,
  Radio,
  Cpu
} from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [clearanceTier, setClearanceTier] = useState<"L2" | "L3" | "L4">("L4");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setIsScanning(true);

    try {
      await new Promise((r) => setTimeout(r, 600));

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Authentication failed");

      login(data.token, data.user);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Failed to authenticate session");
    } finally {
      setLoading(false);
      setIsScanning(false);
    }
  };

  const handleTierSelect = (tier: "L2" | "L3" | "L4") => {
    setClearanceTier(tier);
    if (tier === "L4") {
      setUsername("admin");
      setPassword("admin123");
    } else if (tier === "L3") {
      setUsername("supervisor");
      setPassword("super123");
    } else {
      setUsername("operator");
      setPassword("oper123");
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#05060A] flex items-center justify-center p-6 overflow-hidden select-none">
      
      {/* Butter-Smooth 60FPS Luminous Quantum Flow Canvas */}
      <LuminousQuantumFlow />

      {/* Atmospheric Ambient Lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-hawk-sapphire/15 rounded-full blur-[160px] pointer-events-none" />

      {/* Ultra-Luxury Frosted Liquid Glass Gateway Card */}
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#0F1422]/70 via-[#0A0E1A]/75 to-[#060812]/85 backdrop-blur-3xl border border-white/[0.14] rounded-3xl p-8 lg:p-10 shadow-[0_35px_120px_rgba(0,0,0,0.85)] space-y-8 z-10 overflow-hidden">
        
        {/* Specular Top Bevel Edge Highlight */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

        {/* Biometric Scanning Laser line upon submit */}
        {isScanning && (
          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-hawk-emerald to-transparent animate-scan-sweep z-30 pointer-events-none shadow-[0_0_15px_rgba(16,185,129,1)]" />
        )}

        {/* Brand & Wordmark with 3D Iridescent Orb */}
        <div className="text-center relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-hawk-sapphire/30 rounded-full blur-2xl pointer-events-none" />
          <Logo size={88} showWordmark={true} />
        </div>

        {/* Clearance Tier Selector Keycards */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[9.5px] font-mono text-hawk-muted uppercase tracking-widest font-bold">
              CLEARANCE PROFILE
            </span>
            <span className="text-[9px] font-mono text-hawk-emerald font-bold flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> SECURED
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { tier: "L2", label: "OPERATOR" },
              { tier: "L3", label: "SUPERVISOR" },
              { tier: "L4", label: "ROOT ADMIN" },
            ].map((item) => (
              <button
                type="button"
                key={item.tier}
                onClick={() => handleTierSelect(item.tier as any)}
                className={`p-2.5 rounded-2xl border text-center transition-all duration-300 cursor-pointer ${
                  clearanceTier === item.tier
                    ? "bg-gradient-to-b from-hawk-sapphire/30 to-hawk-sapphire/15 border-hawk-sapphire/70 shadow-[0_0_25px_rgba(59,130,246,0.35)]"
                    : "bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.06]"
                }`}
              >
                <div className="text-xs font-mono font-black text-white">{item.tier}</div>
                <div className="text-[8px] font-mono text-hawk-muted uppercase mt-0.5">{item.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            
            {/* Username Input */}
            <div className="relative">
              <User className="h-4 w-4 text-hawk-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Operator Handle"
                required
                className="w-full bg-black/55 border border-white/15 rounded-2xl py-3.5 pl-10 pr-4 text-xs text-white placeholder:text-white/40 font-sans outline-none focus:border-hawk-sapphire transition-colors shadow-inner"
              />
            </div>

            {/* Password Input */}
            <div className="relative">
              <Lock className="h-4 w-4 text-hawk-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Access Keycode"
                required
                className="w-full bg-black/55 border border-white/15 rounded-2xl py-3.5 pl-10 pr-4 text-xs text-white placeholder:text-white/40 font-sans outline-none focus:border-hawk-sapphire transition-colors shadow-inner"
              />
            </div>

          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-2xl bg-hawk-burgundy/10 border border-hawk-burgundy/30 text-hawk-burgundy text-xs font-sans flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button with Biometric Icon */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={loading}
            className="w-full shadow-[0_10px_30px_rgba(59,130,246,0.35)] cursor-pointer"
            icon={<Fingerprint className="h-4 w-4" />}
          >
            AUTHORIZE CONSOLE
          </Button>
        </form>

        {/* Cryptographic Telemetry Footer */}
        <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between text-[9px] font-mono text-hawk-muted">
          <span className="flex items-center gap-1">
            <Radio className="h-3 w-3 text-hawk-emerald animate-pulse" /> AES-256 ENCRYPTED
          </span>
          <span className="flex items-center gap-1">
            <Cpu className="h-3 w-3 text-hawk-sapphire" /> NODE: HAWK-PROD-01
          </span>
        </div>

      </div>

    </div>
  );
}
