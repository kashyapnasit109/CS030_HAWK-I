import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { LogIn, Zap, Search } from "lucide-react";
import { MotionSection, MotionItem } from "../../components/motion/MotionPrimitives";
import { Button } from "../../components/ui/Button";

export default function EntryTestBench() {
  return (
    <div className="max-w-[1400px] mx-auto pb-16 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-white/[0.05] pb-8 pt-4">
        <div>
          <h1 className="text-5xl font-extrabold tracking-tight text-white font-display flex items-center gap-4">
            <LogIn className="h-8 w-8 text-hawk-sapphire" />
            Access Control Engine
          </h1>
          <p className="mt-4 text-[10px] font-mono text-hawk-muted uppercase tracking-[0.2em]">
            Biometric and credential validation
          </p>
        </div>
      </div>

      <MotionSection stagger={0.08} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Biometric Scanner Interface */}
        <MotionItem>
           <Card interactive glowColor="sapphire" padding="none" className="flex flex-col h-[600px] overflow-hidden bg-[#020202]">
              <div className="p-6 border-b border-white/[0.05] flex justify-between items-center bg-black/50 z-20 relative">
                 <h3 className="text-[10px] font-mono font-bold tracking-[0.3em] text-white uppercase">Biometric Ingestion</h3>
                 <Badge variant="sapphire" dot>Ready</Badge>
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center relative group overflow-hidden cursor-none">
                 {/* Biometric Facial Scanning Grid */}
                 <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.05)_1px,transparent_1px)] bg-[size:10px_10px] opacity-20 [mask-image:radial-gradient(circle_at_center,black_30%,transparent_70%)]" />
                 
                 {/* Scanning Rectangles */}
                 <div className="relative w-64 h-80 border-2 border-hawk-sapphire/20 rounded-3xl overflow-hidden group-hover:border-hawk-sapphire/50 transition-colors duration-500">
                    <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-hawk-sapphire" />
                    <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-hawk-sapphire" />
                    <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-hawk-sapphire" />
                    <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-hawk-sapphire" />
                    
                    {/* Vertical Scan Bar */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-hawk-sapphire shadow-[0_0_20px_rgba(59,130,246,1)] animate-[scan_2s_ease-in-out_infinite]" />
                 </div>
                 
                 <div className="absolute bottom-1/4 mt-4">
                    <p className="text-[9px] font-mono text-hawk-sapphire uppercase tracking-[0.3em] animate-pulse bg-black/80 px-4 py-2 border border-hawk-sapphire/20 rounded-full">Awaiting Facial Signature</p>
                 </div>
              </div>
              
              <div className="p-6 border-t border-white/[0.05] bg-black/50 z-20 relative">
                 <Button variant="primary" className="w-full text-center justify-center">Inject Identity Payload</Button>
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
