import { useState } from "react";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { 
  Download, 
  Search
} from "lucide-react";

export default function VehicleLogPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "authorized" | "blacklisted">("all");

  const vehicleLogs = [
    { id: "LPR-0941", plate: "MH-12-EX-4001", owner: "Executive Diplomatic Fleet", make: "Mercedes-Maybach S680 (Obsidian Black)", camera: "Main Gate Checkpoint", time: "14:15:30 UTC", status: "authorized", zone: "Sector 1 Gate", confidence: 99.4 },
    { id: "LPR-0940", plate: "DL-08-CC-8899", owner: "Unidentified / Flagged", make: "Sedan (Tinted Glass)", camera: "Loading Bay North", time: "13:42:15 UTC", status: "blacklisted", zone: "Sector 4 Bay", confidence: 94.1 },
    { id: "LPR-0939", plate: "KA-05-PT-7721", owner: "Perimeter Security Division", make: "Ford Tactical Interceptor (Matte Grey)", camera: "East Perimeter Gate", time: "12:12:00 UTC", status: "authorized", zone: "Sector 2 Gate", confidence: 99.0 },
    { id: "LPR-0938", plate: "GJ-01-AR-9900", owner: "Armored Vault Operations", make: "Scania High-Security Transport (Armored)", camera: "Main Gate Checkpoint", time: "11:30:45 UTC", status: "authorized", zone: "Sector 1 Gate", confidence: 98.6 },
    { id: "LPR-0937", plate: "MH-14-DE-5521", owner: "Industrial Supply Logistics", make: "Volvo Heavy Transport Van", camera: "North Cargo Gate", time: "10:15:10 UTC", status: "authorized", zone: "Sector 3 Cargo", confidence: 96.2 },
  ];

  const filteredLogs = vehicleLogs.filter(log => {
    if (filterType !== "all" && log.status !== filterType) return false;
    if (searchTerm && !log.plate.toLowerCase().includes(searchTerm.toLowerCase()) && !log.owner.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-hawk-sapphire animate-pulse" />
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-hawk-muted">
              ANPR DATABASE & AUDIT LOGS
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-display font-extrabold text-white tracking-tight">
            Vehicle Registry
          </h1>
          <p className="text-sm text-hawk-muted font-sans mt-1">
            Immutable audit logs of license plate recognitions and security whitelist/blacklist authorizations
          </p>
        </div>

        <Button
          variant="outline"
          size="md"
          icon={<Download className="h-3.5 w-3.5" />}
          onClick={() => alert("Exporting vehicle registry to CSV...")}
        >
          EXPORT CSV
        </Button>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0C0E14]/60 border border-white/[0.06]">
        <div className="flex items-center gap-2">
          {[
            { id: "all", label: "ALL VEHICLES" },
            { id: "authorized", label: "AUTHORIZED" },
            { id: "blacklisted", label: "BLACKLISTED" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                filterType === tab.id
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
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search plate or owner..."
            className="bg-black/40 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder:text-white/30 font-sans outline-none focus:border-hawk-sapphire w-64"
          />
        </div>
      </div>

      {/* Registry Table */}
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="bg-black/40 border-b border-white/[0.06] font-mono text-[10px] text-hawk-muted uppercase tracking-wider">
                <th className="px-6 py-4 font-bold">Log ID</th>
                <th className="px-6 py-4 font-bold">License Plate</th>
                <th className="px-6 py-4 font-bold">Registered Owner</th>
                <th className="px-6 py-4 font-bold">Camera Node</th>
                <th className="px-6 py-4 font-bold">Timestamp</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold text-right">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-hawk-sapphire font-bold">
                    {log.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-3 py-1 rounded-lg bg-black/80 border border-white/15 text-white font-mono font-black text-sm">
                      {log.plate}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-bold text-white text-xs">{log.owner}</div>
                    <div className="text-[11px] text-hawk-muted font-sans mt-0.5">{log.make}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-hawk-muted">
                    <span className="text-white/80 block">{log.camera}</span>
                    <span className="text-[10px] text-hawk-muted font-mono">{log.zone}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-white/70">
                    {log.time}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={log.status === "authorized" ? "emerald" : "burgundy"} size="sm" dot>
                      {log.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-hawk-emerald font-bold">
                    {log.confidence}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-black/40 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-hawk-muted">
          <span>SHOWING {filteredLogs.length} OF {vehicleLogs.length} LOGGED VEHICLES</span>
          <span>ENCRYPTION: ACTIVE</span>
        </div>
      </Card>

    </div>
  );
}
