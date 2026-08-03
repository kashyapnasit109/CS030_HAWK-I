import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Camera,
  AlertTriangle,
  Shield,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import { StatCard } from "../components/ui/StatCard";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { ProgressRing } from "../components/ui/ProgressRing";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { colors } from "../design-tokens/colors";

/* ── Rich Mock Data (Kept for visual chart) ─────────────────────────────────────────────────── */
const activityData = [
  { time: "00:00", events: 14, alerts: 2 },
  { time: "02:00", events: 9, alerts: 1 },
  { time: "04:00", events: 6, alerts: 0 },
  { time: "06:00", events: 22, alerts: 3 },
  { time: "08:00", events: 54, alerts: 6 },
  { time: "10:00", events: 78, alerts: 11 },
  { time: "12:00", events: 62, alerts: 5 },
  { time: "14:00", events: 88, alerts: 8 },
  { time: "16:00", events: 82, alerts: 12 },
  { time: "18:00", events: 60, alerts: 7 },
  { time: "20:00", events: 42, alerts: 4 },
  { time: "22:00", events: 28, alerts: 2 },
];

const priorityAlerts = [
  {
    id: 1,
    title: "Unauthorized Perimeter Breach — Zone 4",
    severity: "crimson" as const,
    time: "2 min ago",
    camera: "CAM-07 (North Fence)",
    module: "Intrusion Detection",
  },
  {
    id: 2,
    title: "High Velocity Vehicle — 74 km/h in restricted zone",
    severity: "amber" as const,
    time: "14 min ago",
    camera: "CAM-12 (Gate B)",
    module: "Speed Tracking",
  },
  {
    id: 3,
    title: "Loitering Suspicion near VIP Entrance",
    severity: "amber" as const,
    time: "29 min ago",
    camera: "CAM-01 (Main Lobby)",
    module: "Behavior Analysis",
  },
];

