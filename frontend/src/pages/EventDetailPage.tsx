import { useParams, Link } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { 
  ArrowLeft, 
  ShieldCheck, 
  FileText, 
  Download, 
  Share2, 
  Code
} from "lucide-react";
import feedServer from "../assets/feed_server_room_1786554342814.png";

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();

  const eventData = {
    id: id || "EVT-9042",
    title: "Unauthorized Humanoid Intrusion in Core Server Vault",
    type: "UNAUTHORIZED_ENTRY",
    severity: "CRITICAL",
    time: "2026-08-16 14:22:05 UTC",
    location: "Core Server Vault - Sector B (CAM-02)",
    confidence: 98.4,
    sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    narrative:
      "At 14:22:05 UTC, camera CAM-02 (Server Vault Optical Core) detected a humanoid silhouette moving across the restricted threshold zone. No valid badge scan or authorization RFID handshake was recorded at the primary turnstile within the preceding 120-second temporal window.",
    metadata: {
      camera_id: "CAM-02-VAULT",
      bounding_box: [420, 180, 580, 490],
      track_id: 884,
      model_version: "YOLOv8x-HawkCustom-v4.2",
      inference_time_ms: 14.8,
      gate_sensor_state: "LOCKED_NO_ACCESS"
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      
      {/* Back Button & Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <Link to="/alerts" className="inline-flex items-center gap-2 text-xs font-mono text-hawk-muted hover:text-white transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> BACK TO RADAR
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl lg:text-3xl font-display font-extrabold text-white">
              {eventData.id}
            </h1>
            <Badge variant="burgundy" size="md" dot>
              {eventData.severity}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="md" icon={<Download className="h-3.5 w-3.5" />}>
            EXPORT DOSSIER
          </Button>
          <Button variant="secondary" size="md" icon={<Share2 className="h-3.5 w-3.5" />}>
            SHARE EVENT
          </Button>
        </div>
      </div>

      {/* Main Grid: Optical Evidence Viewport + Forensic Metadata */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left 8 Columns: High-Res Evidence Frame */}
        <div className="xl:col-span-8 space-y-6">
          <Card padding="none" className="overflow-hidden bg-black">
            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Optical Forensic Evidence Capture
              </span>
              <Badge variant="emerald" size="sm">FRAME LOCK: 98.4% CONF</Badge>
            </div>

            <div className="relative aspect-video w-full flex items-center justify-center">
              <img
                src={feedServer}
                alt="Forensic Frame"
                className="w-full h-full object-cover"
              />

              {/* Bounding Box HUD */}
              <div 
                className="absolute border-2 border-hawk-burgundy bg-hawk-burgundy/15 rounded-lg flex flex-col justify-between p-2 shadow-[0_0_20px_rgba(244,63,94,0.4)]"
                style={{ top: "25%", left: "35%", width: "28%", height: "55%" }}
              >
                <span className="text-[9px] font-mono font-bold bg-hawk-burgundy text-white px-1.5 py-0.5 rounded self-start">
                  HUMAN #884 (98.4%)
                </span>
                <span className="text-[8px] font-mono text-white/80 self-end">
                  UNAUTHORIZED
                </span>
              </div>
            </div>

            <div className="p-4 bg-[#07080B] flex items-center justify-between text-xs font-mono text-hawk-muted">
              <span>CAMERA: {eventData.location}</span>
              <span>TIMESTAMP: {eventData.time}</span>
            </div>
          </Card>

          {/* Narrative Summary */}
          <Card padding="lg" className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-white uppercase tracking-wider">
              <FileText className="h-4 w-4 text-hawk-sapphire" />
              <span>Forensic Incident Description</span>
            </div>
            <p className="text-sm text-white/80 font-sans leading-relaxed">
              {eventData.narrative}
            </p>
          </Card>
        </div>

        {/* Right 4 Columns: Cryptographic Proof & Metadata */}
        <div className="xl:col-span-4 space-y-6">
          
          {/* Cryptographic Seal Card */}
          <Card padding="md" glowColor="emerald" className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-hawk-emerald uppercase tracking-wider">
              <ShieldCheck className="h-4 w-4" />
              <span>Cryptographic Proof Seal</span>
            </div>

            <p className="text-xs text-hawk-muted font-sans">
              This incident evidence is cryptographically anchored and verified tamper-evident.
            </p>

            <div className="p-3 rounded-xl bg-black/50 border border-white/5 font-mono text-[10px] text-white/80 break-all">
              SHA-256: {eventData.sha256}
            </div>
          </Card>

          {/* Raw JSON Tensor Metadata */}
          <Card padding="md" className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-hawk-muted">
              <span className="flex items-center gap-1.5 font-bold text-white">
                <Code className="h-4 w-4 text-hawk-sapphire" /> EVENT JSON
              </span>
              <span>200 OK</span>
            </div>

            <pre className="p-3 rounded-xl bg-black/60 border border-white/5 font-mono text-[10px] text-white/80 overflow-x-auto max-h-[220px] custom-scrollbar">
              {JSON.stringify(eventData.metadata, null, 2)}
            </pre>
          </Card>

        </div>

      </div>

    </div>
  );
}
