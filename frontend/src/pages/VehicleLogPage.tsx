import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Car } from "lucide-react";

export default function VehicleLogPage() {
  const { token } = useAuth();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await fetch("/api/vehicles", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setVehicles(await res.json());
        }
      } catch (err) {
        console.error("Error fetching vehicles", err);
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchVehicles();
  }, [token]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Badge variant="blue" dot>All Records</Badge>
        <span className="text-sm font-medium text-hawk-muted">{vehicles.length} vehicles detected</span>
      </div>

      {/* Vehicle table */}
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.02]">
              <tr className="border-b border-white/[0.08] text-[11px] font-bold uppercase tracking-wider text-hawk-muted/70">
                <th className="px-5 py-4">License Plate</th>
                <th className="px-5 py-4">Registered Owner</th>
                <th className="px-5 py-4">Date Logged</th>
                <th className="px-5 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-4 text-hawk-muted text-center">Loading vehicles...</td>
                </tr>
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-4 text-hawk-muted text-center">No vehicles found.</td>
                </tr>
              ) : (
                vehicles.map((v) => (
                  <tr key={v.vehicle_id} className="transition-colors duration-200 hover:bg-white/[0.03]">
                    <td className="flex items-center gap-3 px-5 py-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <Car className="h-4 w-4" strokeWidth={1.75} />
                      </div>
                      <span className="font-mono font-medium text-white tracking-wide">{v.plate_number}</span>
                    </td>
                    <td className="px-5 py-4 text-hawk-muted">{v.owner_name || "Unknown"}</td>
                    <td className="px-5 py-4 text-hawk-muted">{new Date(v.registered_on).toLocaleDateString()}</td>
                    <td className="px-5 py-4">
                      <Badge
                        variant={v.owner_name ? "emerald" : "neutral"}
                        dot
                      >
                        {v.owner_name ? "Known" : "Unknown"}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
