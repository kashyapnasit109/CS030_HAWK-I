import { useEffect, useRef } from "react";
import { colors } from "../../design-tokens/colors";

interface SparklineProps {
  color?: string;
  height?: number;
  intervalMs?: number;
  pointsCount?: number;
}

export function Sparkline({
  color = colors.sapphire,
  height = 36,
  intervalMs = 2000,
  pointsCount = 20,
}: SparklineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<number[]>([]);

  // Initialize data history
  if (dataRef.current.length === 0) {
    for (let i = 0; i < pointsCount; i++) {
      dataRef.current.push(40 + Math.random() * 40); // 40-80 range
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high-DPI scaling
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const draw = () => {
      const data = dataRef.current;
      const w = rect.width;
      const h = height;

      ctx.clearRect(0, 0, w, h);

      if (data.length < 2) return;

      const step = w / (data.length - 1);

      // 1. Draw gradient fill
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, color + "20"); // 12% opacity
      grad.addColorStop(1, "transparent");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let i = 0; i < data.length; i++) {
        const val = h - (data[i] / 100) * (h - 8);
        ctx.lineTo(i * step, val);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      // 2. Draw line
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < data.length; i++) {
        const val = h - (data[i] / 100) * (h - 8);
        if (i === 0) {
          ctx.moveTo(0, val);
        } else {
          ctx.lineTo(i * step, val);
        }
      }
      ctx.stroke();

      // 3. Draw active targeting dot at the latest point
      const lastX = w;
      const lastY = h - (data[data.length - 1] / 100) * (h - 8);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(lastX - 2, lastY, 2, 0, Math.PI * 2);
      ctx.fill();
    };

    // Draw initially
    draw();

    // Telemetry updates
    const interval = setInterval(() => {
      const data = dataRef.current;
      // Add slightly randomized drift
      const lastVal = data[data.length - 1];
      const change = (Math.random() - 0.5) * 15;
      const newVal = Math.max(10, Math.min(95, lastVal + change));
      
      data.push(newVal);
      data.shift();
      draw();
    }, intervalMs);

    // Resize handler
    const resizeObserver = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      draw();
    });
    
    resizeObserver.observe(canvas);

    return () => {
      clearInterval(interval);
      resizeObserver.disconnect();
    };
  }, [color, height, intervalMs, pointsCount]);

  return (
    <div className="w-full relative overflow-hidden" style={{ height }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block pointer-events-none"
        style={{ height }}
      />
    </div>
  );
}
