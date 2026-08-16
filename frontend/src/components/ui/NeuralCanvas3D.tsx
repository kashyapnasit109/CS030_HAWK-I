import { useEffect, useRef } from "react";

export function NeuralCanvas3D() {
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

    // 3D Geometric Wave Grid Topology
    const cols = 45;
    const rows = 35;
    const spacingX = 42;
    const spacingY = 32;
    let time = 0;

    const render = () => {
      time += 0.018;

      // Smooth mouse interpolation
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      ctx.clearRect(0, 0, width, height);

      // Camera Perspective projection parameters
      const fov = 350;
      const cameraY = -120;
      const cameraZ = -220;

      // Mouse influence angles
      const mouseTiltX = ((mouse.y - height / 2) / height) * 0.35;
      const mouseTiltY = ((mouse.x - width / 2) / width) * 0.35;

      const projectedPoints: { x: number; y: number; z: number; depth: number }[][] = [];

      for (let r = 0; r < rows; r++) {
        projectedPoints[r] = [];
        for (let c = 0; c < cols; c++) {
          // World 3D coordinates
          const worldX = (c - cols / 2) * spacingX;
          const worldZ = r * spacingY + 100;

          // Harmonic wave elevation (Y)
          const distFromCenter = Math.hypot(worldX, worldZ - 400);
          const mouseDist = Math.hypot(
            worldX - (mouse.x - width / 2) * 1.5,
            worldZ - (mouse.y - height / 2) * 1.5
          );

          const mouseWave = Math.sin(mouseDist * 0.015 - time * 2) * Math.max(0, 50 - mouseDist * 0.1);
          const baseWave =
            Math.sin(worldX * 0.008 + time) * 35 +
            Math.cos(worldZ * 0.008 + time * 1.2) * 35 +
            Math.sin(distFromCenter * 0.01 - time * 1.5) * 20;

          const worldY = baseWave + mouseWave + 120;

          // 3D rotation with mouse tilt
          const rotY = worldX * Math.cos(mouseTiltY) + worldZ * Math.sin(mouseTiltY);
          const rotZ = -worldX * Math.sin(mouseTiltY) + worldZ * Math.cos(mouseTiltY);
          const rotX = worldY * Math.cos(mouseTiltX) - rotZ * Math.sin(mouseTiltX);
          const finalZ = worldY * Math.sin(mouseTiltX) + rotZ * Math.cos(mouseTiltX) - cameraZ;

          // Perspective division
          if (finalZ > 10) {
            const scale = fov / finalZ;
            const screenX = width / 2 + rotY * scale;
            const screenY = height / 2 + (rotX - cameraY) * scale;
            projectedPoints[r][c] = { x: screenX, y: screenY, z: finalZ, depth: scale };
          }
        }
      }

      // Draw 3D Lines with Chromatic Depth Gradients
      ctx.lineWidth = 1;

      // Horizontal grid lines
      for (let r = 0; r < rows; r++) {
        ctx.beginPath();
        let started = false;
        for (let c = 0; c < cols; c++) {
          const pt = projectedPoints[r][c];
          if (!pt) continue;

          if (!started) {
            ctx.moveTo(pt.x, pt.y);
            started = true;
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        }

        const depthAlpha = Math.max(0.04, Math.min(0.35, 1 - r / rows));
        ctx.strokeStyle = `rgba(59, 130, 246, ${depthAlpha})`;
        ctx.stroke();
      }

      // Vertical connecting lines with luminescent nodes
      for (let c = 0; c < cols; c += 2) {
        ctx.beginPath();
        let started = false;
        for (let r = 0; r < rows; r++) {
          const pt = projectedPoints[r][c];
          if (!pt) continue;

          if (!started) {
            ctx.moveTo(pt.x, pt.y);
            started = true;
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        }

        const colAlpha = Math.max(0.02, Math.min(0.2, (cols - Math.abs(c - cols / 2)) / cols));
        ctx.strokeStyle = `rgba(16, 185, 129, ${colAlpha})`;
        ctx.stroke();
      }

      // Floating luminous quantum nodes
      for (let r = 0; r < rows; r += 3) {
        for (let c = 0; c < cols; c += 3) {
          const pt = projectedPoints[r][c];
          if (!pt) continue;

          const pulse = Math.sin(time * 3 + r + c) * 0.5 + 0.5;
          const nodeAlpha = Math.max(0, (1 - pt.z / 1200)) * pulse * 0.7;

          if (nodeAlpha > 0.05) {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, Math.max(1, pt.depth * 2.2), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(59, 130, 246, ${nodeAlpha})`;
            ctx.shadowColor = "#3B82F6";
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }

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
