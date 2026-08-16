import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Gauge, Zap, Search } from "lucide-react";
import { MotionSection, MotionItem } from "../../components/motion/MotionPrimitives";
import { Button } from "../../components/ui/Button";

export default function VelocityTestBench() {
  return (
    <div className="max-w-[1400px] mx-auto pb-16 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-white/[0.05] pb-8 pt-4">
        <div>
          <h1 className="text-5xl font-extrabold tracking-tight text-white font-display flex items-center gap-4">
            <Gauge className="h-8 w-8 text-hawk-amber" />
            Kinetic Velocity Engine
          </h1>
          <p className="mt-4 text-[10px] font-mono text-hawk-muted uppercase tracking-[0.2em]">
            Optical flow frame-by-frame velocity interpolation
          </p>
        </div>
      </div>

      <MotionSection stagger={0.08} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Abstract Optical Flow Interface */}
        <MotionItem>
           <Card interactive glowColor="amber" padding="none" className="flex flex-col h-[600px] overflow-hidden bg-[#020202]">
              <div className="p-6 border-b border-white/[0.05] flex justify-between items-center bg-black/50 z-20 relative">
                 <h3 className="text-[10px] font-mono font-bold tracking-[0.3em] text-white uppercase">Kinetic Ingestion Sequence</h3>
                 <Badge variant="amber" dot>Standby</Badge>
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center relative group overflow-hidden cursor-none">
                 {/* Massive Abstract Flow Rings */}
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-64 h-64 rounded-full border border-hawk-amber/20 absolute animate-[ping_4s_cubic-bezier(0,0,0.2,1)_infinite]" />
                    <div className="w-96 h-96 rounded-full border border-hawk-amber/10 absolute animate-[ping_6s_cubic-bezier(0,0,0.2,1)_infinite]" />
                    
                    <div className="w-32 h-32 rounded-full border-t border-hawk-amber/50 absolute animate-[spin_3s_linear_infinite]" />
                    <div className="w-48 h-48 rounded-full border-b border-hawk-amber/30 absolute animate-[spin_5s_linear_infinite_reverse]" />
                 </div>
                 
                 <div className="relative z-10 p-6 bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl">
                    <p className="text-[9px] font-mono text-hawk-amber uppercase tracking-[0.3em] animate-pulse">Awaiting Video Vector</p>
                 </div>
              </div>
              
              <div className="p-6 border-t border-white/[0.05] bg-black/50 z-20 relative">
                 <Button variant="primary" className="w-full text-center justify-center bg-hawk-amber border-hawk-amber text-black hover:bg-hawk-amber/80">Inject Kinetic Payload</Button>
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
