import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Video, Maximize2 } from "lucide-react";

export default function LiveViewPage() {
  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="emerald" dot>Live Streaming</Badge>
          <span className="text-sm font-medium text-hawk-muted">24 cameras connected <span className="opacity-50 mx-1">•</span> 6 active feeds</span>
        </div>
        <button className="flex items-center gap-2 text-sm text-hawk-muted hover:text-white transition-colors">
            <Maximize2 className="h-4 w-4" /> Fullscreen Matrix
        </button>
      </div>

      {/* Camera grid placeholder */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 flex-1 min-h-0 pb-10">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} padding="none" className="group overflow-hidden flex flex-col border-white/5 bg-black/20 hover:border-blue-500/30 transition-all duration-300">
            <div className="h-64 flex items-center justify-center bg-black/40 relative">
              <Video className="h-10 w-10 text-white/10" strokeWidth={1.5} />
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
              
              {/* Camera label overlay */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                 <span className="text-sm font-semibold text-white tracking-wide" style={{ fontFamily: "'Clash Display', sans-serif" }}>CAM-0{i + 1}</span>
                 <Badge variant={i === 4 ? "amber" : "emerald"} dot>
                   {i === 4 ? "Degraded" : "Online"}
                 </Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
