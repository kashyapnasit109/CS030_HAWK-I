import { useParams } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { ArrowLeft, Video, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back button */}
      <Button
        variant="secondary"
        size="sm"
        icon={<ArrowLeft className="h-4 w-4" strokeWidth={1.75} />}
        onClick={() => navigate(-1)}
      >
        Back to Events
      </Button>

      {/* Event header */}
      <Card padding="lg" className="border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.05)]">
        <div className="flex items-start justify-between">
          <div className="flex gap-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
               <AlertTriangle className="h-6 w-6" strokeWidth={2} />
            </div>
            <div className="pt-1">
              <h3 className="text-2xl font-semibold text-white tracking-wide" style={{ fontFamily: "'Clash Display', sans-serif" }}>
                Event #{id ?? "—"}
              </h3>
              <p className="mt-1 text-sm text-hawk-muted">
                Event detail view — AI footage analysis coming soon
              </p>
            </div>
          </div>
          <Badge variant="amber" dot>Medium Severity</Badge>
        </div>
      </Card>

      {/* Video clip placeholder */}
      <Card padding="lg" className="border-white/5">
        <h4 className="mb-4 text-sm font-semibold text-white tracking-wide" style={{ fontFamily: "'Clash Display', sans-serif" }}>Associated Footage</h4>
        <div className="flex h-80 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/40">
          <div className="flex flex-col items-center gap-4 opacity-60">
             <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                <Video className="h-6 w-6 text-white" strokeWidth={1.5} />
             </div>
             <p className="text-sm text-hawk-muted">Video player integration pending</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
