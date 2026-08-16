import { useState } from "react";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { ThreatRadarCanvas } from "../components/ui/ThreatRadarCanvas";
import { 
  Search, 
  ArrowUpRight, 
  CheckCircle2, 
  MapPin, 
  Clock
} from "lucide-react";
import { Link } from "react-router-dom";

export default function AlertsPage() {
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>("INC-8942");

  const alerts = [
    {
      id: "INC-8942",
      title: "Human Intrusion in Restricted Vault",
      type: "UNAUTHORIZED_ENTRY",
      severity: "critical",
      zone: "Vault Sector B",
      camera: "Server Vault - CAM 02",
      time: "Just now (14:22:05 UTC)",
      summary: "Individual without authorized RFID/Keycard credentials detected crossing infrared threshold.",
      confidence: 98.4,
      status: "unresolved",
    },
    {
      id: "INC-8941",
      title: "Excessive Speed Limit Violation",
      type: "SPEED_VIOLATION",
      severity: "warning",
      zone: "Loading Bay North",
      camera: "Bay North - CAM 04",
      time: "2 min ago (14:20:12 UTC)",
      summary: "Dark sedan clocked at 84.6 km/h. Exceeded configured 40 km/h perimeter threshold by 111%.",
      confidence: 94.2,
      status: "unresolved",
    },
    {
      id: "INC-8940",
      title: "Unattended Object Stationary Alert",
      type: "UNATTENDED_OBJECT",
      severity: "warning",
      zone: "Terminal B Lobby",
      camera: "Terminal B - CAM 03",
      time: "14 min ago (14:08:44 UTC)",
      summary: "Black hardcase luggage detected motionless without owner in radius for > 120 seconds.",
      confidence: 89.1,
      status: "unresolved",
    },
    {
      id: "INC-8939",
      title: "Blacklisted Vehicle License Plate Flagged",
      type: "ANPR_MATCH",
      severity: "neutral",
      zone: "Main Perimeter Gate",
      camera: "Gate Entry - CAM 01",
      time: "32 min ago (13:50:00 UTC)",
      summary: "OCR engine matched plate DL-08-CC-8899 against security watchlist registry.",
      confidence: 97.8,
      status: "acknowledged",
    },
  ];

  const filteredAlerts = alerts.filter((alert) => {
    if (selectedSeverity !== "all" && alert.severity !== selectedSeverity) return false;
    if (
      searchQuery &&
      !alert.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !alert.id.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !alert.zone.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-hawk-burgundy animate-ping" />
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-hawk-muted">
              ACTIVE SURVEILLANCE RADAR & TRIAGE
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-display font-extrabold text-white tracking-tight">
            Threat Radar & Triage
          </h1>
          <p className="text-sm text-hawk-muted font-sans mt-1">
            Real-time geospatial incident scanner, priority threat classification, and forensic dispatch
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            icon={<CheckCircle2 className="h-3.5 w-3.5 text-hawk-emerald" />}
            onClick={() => alert("All non-critical threats acknowledged.")}
          >
            ACKNOWLEDGE ALL
          </Button>
        </div>
      </div>

      {/* Main Threat Radar & Triage Matrix Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* Left 5 Columns: Geospatial Scanning Radar */}
        <div className="xl:col-span-5 space-y-4">
          <ThreatRadarCanvas
            selectedId={selectedIncidentId}
            onSelectIncident={(id) => setSelectedIncidentId(id)}
          />

          <div className="p-4 rounded-2xl bg-[#0C0E14]/70 border border-white/[0.06] flex items-center justify-between text-xs font-mono text-hawk-muted">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-hawk-burgundy" /> 1 CRITICAL
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-hawk-amber" /> 2 WARNINGS
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-hawk-sapphire" /> 1 ANPR
            </span>
          </div>
        </div>

        {/* Right 7 Columns: Filtered Incident Ledger */}
        <div className="xl:col-span-7 space-y-4">
          
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0C0E14]/70 border border-white/[0.06]">
            <div className="flex items-center gap-2">
              {[
                { id: "all", label: "ALL" },
                { id: "critical", label: "CRITICAL" },
                { id: "warning", label: "WARNING" },
                { id: "neutral", label: "LOGS" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedSeverity(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                    selectedSeverity === tab.id
                      ? "bg-hawk-sapphire text-white font-bold shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                      : "bg-white/[0.02] text-hawk-muted hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="h-3.5 w-3.5 text-hawk-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by zone or ID..."
                className="bg-black/50 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder:text-white/30 font-sans outline-none focus:border-hawk-sapphire w-48"
              />
            </div>
          </div>

          {/* Incident Rows */}
          <div className="space-y-3">
            {filteredAlerts.map((alert) => {
              const isSelected = selectedIncidentId === alert.id;
              return (
                <Card
                  key={alert.id}
                  padding="md"
                  interactive
                  glowColor={
                    alert.severity === "critical"
                      ? "burgundy"
                      : alert.severity === "warning"
                        ? "amber"
                        : "sapphire"
                  }
                  onClick={() => setSelectedIncidentId(alert.id)}
                  className={`transition-all ${
                    isSelected ? "ring-2 ring-hawk-sapphire/60 bg-[#0E131F]" : ""
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            alert.severity === "critical"
                              ? "bg-hawk-burgundy animate-ping"
                              : alert.severity === "warning"
                                ? "bg-hawk-amber"
                                : "bg-hawk-sapphire"
                          }`}
                        />
                        <span className="text-xs font-mono font-bold text-white">
                          {alert.id}
                        </span>
                        <Badge
                          variant={
                            alert.severity === "critical"
                              ? "burgundy"
                              : alert.severity === "warning"
                                ? "amber"
                                : "neutral"
                          }
                          size="sm"
                        >
                          {alert.type}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-mono text-hawk-muted">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {alert.time}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-display font-bold text-white">
                        {alert.title}
                      </h3>
                      <p className="text-xs text-hawk-muted font-sans mt-1 leading-relaxed">
                        {alert.summary}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-xs font-mono text-hawk-muted">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-hawk-sapphire" /> {alert.zone} · {alert.camera}
                      </span>

                      <Link
                        to={`/events/${alert.id}`}
                        className="inline-flex items-center gap-1 text-hawk-sapphire hover:text-blue-400 font-bold"
                      >
                        Audit Evidence <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

        </div>

      </div>

    </div>
  );
}
