import { useEffect, useRef } from "react";

export function QuantumVortex3D() {
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
    window.addEventListener("mousemove", handleMouseMove);

    // 3D Vortex Particles
    const particleCount = 280;
    const particles = Array.from({ length: particleCount }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: Math.random() * 450 + 40,
      z: Math.random() * 1000 - 500, // Z depth
      speedZ: Math.random() * 2.5 + 1.2,
      speedAngle: (Math.random() * 0.015 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
      size: Math.random() * 2.2 + 0.8,
      hue: Math.random() > 0.6 ? 215 : Math.random() > 0.3 ? 180 : 270, // Sapphire, Cyan, Violet
      alpha: Math.random() * 0.6 + 0.3,
    }));

    let time = 0;

    const render = () => {
      time += 0.015;

      // Smooth mouse interpolation with spring physics
      mouse.x += (mouse.targetX - mouse.x) * 0.04;
      mouse.y += (mouse.targetY - mouse.y) * 0.04;

      ctx.fillStyle = "rgba(5, 6, 8, 0.25)"; // Trails
      ctx.fillRect(0, 0, width, height);

      const centerX = width / 2 + ((mouse.x - width / 2) * 0.25);
      const centerY = height / 2 + ((mouse.y - height / 2) * 0.25);
      const fov = 400;

      // Draw Hyperspace Radial Ribbons / Spiral Rays
      const rayCount = 8;
      for (let i = 0; i < rayCount; i++) {
        const baseAngle = (i / rayCount) * Math.PI * 2 + time * 0.2;
        ctx.beginPath();
        for (let step = 0; step < 18; step++) {
          const t = step / 18;
          const r = t * 650;
          const a = baseAngle + t * 1.8;
          const rx = centerX + r * Math.cos(a);
          const ry = centerY + r * Math.sin(a);

          if (step === 0) ctx.moveTo(rx, ry);
          else ctx.lineTo(rx, ry);
        }
        ctx.strokeStyle = `rgba(59, 130, 246, ${0.03 + Math.sin(time + i) * 0.015})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Draw Concentric Luminous Quantum Wave Rings
      const ringCount = 5;
      for (let i = 0; i < ringCount; i++) {
        const ringProgress = (time * 0.3 + i / ringCount) % 1;
        const ringRadius = ringProgress * 420;
        const ringAlpha = (1 - ringProgress) * 0.18;

        ctx.beginPath();
        ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(59, 130, 246, ${ringAlpha})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // Render 3D Volumetric Vortex Particles with Gravitational Lensing
      particles.forEach((p) => {
        // Move along Z axis towards viewer
        p.z -= p.speedZ * 1.8;
        if (p.z < -fov + 10) {
          p.z = 600;
          p.radius = Math.random() * 450 + 40;
        }

        // Rotate in spiral vortex
        p.angle += p.speedAngle;

        // Gravitational lens pull toward mouse
        const worldX = Math.cos(p.angle) * p.radius;
        const worldY = Math.sin(p.angle) * p.radius;

        // Perspective 3D projection
        const scale = fov / (fov + p.z);
        const screenX = centerX + worldX * scale;
        const screenY = centerY + worldY * scale;

        if (screenX >= 0 && screenX <= width && screenY >= 0 && screenY <= height) {
          const depthAlpha = Math.max(0, Math.min(1, scale * 1.2)) * p.alpha;
          const particleSize = p.size * scale;

          ctx.beginPath();
          ctx.arc(screenX, screenY, Math.max(0.5, particleSize), 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, 90%, 65%, ${depthAlpha})`;
          ctx.shadowColor = `hsl(${p.hue}, 90%, 60%)`;
          ctx.shadowBlur = 6 * scale;
          ctx.fill();
          ctx.shadowBlur = 0;

          // Connect nearby particles for neural web effect
          particles.slice(0, 40).forEach((p2) => {
            const scale2 = fov / (fov + p2.z);
            const x2 = centerX + Math.cos(p2.angle) * p2.radius * scale2;
            const y2 = centerY + Math.sin(p2.angle) * p2.radius * scale2;
            const dist = Math.hypot(screenX - x2, screenY - y2);

            if (dist < 75) {
              ctx.beginPath();
              ctx.moveTo(screenX, screenY);
              ctx.lineTo(x2, y2);
              ctx.strokeStyle = `rgba(59, 130, 246, ${0.12 * (1 - dist / 75) * depthAlpha})`;
              ctx.lineWidth = 0.6;
              ctx.stroke();
            }
          });
        }
      });

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
