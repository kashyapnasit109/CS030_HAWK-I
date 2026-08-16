import { useState } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { 
  Search, 
  Sparkles, 
  Sliders, 
  MapPin, 
  ScanLine, 
  ChevronRight,
  Code
} from "lucide-react";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [similarityThreshold, setSimilarityThreshold] = useState(75);
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedResult, setSelectedResult] = useState<string | null>("EVT-9042");

  const samplePrompts = [
    "Black SUV driving over 70km/h near North Gate",
    "Person carrying backpack near vault after midnight",
    "Unattended luggage in terminal lobby for > 2 minutes",
    "License plate starting with MH12 entering Sector 1",
  ];

  const searchResults = [
    {
      id: "EVT-9042",
      type: "UNAUTHORIZED_ENTRY",
      title: "Human intrusion in Vault Sector B without badge",
      location: "Server Vault - CAM 02",
      time: "2026-08-16 14:22:05 UTC",
      relevance: 98.4,
      model: "all-MiniLM-L6-v2",
      tokens: ["person", "unauthorized", "vault", "after-hours"],
      json: {
        camera_id: "CAM-02-VAULT",
        confidence: 0.984,
        bounding_box: [420, 180, 580, 490],
        threat_level: "CRITICAL",
        gate_access_correlation: false
      }
    },
    {
      id: "VEL-4412",
      type: "SPEED_VIOLATION",
      title: "Dark sedan clocked at 84.6 km/h in restricted bay",
      location: "Loading Bay North - CAM 04",
      time: "2026-08-16 11:15:30 UTC",
      relevance: 94.2,
      model: "all-MiniLM-L6-v2",
      tokens: ["vehicle", "speeding", "84kmh", "sedan"],
      json: {
        camera_id: "CAM-04-BAY",
        calculated_speed_kmh: 84.6,
        speed_limit_kmh: 40.0,
        track_id: 194,
        plate: "MH-12-DE-1420"
      }
    },
    {
      id: "ANP-1082",
      type: "ANPR_MATCH",
      title: "License plate match MH-12-AB-3456 flagged",
      location: "Main Perimeter Entrance - CAM 01",
      time: "2026-08-16 09:45:12 UTC",
      relevance: 89.7,
      model: "all-MiniLM-L6-v2",
      tokens: ["plate", "anpr", "white-sedan", "whitelist"],
      json: {
        camera_id: "CAM-01-GATE",
        plate_text: "MH12AB3456",
        ocr_confidence: 0.962,
        registry_status: "AUTHORIZED"
      }
    },
    {
      id: "OBJ-5519",
      type: "UNATTENDED_OBJECT",
      title: "Static briefcase left stationary for 145 seconds",
      location: "Terminal B Lobby - CAM 03",
      time: "2026-08-16 08:12:44 UTC",
      relevance: 81.3,
      model: "all-MiniLM-L6-v2",
      tokens: ["briefcase", "unattended", "lobby", "stationary"],
      json: {
        camera_id: "CAM-03-LOBBY",
        stationary_duration_sec: 145,
        reference_frame_diff: 0.42
      }
    }
  ];

  const filteredResults = searchResults.filter(res => {
    if (activeFilter !== "all" && res.type !== activeFilter) return false;
    return res.relevance >= similarityThreshold;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-16">
      
      {/* ═══════════════════════════════════════════════════════════
          HERO VECTOR QUERY TERMINAL: ULTRA-CLEAN & SPACIOUS
          ═══════════════════════════════════════════════════════════ */}
      <div className="text-center space-y-4 pt-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-hawk-sapphire/10 border border-hawk-sapphire/20 text-hawk-sapphire text-xs font-mono">
          <Sparkles className="h-3.5 w-3.5" />
          <span>NATURAL LANGUAGE VECTOR EMBEDDINGS</span>
        </div>
        <h1 className="text-3xl lg:text-5xl font-display font-extrabold text-white tracking-tight">
          Semantic Intelligence Query
        </h1>
        <p className="text-sm text-hawk-muted font-sans max-w-xl mx-auto">
          Query multimodal CCTV detection events using natural language. Embedded via <strong className="text-white">all-MiniLM-L6-v2</strong>.
        </p>

        {/* Floating Search Input Capsule */}
        <div className="relative max-w-2xl mx-auto mt-8">
          <div className="relative bg-[#0C0E14] rounded-2xl border border-white/10 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex items-center gap-3">
            <div className="flex-1 flex items-center pl-4 gap-3">
              <Search className="h-5 w-5 text-hawk-sapphire shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Describe an event, vehicle, license plate, or behavior..."
                className="w-full bg-transparent py-3 text-base text-white placeholder:text-white/30 outline-none font-sans"
              />
            </div>
            
            <div className="flex items-center gap-2 pr-1">
              <Button 
                variant="primary" 
                size="md" 
                icon={<Sparkles className="h-3.5 w-3.5" />}
                onClick={() => {}}
              >
                SEARCH
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Prompt Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {samplePrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => setQuery(p)}
              className="px-3 py-1.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 text-xs text-hawk-muted hover:text-white transition-all cursor-pointer"
            >
              "{p}"
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          CONTROLS BAR: CLEAN & UNCLUTTERED
          ═══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0C0E14]/60 border border-white/[0.06]">
        
        {/* Module Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "all", label: "ALL EVENTS" },
            { id: "UNAUTHORIZED_ENTRY", label: "ACCESS BREACH" },
            { id: "SPEED_VIOLATION", label: "VELOCITY" },
            { id: "ANPR_MATCH", label: "PLATES" },
            { id: "UNATTENDED_OBJECT", label: "OBJECTS" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                activeFilter === f.id
                  ? "bg-hawk-sapphire text-white font-bold shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                  : "bg-white/[0.02] text-hawk-muted hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Confidence Threshold Slider */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-hawk-muted">
            <Sliders className="h-3.5 w-3.5 text-hawk-emerald" />
            <span>THRESHOLD:</span>
            <strong className="text-white font-bold">{similarityThreshold}%</strong>
          </div>
          <input
            type="range"
            min={50}
            max={99}
            value={similarityThreshold}
            onChange={(e) => setSimilarityThreshold(Number(e.target.value))}
            className="w-28 accent-hawk-emerald cursor-pointer"
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SEARCH RESULTS FEED
          ═══════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1 text-xs font-mono text-hawk-muted">
          <span>SURFACED EVENTS ({filteredResults.length})</span>
          <span>COSINE DISTANCE &le; {(1 - similarityThreshold / 100).toFixed(2)}</span>
        </div>

        <div className="space-y-3">
          {filteredResults.map((result) => {
            const isExpanded = selectedResult === result.id;
            return (
              <Card
                key={result.id}
                padding="none"
                interactive
                glowColor={
                  result.type === "UNAUTHORIZED_ENTRY"
                    ? "burgundy"
                    : result.type === "SPEED_VIOLATION"
                      ? "amber"
                      : "sapphire"
                }
                onClick={() => setSelectedResult(isExpanded ? null : result.id)}
                className={`overflow-hidden transition-all ${
                  isExpanded ? "ring-2 ring-hawk-sapphire/50" : ""
                }`}
              >
                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
                  
                  {/* Left: Icon & Narrative */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`mt-1 h-10 w-10 rounded-xl flex items-center justify-center border shrink-0 ${
                      result.type === "UNAUTHORIZED_ENTRY"
                        ? "bg-hawk-burgundy/10 border-hawk-burgundy/30 text-hawk-burgundy"
                        : result.type === "SPEED_VIOLATION"
                          ? "bg-hawk-amber/10 border-hawk-amber/30 text-hawk-amber"
                          : "bg-hawk-sapphire/10 border-hawk-sapphire/30 text-hawk-sapphire"
                    }`}>
                      <ScanLine className="h-5 w-5" />
                    </div>

                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-white">
                          {result.id}
                        </span>
                        <Badge
                          variant={
                            result.type === "UNAUTHORIZED_ENTRY"
                              ? "burgundy"
                              : result.type === "SPEED_VIOLATION"
                                ? "amber"
                                : "sapphire"
                          }
                          size="sm"
                        >
                          {result.type}
                        </Badge>
                      </div>

                      <h3 className="text-base font-display font-bold text-white">
                        {result.title}
                      </h3>

                      <div className="flex items-center gap-4 text-xs font-mono text-hawk-muted">
                        <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-hawk-sapphire" /> {result.location}</span>
                        <span>{result.time}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Relevance Match */}
                  <div className="flex items-center gap-5 shrink-0 justify-end">
                    <div className="text-right">
                      <div className="text-3xl font-display font-extrabold text-hawk-emerald tracking-tight tabular-nums">
                        {result.relevance}%
                      </div>
                      <span className="text-[10px] font-mono text-hawk-muted uppercase tracking-wider">
                        MATCH SCORE
                      </span>
                    </div>

                    <div className="h-8 w-8 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/70">
                      <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${isExpanded ? "rotate-90" : ""}`} />
                    </div>
                  </div>

                </div>

                {/* Expanded Payload Drawer */}
                {isExpanded && (
                  <div className="border-t border-white/[0.06] p-6 bg-black/40 space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono text-hawk-muted">
                      <span className="flex items-center gap-1.5">
                        <Code className="h-3.5 w-3.5 text-hawk-sapphire" /> RAW DETECTION VECTOR PAYLOAD
                      </span>
                      <span className="text-hawk-emerald">EMBEDDING DIM: 384</span>
                    </div>

                    <pre className="p-4 rounded-xl bg-black border border-white/10 font-mono text-xs text-white/90 overflow-x-auto custom-scrollbar">
                      {JSON.stringify(result.json, null, 2)}
                    </pre>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

    </div>
  );
}
