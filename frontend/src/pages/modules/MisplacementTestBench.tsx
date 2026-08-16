import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Boxes, Zap, Search } from "lucide-react";
import { MotionSection, MotionItem } from "../../components/motion/MotionPrimitives";
import { Button } from "../../components/ui/Button";

export default function MisplacementTestBench() {
  return (
    <div className="max-w-[1400px] mx-auto pb-16 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-white/[0.05] pb-8 pt-4">
        <div>
          <h1 className="text-5xl font-extrabold tracking-tight text-white font-display flex items-center gap-4">
            <Boxes className="h-8 w-8 text-hawk-emerald" />
            Misplacement Engine
          </h1>
          <p className="mt-4 text-[10px] font-mono text-hawk-muted uppercase tracking-[0.2em]">
            Temporal object permanence tracking
          </p>
        </div>
      </div>

      <MotionSection stagger={0.08} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Spatial Matrix Grid */}
        <MotionItem>
           <Card interactive glowColor="emerald" padding="none" className="flex flex-col h-[600px] overflow-hidden bg-[#020202]">
              <div className="p-6 border-b border-white/[0.05] flex justify-between items-center bg-black/50 z-20 relative">
                 <h3 className="text-[10px] font-mono font-bold tracking-[0.3em] text-white uppercase">Spatial Matrix Ingestion</h3>
                 <Badge variant="emerald" dot>Ready</Badge>
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center relative group overflow-hidden cursor-none">
                 {/* Massive Perspective Grid */}
                 <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.1)_1px,transparent_1px)] bg-[size:40px_40px] [transform:rotateX(75deg)_translateY(-50px)_scale(2)] origin-bottom opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
                 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_20%,rgba(2,2,2,1)_80%)] pointer-events-none" />
                 
                 {/* Floating Holographic Object */}
                 <div className="relative z-10 w-24 h-24 border border-hawk-emerald bg-hawk-emerald/10 animate-[bounce_4s_infinite] shadow-[0_0_30px_rgba(16,185,129,0.4)] backdrop-blur-md flex items-center justify-center [transform:rotateX(45deg)_rotateZ(45deg)] group-hover:scale-110 transition-transform duration-500">
                    <div className="w-12 h-12 border border-hawk-emerald/50 bg-hawk-emerald/20" />
                 </div>
                 
                 <div className="absolute bottom-1/4">
                    <p className="text-[9px] font-mono text-hawk-emerald uppercase tracking-[0.3em] animate-pulse bg-black/80 px-4 py-2 border border-hawk-emerald/20 rounded">Awaiting Target Vector</p>
                 </div>
              </div>
              
              <div className="p-6 border-t border-white/[0.05] bg-black/50 z-20 relative">
                 <Button variant="primary" className="w-full text-center justify-center bg-hawk-emerald border-hawk-emerald text-black hover:bg-hawk-emerald/80">Inject Spatial Payload</Button>
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
