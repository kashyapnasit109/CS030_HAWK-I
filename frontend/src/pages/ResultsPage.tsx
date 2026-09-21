import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Film, 
  Search, 
  Filter, 
  ShieldAlert, 
  Gauge, 
  ScanLine, 
  Boxes, 
  LogIn, 
  Camera, 
  Clock, 
  Play, 
  X, 
  Download, 
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  Code,
  Layers,
  Sparkles
} from "lucide-react";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { StatCard } from "../components/ui/StatCard";

interface DetectionResultItem {
  event_id: number;
  camera_id: number;
  camera_name?: string;
  camera_location?: string;
  zone_type?: string;
  source_module: string;
  event_type: string;
  module?: string;
  object_type?: string;
  confidence?: number;
  bounding_box?: { x: number; y: number; w: number; h: number } | [number, number, number, number] | any;
  detected_at: string;
  description?: string;
  metadata?: any;
  severity?: "danger" | "warning" | "info" | string;
  alert_id?: number | null;
  alert_type?: string | null;
  alert_status?: string | null;
  clip_id?: number;
  clip_path?: string;
  thumbnail_path?: string;
  duration_sec?: number;
  file_size_kb?: number;
}

interface SummaryData {
  total_results: number;
  recent_24h: number;
  total_clips: number;
  active_cameras: number;
  by_module: Record<string, number>;
  by_severity: Record<string, number>;
}

