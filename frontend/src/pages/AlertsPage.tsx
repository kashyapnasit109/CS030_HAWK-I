import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Bell, Filter, CheckCircle2 } from "lucide-react";
import type { BadgeVariant } from "../components/ui/Badge";

export default function AlertsPage() {
  const { token, user } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      const res = await fetch("/api/alerts", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setAlerts(await res.json());
      }
    } catch (err) {
      console.error("Error fetching alerts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchAlerts();
  }, [token]);

  const handleUpdateStatus = async (alertId: number, currentStatus: string) => {
    if (user?.role === "viewer") {
      alert("Error: Viewer role is not permitted to modify alerts.");
      return;
    }

    const newStatus = currentStatus === "open" ? "acknowledged" : "resolved";
    try {
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchAlerts();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update alert");
      }
    } catch (err) {
      console.error("Error updating alert", err);
    }
  };

  const handleFalsePositive = async (alertId: number) => {
    if (user?.role === "viewer") {
      alert("Error: Viewer role is not permitted to modify alerts.");
      return;
    }

    try {
      const res = await fetch(`/api/alerts/${alertId}/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ note: "Marked from Dashboard" })
      });
      if (res.ok) {
        fetchAlerts();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to mark false positive");
      }
    } catch (err) {
      console.error("Error marking false positive", err);
    }
  };

  const getSeverityStyle = (severity: string): BadgeVariant => {
    return severity === "danger" ? "crimson" : severity === "warning" ? "amber" : "blue";
  };

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="crimson" dot>{alerts.filter(a => a.severity === 'danger').length} High</Badge>
          <Badge variant="amber" dot>{alerts.filter(a => a.severity === 'warning').length} Medium</Badge>
          <Badge variant="blue" dot>{alerts.filter(a => a.severity === 'info').length} Info</Badge>
        </div>
        <Button variant="secondary" size="sm" icon={<Filter className="h-3.5 w-3.5" strokeWidth={1.75} />}>
          Filters
        </Button>
      </div>

      {/* Alert list */}
      <div className="space-y-3">
        {loading ? (
          <p className="text-hawk-muted">Loading alerts...</p>
        ) : alerts.length === 0 ? (
          <p className="text-hawk-muted">No alerts found.</p>
        ) : (
          alerts.map((alert) => {
            const mappedSeverity = getSeverityStyle(alert.severity);
            return (
              <Card key={alert.alert_id} padding="sm" className="flex flex-col sm:flex-row sm:items-center justify-between group gap-4" interactive>
                <div className="flex items-center gap-4 flex-1">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border backdrop-blur-md transition-colors ${
                    mappedSeverity === "crimson" ? "bg-red-500/10 border-red-500/20 text-red-400 group-hover:bg-red-500/20" :
                    mappedSeverity === "amber" ? "bg-amber-500/10 border-amber-500/20 text-amber-400 group-hover:bg-amber-500/20" :
                    "bg-blue-500/10 border-blue-500/20 text-blue-400 group-hover:bg-blue-500/20"
                  }`}>
                    <Bell className="h-4 w-4" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-white tracking-wide" style={{ fontFamily: "'Clash Display', sans-serif" }}>
                      {alert.alert_type}
                    </p>
                    <p className="mt-0.5 text-xs text-hawk-muted">
                      {alert.camera_name} <span className="opacity-50 mx-1">•</span> {new Date(alert.created_at).toLocaleString()}
                      <span className="opacity-50 mx-1">•</span> Status: <span className="capitalize">{alert.status}</span>
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <Badge variant={mappedSeverity}>
                    {mappedSeverity === "crimson" ? "High" : mappedSeverity === "amber" ? "Medium" : "Info"}
                  </Badge>
                  
                  {alert.status !== "resolved" && user?.role !== "viewer" && (
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleUpdateStatus(alert.alert_id, alert.status)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2 text-hawk-emerald" />
                        {alert.status === "open" ? "Acknowledge" : "Resolve"}
                      </Button>
                      {alert.status === "open" && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleFalsePositive(alert.alert_id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity hover:border-hawk-crimson hover:bg-hawk-crimson/10 hover:text-hawk-crimson"
                          title="Mark False Positive"
                        >
                          False Positive
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
