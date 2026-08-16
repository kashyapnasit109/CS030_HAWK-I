import { useEffect, useRef } from "react";

export function CelestialNebulaCanvas() {
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
      isMoving: false,
    };

    let moveTimeout: any;
    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.isMoving = true;
      clearTimeout(moveTimeout);
      moveTimeout = setTimeout(() => {
        mouse.isMoving = false;
      }, 150);
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Stardust Quantum Particles
    const starCount = 180;
    const stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      radius: Math.random() * 1.8 + 0.6,
      baseAlpha: Math.random() * 0.6 + 0.2,
      alpha: Math.random() * 0.6 + 0.2,
      hue: Math.random() > 0.5 ? 210 : Math.random() > 0.2 ? 185 : 275, // Azure, Cyan, Violet
      pulseSpeed: Math.random() * 0.03 + 0.01,
    }));

    // Soft Chromatic Plasma Nodes
    const plasmaNodes = [
      { x: width * 0.25, y: height * 0.35, vx: 0.5, vy: 0.4, radius: 420, color: "rgba(37, 99, 235, 0.35)" },
      { x: width * 0.75, y: height * 0.65, vx: -0.4, vy: -0.3, radius: 460, color: "rgba(147, 51, 234, 0.28)" },
      { x: width * 0.5, y: height * 0.25, vx: 0.3, vy: -0.5, radius: 360, color: "rgba(6, 182, 212, 0.3)" },
      { x: width * 0.45, y: height * 0.75, vx: -0.3, vy: 0.4, radius: 400, color: "rgba(16, 185, 129, 0.2)" },
    ];

    // Click interactive shockwaves
    const shockwaves: { x: number; y: number; r: number; maxR: number; a: number }[] = [];

    const handleClick = (e: MouseEvent) => {
      shockwaves.push({
        x: e.clientX,
        y: e.clientY,
        r: 10,
        maxR: 260,
        a: 0.5,
      });
    };
    window.addEventListener("click", handleClick);

    let time = 0;

    const render = () => {
      time += 0.01;

      // Mouse smooth spring interpolation
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      // Background clear
      ctx.fillStyle = "#05060A";
      ctx.fillRect(0, 0, width, height);

      // Render Chromatic Ethereal Plasma Caustics
      ctx.globalCompositeOperation = "screen";

      plasmaNodes.forEach((node, idx) => {
        node.x += node.vx + Math.sin(time * 0.7 + idx) * 0.6;
        node.y += node.vy + Math.cos(time * 0.5 + idx) * 0.6;

        if (node.x < -150) node.x = width + 150;
        if (node.x > width + 150) node.x = -150;
        if (node.y < -150) node.y = height + 150;
        if (node.y > height + 150) node.y = -150;

        // Gravitational drag toward mouse
        const dx = mouse.x - node.x;
        const dy = mouse.y - node.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 500) {
          node.x += (dx / dist) * 0.9;
          node.y += (dy / dist) * 0.9;
        }

        const r = node.radius + Math.sin(time * 1.2 + idx) * 30;
        const g = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r);
        g.addColorStop(0, node.color);
        g.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Cursor Radiant Aura
      const curG = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 300);
      curG.addColorStop(0, "rgba(59, 130, 246, 0.4)");
      curG.addColorStop(0.5, "rgba(6, 182, 212, 0.12)");
      curG.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = curG;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 300, 0, Math.PI * 2);
      ctx.fill();

      // Render Quantum Stardust with Gravitational Swirl Physics
      stars.forEach((s) => {
        s.x += s.vx;
        s.y += s.vy;

        // Wrap around boundaries
        if (s.x < 0) s.x = width;
        if (s.x > width) s.x = 0;
        if (s.y < 0) s.y = height;
        if (s.y > height) s.y = 0;

        // Gravitational swirl toward cursor
        const dx = mouse.x - s.x;
        const dy = mouse.y - s.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 260 && dist > 15) {
          const force = (1 - dist / 260) * 1.2;
          s.x += (dx / dist) * force;
          s.y += (dy / dist) * force;

          // Tangential orbital spin
          s.x += (-dy / dist) * force * 0.8;
          s.y += (dx / dist) * force * 0.8;
        }

        s.alpha = s.baseAlpha + Math.sin(time * 3 + s.x * 0.01) * 0.25;

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${s.hue}, 90%, 75%, ${Math.max(0.05, s.alpha)})`;
        ctx.shadowColor = `hsl(${s.hue}, 90%, 70%)`;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Render Interactive Starlight Shockwaves
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.r += 4.5;
        sw.a *= 0.95;

        if (sw.a < 0.01 || sw.r >= sw.maxR) {
          shockwaves.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(59, 130, 246, ${sw.a})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.globalCompositeOperation = "source-over";

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("click", handleClick);
      clearTimeout(moveTimeout);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0 overflow-hidden select-none"
    />
  );
}
