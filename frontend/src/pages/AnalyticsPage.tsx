import { Card } from "../components/ui/Card";
import { BarChart3, Activity, Clock } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <Card padding="lg" className="border-blue-500/20">
        <h3 className="mb-4 font-semibold text-xl text-white tracking-wide" style={{ fontFamily: "'Clash Display', sans-serif" }}>
          Detection Trends
        </h3>
        <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20">
          <div className="flex flex-col items-center gap-3 opacity-60">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
               <BarChart3 className="h-5 w-5 text-blue-400" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-medium text-white tracking-wide" style={{ fontFamily: "'Clash Display', sans-serif" }}>Analytics charts (recharts) — coming soon</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card padding="lg" className="border-violet-500/20">
          <h3 className="mb-4 font-semibold text-lg text-white tracking-wide" style={{ fontFamily: "'Clash Display', sans-serif" }}>
            Zone Heatmap
          </h3>
          <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20">
            <div className="flex flex-col items-center gap-3 opacity-60">
                <Activity className="h-5 w-5 text-violet-400" strokeWidth={1.75} />
                <p className="text-sm text-hawk-muted">Heatmap visualization — coming soon</p>
            </div>
          </div>
        </Card>

        <Card padding="lg" className="border-emerald-500/20">
          <h3 className="mb-4 font-semibold text-lg text-white tracking-wide" style={{ fontFamily: "'Clash Display', sans-serif" }}>
            Peak Activity Hours
          </h3>
          <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20">
             <div className="flex flex-col items-center gap-3 opacity-60">
                <Clock className="h-5 w-5 text-emerald-400" strokeWidth={1.75} />
                <p className="text-sm text-hawk-muted">Time distribution chart — coming soon</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
