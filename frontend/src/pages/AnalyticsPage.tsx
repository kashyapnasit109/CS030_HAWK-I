import { useState } from "react";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { 
  Target, 
  Download, 
  TrendingUp 
} from "lucide-react";

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("7d");

  const dailyVolume = [
    { day: "MON", count: 184, height: 62 },
    { day: "TUE", count: 242, height: 82 },
    { day: "WED", count: 198, height: 67 },
    { day: "THU", count: 310, height: 95 },
    { day: "FRI", count: 275, height: 88 },
    { day: "SAT", count: 140, height: 48 },
    { day: "SUN", count: 120, height: 42 },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-hawk-sapphire animate-pulse" />
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-hawk-muted">
              DEEP TELEMETRY & ACCURACY BENCHMARKS
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-display font-extrabold text-white tracking-tight">
            Analytics Hub
          </h1>
          <p className="text-sm text-hawk-muted font-sans mt-1">
            Model accuracy benchmarks, detection volume distributions, and hardware inference latency
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-xl bg-white/[0.03] border border-white/10 p-1 text-xs font-mono">
            {["24h", "7d", "30d"].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range as any)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  timeRange === range ? "bg-hawk-sapphire text-white font-bold" : "text-hawk-muted hover:text-white"
                }`}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="md"
            icon={<Download className="h-3.5 w-3.5" />}
            onClick={() => alert("Exporting analytics report...")}
          >
            REPORT
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card padding="md" glowColor="sapphire">
          <span className="text-xs font-mono text-hawk-muted uppercase tracking-wider block">
            TOTAL INFERENCES ({timeRange})
          </span>
          <div className="text-3xl lg:text-4xl font-display font-extrabold text-white mt-2 tabular-nums">
            14,892
          </div>
          <p className="text-xs text-hawk-sapphire font-mono mt-1 font-semibold flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" /> +14.8% vs last window
          </p>
        </Card>

        <Card padding="md" glowColor="emerald">
          <span className="text-xs font-mono text-hawk-muted uppercase tracking-wider block">
            OVERALL ACCURACY
          </span>
          <div className="text-3xl lg:text-4xl font-display font-extrabold text-hawk-emerald mt-2 tabular-nums">
            99.1%
          </div>
          <p className="text-xs text-hawk-muted font-sans mt-1">
            Across 5 neural vision pipelines
          </p>
        </Card>

        <Card padding="md" glowColor="none">
          <span className="text-xs font-mono text-hawk-muted uppercase tracking-wider block">
            AVERAGE LATENCY
          </span>
          <div className="text-3xl lg:text-4xl font-display font-extrabold text-white mt-2 tabular-nums">
            14.2ms
          </div>
          <p className="text-xs text-hawk-muted font-sans mt-1">
            CUDA TensorRT acceleration
          </p>
        </Card>

        <Card padding="md" glowColor="burgundy">
          <span className="text-xs font-mono text-hawk-muted uppercase tracking-wider block">
            FALSE POSITIVES
          </span>
          <div className="text-3xl lg:text-4xl font-display font-extrabold text-hawk-burgundy mt-2 tabular-nums">
            0.18%
          </div>
          <p className="text-xs text-hawk-muted font-sans mt-1">
            Well below 0.5% SLA limit
          </p>
        </Card>
      </div>

      {/* Visualizers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Visualizer 1: Ingestion Volume */}
        <Card padding="lg" glowColor="sapphire" className="flex flex-col justify-between h-[400px]">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-base font-display font-bold text-white">
                Detection Ingestion Volume
              </h3>
              <p className="text-xs text-hawk-muted font-sans mt-0.5">
                Daily neural inference event distribution
              </p>
            </div>
            <Badge variant="sapphire" size="sm" dot>LIVE TELEMETRY</Badge>
          </div>

          <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-6 flex items-end justify-between gap-3">
            {dailyVolume.map((item) => (
              <div key={item.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <span className="text-[10px] font-mono text-white opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                  {item.count}
                </span>
                <div 
                  className="w-full bg-hawk-sapphire/20 group-hover:bg-hawk-sapphire border-t-2 border-hawk-sapphire rounded-t-lg transition-all duration-300"
                  style={{ height: `${item.height}%` }}
                />
                <span className="text-[10px] font-mono text-hawk-muted">
                  {item.day}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-between text-xs font-mono text-hawk-muted">
            <span>PEAK: 310 EVENTS (THU)</span>
            <span>MEAN: 210 EVENTS / DAY</span>
          </div>
        </Card>

        {/* Visualizer 2: Accuracy Matrix */}
        <Card padding="lg" glowColor="emerald" className="flex flex-col justify-between h-[400px]">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
                <Target className="h-4 w-4 text-hawk-emerald" /> Vision Model Accuracy Matrix
              </h3>
              <p className="text-xs text-hawk-muted font-sans mt-0.5">
                Precision benchmark per neural submodule
              </p>
            </div>
            <Badge variant="emerald" size="sm">99.1% AVG</Badge>
          </div>

          <div className="space-y-5 flex-1 flex flex-col justify-center">
            {[
              { label: "ANPR Number Plate Detection & OCR", accuracy: 99.4, color: "bg-hawk-emerald", time: "24ms" },
              { label: "Velocity & ByteTrack Trajectory", accuracy: 98.6, color: "bg-hawk-sapphire", time: "16ms" },
              { label: "Object Misplacement Differencing", accuracy: 99.0, color: "bg-hawk-emerald", time: "12ms" },
              { label: "Polygon Threat & Weapon Detection", accuracy: 98.2, color: "bg-hawk-amber", time: "18ms" },
              { label: "Cross-Zone Access Control Correlation", accuracy: 99.5, color: "bg-hawk-emerald", time: "14ms" },
            ].map((m, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-white font-medium">{m.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-hawk-muted">{m.time}</span>
                    <span className="text-hawk-emerald font-bold">{m.accuracy}%</span>
                  </div>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${m.color} rounded-full transition-all duration-700`} 
                    style={{ width: `${m.accuracy}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.04] flex justify-between text-xs font-mono text-hawk-muted">
            <span>BENCHMARK: HAWK-TEST-v4</span>
            <span>NVIDIA RTX 4090 TENSOR</span>
          </div>
        </Card>

      </div>

    </div>
  );
}