export default function ResultsPage() {
  const [results, setResults] = useState<DetectionResultItem[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    total_results: 0,
    recent_24h: 0,
    total_clips: 0,
    active_cameras: 0,
    by_module: {},
    by_severity: {}
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedResult, setSelectedResult] = useState<DetectionResultItem | null>(null);

  // Filter & Search states
  const [activeModule, setActiveModule] = useState<string>("all");
  const [activeSeverity, setActiveSeverity] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Fetch results and summary
  const fetchResults = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: "12",
        module: activeModule,
        severity: activeSeverity,
        search: searchQuery,
        sort: sortBy
      });

      const res = await fetch(`http://localhost:3000/api/results?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setTotalPages(data.total_pages || 1);
      }
    } catch (err) {
      console.warn("Could not fetch detection results, using mock data", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/results/summary");
      if (res.ok) {
        const data = await res.json();
        if (data.summary) {
          setSummary(data.summary);
        }
      }
    } catch (err) {
      console.warn("Could not fetch summary data", err);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    fetchResults();
  }, [activeModule, activeSeverity, searchQuery, sortBy, page]);

  // Helpers
  const getModuleIcon = (mod: string) => {
    switch (mod?.toLowerCase()) {
      case "velocity":
        return <Gauge className="h-4 w-4 text-hawk-sapphire" />;
      case "anpr":
        return <ScanLine className="h-4 w-4 text-hawk-emerald" />;
      case "threat":
        return <ShieldAlert className="h-4 w-4 text-hawk-burgundy" />;
      case "misplacement":
        return <Boxes className="h-4 w-4 text-hawk-amber" />;
      case "entry":
        return <LogIn className="h-4 w-4 text-purple-400" />;
      default:
        return <Film className="h-4 w-4 text-hawk-sapphire" />;
    }
  };

  const getSeverityBadge = (sev?: string) => {
    switch (sev?.toLowerCase()) {
      case "danger":
      case "critical":
        return <Badge variant="burgundy" size="sm" dot>CRITICAL</Badge>;
      case "warning":
        return <Badge variant="amber" size="sm" dot>WARNING</Badge>;
      default:
        return <Badge variant="sapphire" size="sm" dot>INFO</Badge>;
    }
  };

  const formatTimestamp = (ts: string) => {
    try {
      const date = new Date(ts);
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      });
    } catch {
      return ts;
    }
  };

  return (
    <div className="max-w-[1700px] mx-auto space-y-8 pb-16">
      
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-white/[0.08] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-hawk-sapphire/10 border border-hawk-sapphire/20 text-hawk-sapphire">
              <Film className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-display font-extrabold text-white tracking-tight">
                Detection Results Portal
              </h1>
              <p className="text-xs text-hawk-muted font-mono mt-0.5">
                AUTOMATED CCTV EVIDENCE ARCHIVE & ANNOTATED TELEMETRY CLIPS
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="md" 
            icon={<RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />}
            onClick={() => { fetchSummary(); fetchResults(); }}
          >
            SYNC ARCHIVE
          </Button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Evidence Events"
          value={summary.total_results || results.length}
          subtext="Persistent event records"
          icon={<Film className="h-5 w-5" />}
          accentColor="sapphire"
        />
        <StatCard
          label="24h Detections"
          value={summary.recent_24h || results.length}
          subtext="Processed in last window"
          icon={<Clock className="h-5 w-5" />}
          accentColor="emerald"
        />
        <StatCard
          label="Clipped Video Feeds"
          value={summary.total_clips || results.length}
          subtext="Annotated MP4 recordings"
          icon={<Sparkles className="h-5 w-5" />}
          accentColor="amber"
        />
        <StatCard
          label="Monitored Cameras"
          value={summary.active_cameras || 4}
          subtext="Multi-angle optical matrix"
          icon={<Camera className="h-5 w-5" />}
          accentColor="burgundy"
        />
      </div>

      {/* Filter & Controls Panel */}
      <Card padding="md" className="space-y-4 bg-[#090C16]/90 border-white/[0.08]">
        
        {/* Module Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] pb-4">
          <span className="text-[11px] font-mono font-bold text-hawk-muted uppercase tracking-wider mr-2 flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-hawk-sapphire" /> Pipeline:
          </span>
          {[
            { id: "all", label: "All Modules" },
            { id: "velocity", label: "Velocity Tracking" },
            { id: "anpr", label: "ANPR / Plate OCR" },
            { id: "threat", label: "Threat Matrix" },
            { id: "misplacement", label: "Object Spatial" },
            { id: "entry", label: "Access Control" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveModule(tab.id); setPage(1); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all duration-200 ${
                activeModule === tab.id
                  ? "bg-hawk-sapphire text-white shadow-[0_0_15px_rgba(59,130,246,0.35)] border border-hawk-sapphire/50"
                  : "text-hawk-muted hover:text-white hover:bg-white/[0.04] border border-white/[0.05]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search, Severity, and Sorting Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          
          {/* Search Input */}
          <div className="md:col-span-6 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-hawk-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Search by object, license plate, description, or camera location..."
              className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/[0.08] rounded-xl text-xs text-white placeholder-hawk-muted/50 focus:outline-none focus:border-hawk-sapphire/60 focus:ring-1 focus:ring-hawk-sapphire/30 transition-all font-sans"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-hawk-muted hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Severity Dropdown */}
          <div className="md:col-span-3">
            <select
              value={activeSeverity}
              onChange={(e) => { setActiveSeverity(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-black/40 border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-hawk-sapphire/60 font-mono cursor-pointer"
            >
              <option value="all" className="bg-[#0b0f19]">All Severity Levels</option>
              <option value="danger" className="bg-[#0b0f19]">Critical / Danger</option>
              <option value="warning" className="bg-[#0b0f19]">Warning</option>
              <option value="info" className="bg-[#0b0f19]">Informational</option>
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="md:col-span-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 bg-black/40 border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-hawk-sapphire/60 font-mono cursor-pointer"
            >
              <option value="newest" className="bg-[#0b0f19]">Sort: Newest First</option>
              <option value="oldest" className="bg-[#0b0f19]">Sort: Oldest First</option>
              <option value="highest_severity" className="bg-[#0b0f19]">Sort: Highest Severity</option>
            </select>
          </div>

        </div>

      </Card>

      {/* Results Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="h-8 w-8 text-hawk-sapphire animate-spin" />
          <span className="text-xs font-mono text-hawk-muted uppercase tracking-wider">
            Querying Optical Intelligence Vault...
          </span>
        </div>
      ) : results.length === 0 ? (
        <Card padding="lg" className="text-center py-16 space-y-4">
          <div className="inline-flex p-4 rounded-full bg-white/[0.03] border border-white/5 text-hawk-muted">
            <Film className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-display font-bold text-white">No Detection Results Found</h3>
            <p className="text-xs text-hawk-muted max-w-md mx-auto">
              No matching video clips or detection events were located for the selected filter parameters.
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => { setActiveModule("all"); setActiveSeverity("all"); setSearchQuery(""); }}
          >
            Reset Filters
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((item) => {
            return (
              <motion.div
                key={item.event_id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card 
                  padding="none" 
                  interactive 
                  className="overflow-hidden group hover:border-hawk-sapphire/50 transition-all duration-300 flex flex-col h-full bg-[#080B14]/90"
                >
                  
                  {/* Media Preview Box */}
                  <div 
                    className="relative aspect-video bg-black/80 flex items-center justify-center overflow-hidden cursor-pointer group/thumb"
                    onClick={() => setSelectedResult(item)}
                  >
                    {/* Thumbnail or Fallback Pattern */}
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-black to-[#05070e] relative">
                      
                      {/* Grid background simulation */}
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:16px_16px]" />
                      
                      {/* Central Play Indicator */}
                      <div className="relative z-10 p-3.5 rounded-full bg-hawk-sapphire/20 border border-hawk-sapphire/40 text-hawk-sapphire group-hover/thumb:scale-110 group-hover/thumb:bg-hawk-sapphire group-hover/thumb:text-white transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                        <Play className="h-6 w-6 fill-current translate-x-0.5" />
                      </div>

                      {/* Top HUD Badges */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-mono text-white font-bold">
                          {getModuleIcon(item.source_module)}
                          <span className="uppercase">{item.source_module}</span>
                        </div>
                        {getSeverityBadge(item.severity)}
                      </div>

                      {/* Bottom duration & timestamp badge */}
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
                        <span className="text-[9.5px] font-mono text-white/80 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded border border-white/10">
                          {item.camera_name || `CAM-0${item.camera_id}`}
                        </span>
                        <span className="text-[9.5px] font-mono text-hawk-emerald font-bold bg-black/70 backdrop-blur-md px-2 py-0.5 rounded border border-hawk-emerald/30">
                          {item.duration_sec ? `${item.duration_sec}s CLIP` : "MP4 READY"}
                        </span>
                      </div>

                    </div>
                  </div>

                  {/* Card Content Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono text-hawk-muted">
                        <span className="text-white/60">EVENT #{item.event_id}</span>
                        <span>{formatTimestamp(item.detected_at)}</span>
                      </div>

                      <h4 className="text-sm font-display font-bold text-white group-hover:text-hawk-sapphire transition-colors line-clamp-1">
                        {item.event_type.replace(/_/g, ' ').toUpperCase()}
                      </h4>

                      <p className="text-xs text-hawk-muted font-sans line-clamp-2 leading-relaxed">
                        {item.description || "Automatic detection event generated by HAWK-I vision pipeline."}
                      </p>
                    </div>

                    {/* Metadata Pill Tags */}
                    <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {item.confidence && (
                          <span className="text-[10px] font-mono text-hawk-sapphire bg-hawk-sapphire/10 border border-hawk-sapphire/20 px-2 py-0.5 rounded">
                            {(item.confidence * 100).toFixed(1)}% CONF
                          </span>
                        )}
                        {item.object_type && (
                          <span className="text-[10px] font-mono text-white/70 bg-white/[0.04] border border-white/10 px-2 py-0.5 rounded uppercase">
                            {item.object_type}
                          </span>
                        )}
                      </div>

                      <Button 
                        variant="secondary" 
                        size="sm" 
                        icon={<ChevronRight className="h-3 w-3" />}
                        onClick={() => setSelectedResult(item)}
                      >
                        VIEW RESULT
                      </Button>
                    </div>

                  </div>

                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="px-4 text-xs font-mono text-hawk-muted">
            Page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong>
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      )}

      {/* RESULT DETAIL MODAL VIEW */}
      <AnimatePresence>
        {selectedResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-black/80 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25 }}
              className="relative w-full max-w-5xl max-h-[90vh] bg-[#0A0D18] border border-white/10 rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col"
            >
              
              {/* Modal Topbar */}
              <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-gradient-to-r from-white/[0.03] to-transparent">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-hawk-sapphire/10 border border-hawk-sapphire/20 text-hawk-sapphire">
                    {getModuleIcon(selectedResult.source_module)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-display font-extrabold text-white">
                        Detection Evidence #{selectedResult.event_id}
                      </h3>
                      {getSeverityBadge(selectedResult.severity)}
                    </div>
                    <span className="text-[11px] font-mono text-hawk-muted">
                      {selectedResult.source_module.toUpperCase()} PIPELINE • CAMERA {selectedResult.camera_name || `CAM-0${selectedResult.camera_id}`}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedResult(null)}
                  className="p-2 rounded-xl text-hawk-muted hover:text-white hover:bg-white/[0.05] transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body: Two Columns */}
              <div className="overflow-y-auto p-6 space-y-6 flex-1 custom-scrollbar">
                
                {/* Upper: Video Player Viewport */}
                <div className="space-y-3">
                  <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/[0.08] shadow-2xl flex items-center justify-center">
                    
                    {/* HTML5 Video Streaming Player */}
                    <video
                      controls
                      autoPlay
                      loop
                      className="w-full h-full object-contain"
                      src={`http://localhost:3000/api/results/${selectedResult.event_id}/clip`}
                    >
                      Your browser does not support HTML5 video streaming.
                    </video>

                    {/* HUD Telemetry Watermark */}
                    <div className="absolute top-3 left-3 pointer-events-none flex items-center gap-2 z-10">
                      <div className="px-2 py-1 rounded bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-mono text-white flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-hawk-emerald animate-ping" />
                        <span>OPTICAL EVIDENCE STREAM</span>
                      </div>
                    </div>

                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-hawk-muted bg-white/[0.02] px-4 py-2 rounded-xl border border-white/[0.04]">
                    <span>TIMESTAMP: {formatTimestamp(selectedResult.detected_at)}</span>
                    <span>ENCODING: MP4 / H.264 (Range Request Supported)</span>
                  </div>
                </div>

                {/* Lower: Metadata & Forensic Intelligence Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Left: Forensic Narrative & Core Telemetry */}
                  <div className="space-y-4">
                    <Card padding="md" className="space-y-3 bg-white/[0.02]">
                      <span className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-hawk-sapphire" /> Forensic Narrative
                      </span>
                      <p className="text-xs text-white/80 font-sans leading-relaxed">
                        {selectedResult.description || "Automatic detection event generated by HAWK-I vision pipeline."}
                      </p>
                    </Card>

                    <Card padding="md" className="space-y-3 bg-white/[0.02]">
                      <span className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <SlidersHorizontal className="h-3.5 w-3.5 text-hawk-emerald" /> Detection Diagnostics
                      </span>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                          <span className="text-hawk-muted text-[10px] block">EVENT TYPE</span>
                          <span className="text-white font-bold">{selectedResult.event_type}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                          <span className="text-hawk-muted text-[10px] block">CONFIDENCE</span>
                          <span className="text-hawk-sapphire font-bold">
                            {selectedResult.confidence ? `${(selectedResult.confidence * 100).toFixed(1)}%` : "N/A"}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                          <span className="text-hawk-muted text-[10px] block">TARGET OBJECT</span>
                          <span className="text-white uppercase font-bold">{selectedResult.object_type || "UNKNOWN"}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                          <span className="text-hawk-muted text-[10px] block">SEVERITY LEVEL</span>
                          <span className="text-hawk-burgundy uppercase font-bold">{selectedResult.severity || "INFO"}</span>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Right: Structured Event Metadata JSON */}
                  <div className="space-y-4">
                    <Card padding="md" className="space-y-3 bg-white/[0.02] flex flex-col h-full">
                      <div className="flex items-center justify-between text-xs font-mono text-hawk-muted">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <Code className="h-3.5 w-3.5 text-hawk-sapphire" /> Tensor Metadata
                        </span>
                        <span className="text-[10px] text-hawk-emerald">CANONICAL SCHEMA</span>
                      </div>

                      <pre className="p-3.5 rounded-xl bg-black/70 border border-white/5 font-mono text-[10.5px] text-white/80 overflow-x-auto flex-1 max-h-[220px] custom-scrollbar">
                        {JSON.stringify(
                          {
                            event_id: selectedResult.event_id,
                            source_module: selectedResult.source_module,
                            bounding_box: selectedResult.bounding_box,
                            metadata: selectedResult.metadata,
                            clip_id: selectedResult.clip_id,
                            clip_path: selectedResult.clip_path
                          },
                          null,
                          2
                        )}
                      </pre>
                    </Card>
                  </div>

                </div>

              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 border-t border-white/[0.08] bg-[#070912] flex items-center justify-between">
                <span className="text-[11px] font-mono text-hawk-muted">
                  HAWK-I EVIDENCE ID: <strong className="text-white">{selectedResult.event_id}</strong>
                </span>
                
                <div className="flex items-center gap-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    icon={<Download className="h-3.5 w-3.5" />}
                    onClick={() => {
                      window.open(`http://localhost:3000/api/results/${selectedResult.event_id}/clip`, '_blank');
                    }}
                  >
                    DOWNLOAD CLIP
                  </Button>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={() => setSelectedResult(null)}
                  >
                    CLOSE
                  </Button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
