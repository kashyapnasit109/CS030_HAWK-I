import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { MapPin, Camera } from "lucide-react";

const mockZones = [
  { name: "Main Entrance", cameras: 4, status: "Online" as const },
  { name: "Parking Complex", cameras: 6, status: "Online" as const },
  { name: "Server Room", cameras: 2, status: "Warning" as const },
  { name: "Loading Dock", cameras: 3, status: "Online" as const },
  { name: "North Perimeter", cameras: 5, status: "Online" as const },
  { name: "Executive Floor", cameras: 4, status: "Offline" as const },
];

export default function ZonesCamerasPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-hawk-muted">6 active zones <span className="opacity-50 mx-1">•</span> 24 cameras</span>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {mockZones.map((zone) => (
          <Card 
            key={zone.name} 
            interactive 
            glowColor={zone.status === "Online" ? "emerald" : zone.status === "Warning" ? "amber" : "crimson"}
            className="group cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border backdrop-blur-md transition-colors ${
                  zone.status === "Online" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/20" :
                  zone.status === "Warning" ? "bg-amber-500/10 border-amber-500/20 text-amber-400 group-hover:bg-amber-500/20" :
                  "bg-red-500/10 border-red-500/20 text-red-400 group-hover:bg-red-500/20"
                }`}>
                  <MapPin className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white tracking-wide" style={{ fontFamily: "'Clash Display', sans-serif" }}>
                    {zone.name}
                  </h3>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-hawk-muted">
                    <Camera className="h-3.5 w-3.5 opacity-70" strokeWidth={2} />
                    <span>{zone.cameras} feeds active</span>
                  </div>
                </div>
              </div>
              <Badge
                variant={zone.status === "Online" ? "emerald" : zone.status === "Warning" ? "amber" : "crimson"}
                dot
              >
                {zone.status}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