const alertIconStyle: Record<string, string> = {
  crimson: "bg-hawk-crimson/20 text-hawk-crimson border-hawk-crimson/40 shadow-[0_0_15px_rgba(239,68,68,0.3)]",
  amber: "bg-hawk-amber/20 text-hawk-amber border-hawk-amber/40 shadow-[0_0_15px_rgba(245,158,11,0.3)]",
  blue: "bg-hawk-blue/20 text-hawk-blue border-hawk-blue/40 shadow-[0_0_15px_rgba(59,130,246,0.3)]",
};

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: string;
}) {
  if (!active || !payload) return null;
  return (
    <div className="hawk-glass-card p-3.5 text-xs shadow-2xl backdrop-blur-2xl">
      <p className="mb-2 font-bold text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-6 py-0.5 text-hawk-muted">
          <span className="flex items-center gap-1.5 font-semibold">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.dataKey === "events" ? colors.blue : colors.crimson }}
            />
            {entry.dataKey === "events" ? "Events Detected" : "Security Alerts"}
          </span>
          <span className="font-extrabold text-white">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const currentDate = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const { token } = useAuth();

  const [summary, setSummary] = useState<any>(null);
  const [cameras, setCameras] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryRes, camerasRes] = await Promise.all([
          fetch("/api/analytics/summary", {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch("/api/cameras", {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        if (summaryRes.ok) setSummary(await summaryRes.json());
        if (camerasRes.ok) setCameras(await camerasRes.json());
      } catch (err) {
        console.error("Error fetching dashboard data", err);
      }
    };
    
    if (token) fetchData();
  }, [token]);

  const totalEventsToday = summary?.events_today_per_module?.reduce((acc: number, curr: any) => acc + curr.count, 0) || 0;

  return (
    <div className="space-y-8">
      {/* Overview Context Header Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-hawk-muted">
            Unified Hawk-I Surveillance Feed · <span className="text-white font-bold">{currentDate}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="emerald" dot>
            Hawk Engine Optimal
          </Badge>
          <Badge variant="blue">
            9 AI Modules Active
          </Badge>
        </div>
      </div>

      {/* ── KPI Stat Cards Grid ────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Camera className="h-5 w-5" strokeWidth={2} />}
          value={summary ? summary.total_cameras : "..."}
          label="Active Feeds"
          trend={
            <span className="flex items-center gap-1">
              <ArrowUpRight className="h-4 w-4 text-hawk-emerald" /> Linked to DB
            </span>
          }
          trendDirection="up"
          accentColor="blue"
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" strokeWidth={2} />}
          value={summary ? summary.open_alerts : "..."}
          label="Pending Alerts"
          trend={
            <span className="flex items-center gap-1">
              <ArrowDownRight className="h-4 w-4 text-hawk-crimson" /> Needs review
            </span>
          }
          trendDirection="down"
          accentColor="crimson"
        />
        <StatCard
          icon={<Shield className="h-5 w-5" strokeWidth={2} />}
          value="99.4%"
          label="Uptime Index"
          trend={
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-hawk-emerald" /> 30-day average
            </span>
          }
          trendDirection="up"
          accentColor="emerald"
        />
        <StatCard
          icon={<Activity className="h-5 w-5" strokeWidth={2} />}
          value={summary ? totalEventsToday : "..."}
          label="AI Detections Today"
          trend={
            <span className="flex items-center gap-1">
              <ArrowUpRight className="h-4 w-4 text-hawk-emerald" /> Aggregated live
            </span>
          }
          trendDirection="up"
          accentColor="violet"
        />
      </div>

      {/* ── Activity Chart & Donut Gauge Progress Ring ──────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Analytics Area Chart — 2/3 width */}
        <Card padding="lg" className="lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 
                className="text-xl font-extrabold tracking-tight text-white"
                style={{ fontFamily: "'Outfit', 'Space Grotesk', sans-serif" }}
              >
                Intelligence Activity Timeline
              </h3>
              <p className="mt-1 text-xs text-hawk-muted">Real-time event frequency &amp; alert distribution across 24h</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="flex items-center gap-2 text-hawk-muted">
                <span className="h-2.5 w-2.5 rounded-full bg-hawk-blue shadow-[0_0_10px_#3B82F6]" />
                Events
              </span>
              <span className="flex items-center gap-2 text-hawk-muted">
                <span className="h-2.5 w-2.5 rounded-full bg-hawk-crimson shadow-[0_0_10px_#EF4444]" />
                Alerts
              </span>
            </div>
          </div>

          <div className="h-[290px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="v5GradBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="v5GradCrimson" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11, fontWeight: 700 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11, fontWeight: 700 }} dx={-10} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.15)", strokeWidth: 1 }} />
                <Area type="monotone" dataKey="events" stroke="#3B82F6" strokeWidth={3} fill="url(#v5GradBlue)" />
                <Area type="monotone" dataKey="alerts" stroke="#EF4444" strokeWidth={3} fill="url(#v5GradCrimson)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Progress Gauge Donut Ring — System Capacity (1/3 width) */}
        <Card padding="lg" className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 
                className="text-xl font-extrabold tracking-tight text-white"
                style={{ fontFamily: "'Outfit', 'Space Grotesk', sans-serif" }}
              >
                Module Processing
              </h3>
              <button className="text-hawk-muted hover:text-white transition-colors">
                <Sliders className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-hawk-muted">GPU acceleration &amp; model load index</p>
          </div>

          <div className="my-6 flex flex-col items-center justify-center">
            <ProgressRing value={94} size={170} strokeWidth={10} color="emerald" label="Peak Optimal" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="hawk-glass-card p-3 text-center border-white/10">
              <div className="text-[11px] font-bold text-hawk-muted">Inference Latency</div>
              <div className="mt-1 text-lg font-extrabold text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>11.4 ms</div>
            </div>
            <div className="hawk-glass-card p-3 text-center border-white/10">
              <div className="text-[11px] font-bold text-hawk-muted">VRAM Utilized</div>
              <div className="mt-1 text-lg font-extrabold text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>5.8 / 16 GB</div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Priority Detections & Camera Feed Status Row ─────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Priority Detections (Kept Mock per instructions not explicitly stating to fetch priority alerts, but we fetch from API in AlertsPage) */}
        <Card>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold tracking-tight text-white" style={{ fontFamily: "'Outfit', 'Space Grotesk', sans-serif" }}>
                Priority Security Detections
              </h3>
              <p className="mt-0.5 text-xs text-hawk-muted">Flagged events requiring operator review</p>
            </div>
          </div>

          <div className="space-y-3">
            {priorityAlerts.map((alert) => (
              <div key={alert.id} className="hawk-glass-card hawk-glass-card--interactive flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${alertIconStyle[alert.severity]}`}>
                    <AlertTriangle className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{alert.title}</h4>
                    <div className="mt-1 flex items-center gap-2 text-xs text-hawk-muted">
                      <span>{alert.camera}</span>
                      <span className="text-white/20">·</span>
                      <span>{alert.module}</span>
                      <span className="text-white/20">·</span>
                      <Clock className="inline h-3.5 w-3.5" />
                      <span>{alert.time}</span>
                    </div>
                  </div>
                </div>
                <Badge variant={alert.severity}>{alert.severity === "crimson" ? "Flagged" : "Pending"}</Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Camera Feed Status Grid (Fetched from Real API) */}
        <Card>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold tracking-tight text-white" style={{ fontFamily: "'Outfit', 'Space Grotesk', sans-serif" }}>
                Live Camera Grid Status
              </h3>
              <p className="mt-0.5 text-xs text-hawk-muted">Real-time health monitoring of connected RTSP streams</p>
            </div>
            <Badge variant="emerald" dot>
              {cameras.filter((c) => c.status === "online").length} Active
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {cameras.map((cam) => (
              <div key={cam.camera_id} className="hawk-glass-card hawk-glass-card--interactive flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`hawk-dot ${
                      cam.status === "online" ? "hawk-dot--emerald" : cam.status === "warning" ? "hawk-dot--amber" : "hawk-dot--crimson"
                    }`}
                  />
                  <div>
                    <p className="text-sm font-bold text-white">{cam.name}</p>
                    <p className="text-xs text-hawk-muted">ID: {cam.camera_id} · {cam.location}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`text-xs font-extrabold ${cam.status === "online" ? "text-hawk-emerald" : "text-hawk-crimson"}`}
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    {cam.status === "online" ? `30 FPS` : "OFFLINE"}
                  </span>
                </div>
              </div>
            ))}
            {cameras.length === 0 && <p className="text-sm text-hawk-muted col-span-2">Loading cameras...</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
