import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { ShieldAlert, Zap, Search } from "lucide-react";
import { MotionSection, MotionItem } from "../../components/motion/MotionPrimitives";
import { Button } from "../../components/ui/Button";

export default function ThreatTestBench() {
  return (
    <div className="max-w-[1400px] mx-auto pb-16 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-white/[0.05] pb-8 pt-4">
        <div>
          <h1 className="text-5xl font-extrabold tracking-tight text-white font-display flex items-center gap-4">
            <ShieldAlert className="h-8 w-8 text-hawk-burgundy" />
            Threat Detection Matrix
          </h1>
          <p className="mt-4 text-[10px] font-mono text-hawk-muted uppercase tracking-[0.2em]">
            Kinetic anomaly and weapon detection
          </p>
        </div>
      </div>

      <MotionSection stagger={0.08} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Kinetic Threat Radar */}
        <MotionItem>
           <Card interactive glowColor="burgundy" padding="none" className="flex flex-col h-[600px] overflow-hidden bg-[#020202]">
              <div className="p-6 border-b border-white/[0.05] flex justify-between items-center bg-black/50 z-20 relative">
                 <h3 className="text-[10px] font-mono font-bold tracking-[0.3em] text-white uppercase">Threat Vector Ingestion</h3>
                 <Badge variant="burgundy" dot>Standby</Badge>
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center relative group overflow-hidden cursor-none">
                 {/* Massive Sonar / Radar Overlay */}
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-50">
                    <div className="w-[500px] h-[500px] rounded-full border border-hawk-burgundy/10" />
                    <div className="w-[350px] h-[350px] rounded-full border border-hawk-burgundy/20 absolute" />
                    <div className="w-[200px] h-[200px] rounded-full border border-hawk-burgundy/30 absolute" />
                    
                    {/* Sweeping Radar Line */}
                    <div className="absolute w-[250px] h-[250px] top-1/2 left-1/2 origin-top-left animate-[spin_4s_linear_infinite] bg-gradient-to-tr from-hawk-burgundy/20 to-transparent pointer-events-none" />
                 </div>
                 
                 {/* Pulsing Alert Blips */}
                 <div className="absolute top-1/3 right-1/3 w-2 h-2 rounded-full bg-hawk-burgundy animate-ping opacity-0 group-hover:opacity-100 transition-opacity" />
                 <div className="absolute bottom-1/4 left-1/3 w-3 h-3 rounded-full bg-hawk-burgundy animate-pulse shadow-[0_0_15px_rgba(225,29,72,0.8)] opacity-0 group-hover:opacity-100 transition-opacity" />

                 <div className="relative z-10 p-6 bg-black/80 backdrop-blur-md border border-hawk-burgundy/30 rounded-xl shadow-[0_0_50px_rgba(225,29,72,0.1)]">
                    <p className="text-[9px] font-mono text-hawk-burgundy uppercase tracking-[0.3em] animate-pulse">Awaiting Threat Signature</p>
                 </div>
              </div>
              
              <div className="p-6 border-t border-white/[0.05] bg-black/50 z-20 relative">
                 <Button variant="danger" className="w-full text-center justify-center">Inject Kinetic Payload</Button>
              </div>
           </Card>
        </MotionItem>

        <MotionItem className="flex flex-col gap-6">
           <Card interactive glowColor="none" padding="md" className="flex-1">
              <h3 className="text-[10px] font-mono font-bold tracking-[0.3em] text-hawk-muted uppercase mb-6 flex items-center gap-2">
                <Zap className="h-3 w-3" /> Execution Telemetry
              </h3>
              <div className="flex flex-col items-center justify-center h-48 text-center opacity-40">
                 <Search className="h-8 w-8 text-hawk-muted mb-4" />
                 <p className="text-[10px] font-mono tracking-[0.2em] text-white uppercase">Awaiting Vector Output</p>
              </div>
           </Card>
        </MotionItem>
      </MotionSection>
    </div>
  );
}
