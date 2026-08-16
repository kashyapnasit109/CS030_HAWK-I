import { useEffect, useRef } from "react";

export function EtherealFluidCanvas() {
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
      speed: 0,
      lastX: width / 2,
      lastY: height / 2,
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      const dx = e.clientX - mouse.lastX;
      const dy = e.clientY - mouse.lastY;
      mouse.speed = Math.min(Math.hypot(dx, dy), 50);
      mouse.lastX = e.clientX;
      mouse.lastY = e.clientY;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Dynamic Chromatic Fluid Light Nodes
    const blobs = [
      { x: width * 0.3, y: height * 0.4, vx: 0.8, vy: 0.6, radius: 320, color1: "rgba(37, 99, 235, 0.45)", color2: "rgba(59, 130, 246, 0)" },
      { x: width * 0.7, y: height * 0.6, vx: -0.7, vy: -0.5, radius: 380, color1: "rgba(139, 92, 246, 0.4)", color2: "rgba(168, 85, 247, 0)" },
      { x: width * 0.5, y: height * 0.3, vx: 0.6, vy: -0.8, radius: 280, color1: "rgba(6, 182, 212, 0.35)", color2: "rgba(14, 165, 233, 0)" },
      { x: width * 0.4, y: height * 0.7, vx: -0.5, vy: 0.7, radius: 340, color1: "rgba(16, 185, 129, 0.25)", color2: "rgba(5, 150, 105, 0)" },
      { x: width * 0.8, y: height * 0.3, vx: -0.6, vy: 0.6, radius: 300, color1: "rgba(59, 130, 246, 0.3)", color2: "rgba(37, 99, 235, 0)" },
    ];

    // Interactive cursor ripple waves
    const ripples: { x: number; y: number; radius: number; maxRadius: number; alpha: number }[] = [];

    let time = 0;

    const render = () => {
      time += 0.008;

      // Smooth mouse interpolation
      mouse.x += (mouse.targetX - mouse.x) * 0.06;
      mouse.y += (mouse.targetY - mouse.y) * 0.06;

      // Spawn subtle gentle cursor ripple on movement
      if (mouse.speed > 5 && Math.random() > 0.6) {
        ripples.push({
          x: mouse.x,
          y: mouse.y,
          radius: 10,
          maxRadius: Math.min(220, 80 + mouse.speed * 4),
          alpha: 0.35,
        });
      }
      mouse.speed *= 0.92;

      // Clear with dark atmospheric velvet
      ctx.fillStyle = "#050608";
      ctx.fillRect(0, 0, width, height);

      // Render Chromatic Fluid Light Vortices
      ctx.globalCompositeOperation = "screen";

      blobs.forEach((blob, idx) => {
        // Harmonic organic float
        blob.x += blob.vx + Math.sin(time + idx) * 0.8;
        blob.y += blob.vy + Math.cos(time * 0.8 + idx) * 0.8;

        // Boundary reflection
        if (blob.x < -100) blob.x = width + 100;
        if (blob.x > width + 100) blob.x = -100;
        if (blob.y < -100) blob.y = height + 100;
        if (blob.y > height + 100) blob.y = -100;

        // Gentle pull towards cursor
        const dx = mouse.x - blob.x;
        const dy = mouse.y - blob.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 450) {
          blob.x += (dx / dist) * 1.5;
          blob.y += (dy / dist) * 1.5;
        }

        const dynamicRadius = blob.radius + Math.sin(time * 1.5 + idx) * 35;
        const grad = ctx.createRadialGradient(
          blob.x,
          blob.y,
          0,
          blob.x,
          blob.y,
          Math.max(10, dynamicRadius)
        );
        grad.addColorStop(0, blob.color1);
        grad.addColorStop(1, blob.color2);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(blob.x, blob.y, dynamicRadius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Render Cursor Refractive Light Aura
      const mouseGrad = ctx.createRadialGradient(
        mouse.x,
        mouse.y,
        0,
        mouse.x,
        mouse.y,
        280
      );
      mouseGrad.addColorStop(0, "rgba(59, 130, 246, 0.4)");
      mouseGrad.addColorStop(0.5, "rgba(6, 182, 212, 0.15)");
      mouseGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = mouseGrad;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 280, 0, Math.PI * 2);
      ctx.fill();

      // Render Interactive Liquid Wave Ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += 2.8;
        r.alpha *= 0.96;

        if (r.alpha < 0.01 || r.radius >= r.maxRadius) {
          ripples.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(59, 130, 246, ${r.alpha})`;
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }

      ctx.globalCompositeOperation = "source-over";

      // Subtle Film Grain Overlay for high-end cinematic tactile texture
      animId = requestAnimationFrame(render);
    };

    render();

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
