import { useEffect, useRef } from "react";

interface VectorNode {
  id: string;
  label: string;
  x: number;
  y: number;
  relevance: number;
  type: string;
}

interface VectorSpaceGraphProps {
  nodes?: VectorNode[];
  activeNodeId?: string | null;
  onSelectNode?: (id: string) => void;
  className?: string;
}

export function VectorSpaceGraph({
  nodes = [
    { id: "EVT-9042", label: "Intrusion Vault", x: 0.75, y: 0.25, relevance: 98.4, type: "UNAUTHORIZED_ENTRY" },
    { id: "VEL-4412", label: "Speeding Sedan", x: 0.65, y: 0.60, relevance: 94.2, type: "SPEED_VIOLATION" },
    { id: "ANP-1082", label: "Plate MH12", x: 0.35, y: 0.40, relevance: 89.7, type: "ANPR_MATCH" },
    { id: "OBJ-5519", label: "Briefcase Static", x: 0.25, y: 0.80, relevance: 81.3, type: "UNATTENDED_OBJECT" },
  ],
  activeNodeId,
  onSelectNode,
  className = "",
}: VectorSpaceGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const render = () => {
      time += 0.02;
      const w = canvas.width;
      const h = canvas.height;
      const originX = w / 2;
      const originY = h / 2;

      ctx.clearRect(0, 0, w, h);

      // Radar Concentric Circles
      [0.2, 0.4, 0.6, 0.8].forEach((r, idx) => {
        ctx.beginPath();
        ctx.arc(originX, originY, (w * 0.45) * r, 0, 2 * Math.PI);
        ctx.strokeStyle = `rgba(59, 130, 246, ${0.05 + idx * 0.03})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Axis Crosshairs
      ctx.beginPath();
      ctx.moveTo(originX, 10);
      ctx.lineTo(originX, h - 10);
      ctx.moveTo(10, originY);
      ctx.lineTo(w - 10, originY);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Center Origin Node (Natural Language Query Vector)
      ctx.beginPath();
      ctx.arc(originX, originY, 6, 0, 2 * Math.PI);
      ctx.fillStyle = "#3B82F6";
      ctx.fill();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Query label
      ctx.font = "bold 9px monospace";
      ctx.fillStyle = "#3B82F6";
      ctx.fillText("QUERY_VECTOR (0,0)", originX + 10, originY - 8);

      // Render Nodes & Distance Links
      nodes.forEach((node) => {
        const nx = originX + (node.x - 0.5) * (w * 0.8);
        const ny = originY + (node.y - 0.5) * (h * 0.8);
        const isActive = activeNodeId === node.id;

        // Cosine Vector Distance Line
        ctx.beginPath();
        ctx.setLineDash([3, 3]);
        ctx.moveTo(originX, originY);
        ctx.lineTo(nx, ny);
        ctx.strokeStyle = isActive ? "rgba(59, 130, 246, 0.8)" : "rgba(255, 255, 255, 0.12)";
        ctx.lineWidth = isActive ? 2 : 1;
        ctx.stroke();
        ctx.setLineDash([]);

        // Node Glow
        const pulse = Math.sin(time * 2 + node.relevance) * 3;
        ctx.beginPath();
        ctx.arc(nx, ny, (isActive ? 9 : 6) + pulse * 0.5, 0, 2 * Math.PI);
        ctx.fillStyle = node.type === "UNAUTHORIZED_ENTRY" 
          ? "#F43F5E" 
          : node.type === "SPEED_VIOLATION" 
          ? "#F59E0B" 
          : "#10B981";
        ctx.fill();

        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Node Label
        ctx.font = "10px monospace";
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(`${node.label} (${node.relevance}%)`, nx + 10, ny + 3);
      });

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [nodes, activeNodeId]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !onSelectNode) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const w = canvas.width;
    const h = canvas.height;
    const originX = w / 2;
    const originY = h / 2;

    nodes.forEach((node) => {
      const nx = originX + (node.x - 0.5) * (w * 0.8);
      const ny = originY + (node.y - 0.5) * (h * 0.8);
      const dist = Math.hypot(clickX - nx, clickY - ny);
      if (dist < 15) {
        onSelectNode(node.id);
      }
    });
  };

  return (
    <div className={`relative rounded-2xl bg-[#07080B] border border-white/10 overflow-hidden flex flex-col items-center justify-center ${className}`}>
      <div className="absolute top-3 inset-x-3 flex justify-between items-center text-[9px] font-mono text-hawk-muted z-10 pointer-events-none">
        <span className="bg-black/60 px-2 py-0.5 rounded border border-white/10 text-white">COSINE VECTOR SPACE</span>
        <span>DIM: 384 · EMBEDDINGS</span>
      </div>

      <canvas
        ref={canvasRef}
        width={480}
        height={280}
        onClick={handleClick}
        className="w-full h-full cursor-pointer"
      />
    </div>
  );
}
