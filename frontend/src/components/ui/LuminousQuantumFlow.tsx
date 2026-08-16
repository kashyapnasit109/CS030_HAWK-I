import { useEffect, useRef } from "react";

export function LuminousQuantumFlow() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const mouse = {
      x: width / 2,
      y: height / 2,
      targetX: width / 2,
      targetY: height / 2,
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    // Floating Stardust Sparks
    const sparks = Array.from({ length: 80 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 1.6 + 0.4,
      alpha: Math.random() * 0.7 + 0.2,
      hue: Math.random() > 0.5 ? 215 : Math.random() > 0.2 ? 185 : 280,
    }));

    let time = 0;

    // Harmonic Wave Strand Definitions
    const waveStrands = [
      { color: "rgba(59, 130, 246, 0.45)", speed: 0.012, freq: 0.003, amp: 75, yOffset: 0.45 },
      { color: "rgba(6, 182, 212, 0.4)", speed: 0.016, freq: 0.004, amp: 90, yOffset: 0.52 },
      { color: "rgba(139, 92, 246, 0.35)", speed: 0.01, freq: 0.0025, amp: 65, yOffset: 0.48 },
      { color: "rgba(16, 185, 129, 0.28)", speed: 0.014, freq: 0.0035, amp: 80, yOffset: 0.58 },
      { color: "rgba(99, 102, 241, 0.3)", speed: 0.008, freq: 0.002, amp: 60, yOffset: 0.42 },
    ];

    const render = () => {
      time += 0.015;

      // Smooth mouse interpolation
      mouse.x += (mouse.targetX - mouse.x) * 0.06;
      mouse.y += (mouse.targetY - mouse.y) * 0.06;

      ctx.fillStyle = "#05060A";
      ctx.fillRect(0, 0, width, height);

      // Render Ambient Radial Glows (Pre-blended for 60FPS)
      const centerX = width / 2;
      const centerY = height / 2;

      const bgGlow = ctx.createRadialGradient(
        centerX + (mouse.x - centerX) * 0.15,
        centerY + (mouse.y - centerY) * 0.15,
        0,
        centerX,
        centerY,
        width * 0.65
      );
      bgGlow.addColorStop(0, "rgba(30, 58, 138, 0.22)");
      bgGlow.addColorStop(0.5, "rgba(88, 28, 135, 0.12)");
      bgGlow.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = bgGlow;
      ctx.fillRect(0, 0, width, height);

      // Render Flowing Multi-Wave Energy Strands
      ctx.globalCompositeOperation = "screen";

      waveStrands.forEach((strand, idx) => {
        ctx.beginPath();
        const baseCy = height * strand.yOffset;

        for (let x = 0; x <= width; x += 12) {
          // Harmonic wave elevation
          const sinWave = Math.sin(x * strand.freq + time * (1 + idx * 0.2) + idx) * strand.amp;
          const cosWave = Math.cos(x * strand.freq * 0.6 - time * 0.8) * (strand.amp * 0.5);

          // Mouse fluid repulsion
          const dx = x - mouse.x;
          const dy = baseCy - mouse.y;
          const dist = Math.hypot(dx, dy);
          const mouseDisplace = dist < 240 ? Math.sin((1 - dist / 240) * Math.PI) * 45 : 0;

          const y = baseCy + sinWave + cosWave + mouseDisplace;

          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.strokeStyle = strand.color;
        ctx.lineWidth = 3;
        ctx.shadowColor = strand.color;
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // Render Floating Stardust Sparks
      sparks.forEach((sp) => {
        sp.x += sp.vx;
        sp.y += sp.vy;

        if (sp.x < 0) sp.x = width;
        if (sp.x > width) sp.x = 0;
        if (sp.y < 0) sp.y = height;
        if (sp.y > height) sp.y = 0;

        // Gentle cursor attraction
        const dx = mouse.x - sp.x;
        const dy = mouse.y - sp.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 220 && dist > 20) {
          const force = (1 - dist / 220) * 0.6;
          sp.x += (dx / dist) * force;
          sp.y += (dy / dist) * force;
        }

        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${sp.hue}, 90%, 75%, ${sp.alpha})`;
        ctx.shadowColor = `hsl(${sp.hue}, 90%, 65%)`;
        ctx.shadowBlur = 5;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      ctx.globalCompositeOperation = "source-over";

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0 overflow-hidden select-none"
    />
  );
}
