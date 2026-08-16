import { useEffect, useRef } from "react";

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Disable on touch devices
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let mouseX = -100;
    let mouseY = -100;
    let ringX = -100;
    let ringY = -100;
    let isHovering = false;
    let isClicking = false;
    let isVisible = false;
    let animId: number;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (!isVisible) {
        isVisible = true;
        if (dotRef.current) dotRef.current.style.opacity = "1";
        if (ringRef.current) ringRef.current.style.opacity = "1";
      }

      // Direct instant hardware transform for inner point (0ms input lag)
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
      }
    };

    const handleMouseDown = () => {
      isClicking = true;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%) scale(0.85)`;
      }
    };

    const handleMouseUp = () => {
      isClicking = false;
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "BUTTON" ||
        target.tagName === "A" ||
        target.tagName === "INPUT" ||
        target.tagName === "SELECT" ||
        target.closest("button") ||
        target.closest("a") ||
        target.closest("input") ||
        target.closest("select") ||
        target.classList.contains("interactive") ||
        target.closest(".interactive") ||
        target.classList.contains("cursor-pointer") ||
        target.closest(".cursor-pointer")
      ) {
        isHovering = true;
      } else {
        isHovering = false;
      }
    };

    const handleMouseLeave = () => {
      isVisible = false;
      if (dotRef.current) dotRef.current.style.opacity = "0";
      if (ringRef.current) ringRef.current.style.opacity = "0";
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mouseover", handleMouseOver, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);

    // 60-144 FPS GPU Smooth Physics Render Loop
    const render = () => {
      // High-precision smooth spring interpolation
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;

      if (ringRef.current && isVisible) {
        const scale = isClicking ? 0.8 : isHovering ? 1.6 : 1;
        const bg = isHovering ? "rgba(59, 130, 246, 0.12)" : "rgba(255, 255, 255, 0.02)";
        const border = isHovering ? "rgba(59, 130, 246, 0.6)" : "rgba(255, 255, 255, 0.25)";
        const shadow = isHovering ? "0 0 20px rgba(59, 130, 246, 0.4)" : "0 0 10px rgba(0, 0, 0, 0.5)";

        ringRef.current.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%) scale(${scale})`;
        ringRef.current.style.backgroundColor = bg;
        ringRef.current.style.borderColor = border;
        ringRef.current.style.boxShadow = shadow;
      }

      if (dotRef.current && isVisible) {
        dotRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%) scale(${isHovering ? 0 : 1})`;
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <>
      {/* Outer Tactical Glass Refraction Ring */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 w-8 h-8 rounded-full border border-white/25 pointer-events-none z-[9999] backdrop-blur-[2px] transition-opacity duration-300 will-change-transform opacity-0"
      />

      {/* Inner Zero-Lag Tactical Precision Laser Dot */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 w-1.5 h-1.5 rounded-full bg-white pointer-events-none z-[10000] shadow-[0_0_8px_rgba(255,255,255,1)] transition-opacity duration-300 will-change-transform opacity-0"
      />
    </>
  );
}
