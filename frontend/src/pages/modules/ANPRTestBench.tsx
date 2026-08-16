import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { ScanLine, Zap, Search } from "lucide-react";
import { MotionSection, MotionItem } from "../../components/motion/MotionPrimitives";
import { Button } from "../../components/ui/Button";

export default function ANPRTestBench() {
  return (
    <div className="max-w-[1400px] mx-auto pb-16 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-white/[0.05] pb-8 pt-4">
        <div>
          <h1 className="text-5xl font-extrabold tracking-tight text-white font-display flex items-center gap-4">
            <ScanLine className="h-8 w-8 text-hawk-sapphire" />
            ANPR Engine Matrix
          </h1>
          <p className="mt-4 text-[10px] font-mono text-hawk-muted uppercase tracking-[0.2em]">
            Neural optical character recognition & vector matching
          </p>
        </div>
      </div>

      <MotionSection stagger={0.08} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Abstract Scanning Laser Interface */}
        <MotionItem>
           <Card interactive glowColor="sapphire" padding="none" className="flex flex-col h-[600px] overflow-hidden bg-[#020202]">
              <div className="p-6 border-b border-white/[0.05] flex justify-between items-center bg-black/50 z-20 relative">
                 <h3 className="text-[10px] font-mono font-bold tracking-[0.3em] text-white uppercase">Optical Ingestion</h3>
                 <Badge variant="sapphire" dot>Ready</Badge>
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center relative group overflow-hidden cursor-none">
                 {/* CSS abstract scanning environment */}
                 <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:20px_20px]" />
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(2,2,2,1)_100%)]" />
                 
                 {/* Sweeping Laser Scanline */}
                 <div className="absolute left-0 w-full h-[2px] bg-hawk-sapphire shadow-[0_0_20px_rgba(59,130,246,0.8)] animate-[scan_3s_ease-in-out_infinite]" />
                 
                 {/* Abstract Center Target */}
                 <div className="relative w-48 h-24 border border-hawk-sapphire/30 flex items-center justify-center bg-hawk-sapphire/[0.02] group-hover:bg-hawk-sapphire/[0.05] transition-colors duration-500">
                    {/* Corners */}
                    <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-hawk-sapphire" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-hawk-sapphire" />
                    <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-hawk-sapphire" />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-hawk-sapphire" />
                    
                    <p className="text-[10px] font-mono text-hawk-sapphire uppercase tracking-[0.3em] animate-pulse">Awaiting Matrix</p>
                 </div>
              </div>
              
              <div className="p-6 border-t border-white/[0.05] bg-black/50 z-20 relative">
                 <Button variant="primary" className="w-full text-center justify-center">Inject Optical Payload</Button>
              </div>
           </Card>
        </MotionItem>

        {/* Inference Results */}
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
           
           <Card interactive glowColor="emerald" padding="md" className="h-48">
              <h3 className="text-[10px] font-mono font-bold tracking-[0.3em] text-hawk-muted uppercase mb-4">Neural Architecture</h3>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <p className="text-[9px] font-mono text-hawk-muted uppercase tracking-[0.2em] mb-1">Model Version</p>
                    <p className="text-sm font-display text-white">HAWK-ANPR-v7.2</p>
                 </div>
                 <div>
                    <p className="text-[9px] font-mono text-hawk-muted uppercase tracking-[0.2em] mb-1">Compute Node</p>
                    <p className="text-sm font-display text-hawk-emerald">CUDA Core 0</p>
                 </div>
                 <div>
                    <p className="text-[9px] font-mono text-hawk-muted uppercase tracking-[0.2em] mb-1">Precision</p>
                    <p className="text-sm font-display text-white">FP16</p>
                 </div>
              </div>
           </Card>
        </MotionItem>
        
      </MotionSection>
    </div>
  );
}
