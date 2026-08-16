import { useEffect, useRef } from "react";

export function FluidCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const badgeTextRef = useRef<HTMLSpanElement>(null);
  const rippleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only activate on devices with a mouse/trackpad
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let mouseX = -200;
    let mouseY = -200;
    let isVisible = false;
    let currentTooltip = "";

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (!isVisible) {
        isVisible = true;
        if (cursorRef.current) cursorRef.current.style.opacity = "1";
      }

      // TRUE 0ms INSTANT DIRECT HARDWARE TRANSFORM (NO CSS TRANSITION DELAY)
      if (arrowRef.current) {
        arrowRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      }

      if (badgeRef.current) {
        badgeRef.current.style.transform = `translate3d(${mouseX + 16}px, ${mouseY + 16}px, 0)`;
      }

      // Detect contextual tooltip from hovered element
      const target = e.target as HTMLElement | null;
      if (target) {
        const interactive = target.closest<HTMLElement>(
          'button, a, input, select, [role="button"], .interactive, .cursor-pointer, video, canvas, [data-cursor-tooltip]'
        );

        if (interactive) {
          const customTip = interactive.getAttribute("data-cursor-tooltip");
          if (customTip) {
            currentTooltip = customTip.toUpperCase();
          } else if (interactive.tagName === "VIDEO" || interactive.tagName === "CANVAS") {
            currentTooltip = "LIVE MATRIX";
          } else if (interactive.tagName === "BUTTON") {
            const text = interactive.innerText?.trim();
            if (text && text.length < 16 && !text.includes("\n")) {
              currentTooltip = text.toUpperCase();
            } else {
              currentTooltip = "EXECUTE";
            }
          } else if (interactive.tagName === "A") {
            currentTooltip = "OPEN";
          } else if (interactive.tagName === "INPUT" || interactive.tagName === "SELECT") {
            currentTooltip = "INPUT";
          } else {
            currentTooltip = "ACTION";
          }

          if (badgeTextRef.current) {
            badgeTextRef.current.innerText = currentTooltip;
          }
          if (badgeRef.current) {
            badgeRef.current.style.opacity = "1";
          }
        } else {
          currentTooltip = "";
          if (badgeRef.current) {
            badgeRef.current.style.opacity = "0";
          }
        }
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (arrowRef.current) {
        arrowRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) scale(0.85)`;
      }

      // Instant tactile click shockwave
      if (rippleRef.current) {
        rippleRef.current.style.left = `${e.clientX}px`;
        rippleRef.current.style.top = `${e.clientY}px`;
        rippleRef.current.style.opacity = "1";
        rippleRef.current.style.transform = "translate(-50%, -50%) scale(1.5)";
        setTimeout(() => {
          if (rippleRef.current) {
            rippleRef.current.style.opacity = "0";
            rippleRef.current.style.transform = "translate(-50%, -50%) scale(0.2)";
          }
        }, 220);
      }
    };

    const handleMouseUp = () => {
      if (arrowRef.current) {
        arrowRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) scale(1)`;
      }
    };

    const handleMouseLeave = () => {
      isVisible = false;
      if (cursorRef.current) cursorRef.current.style.opacity = "0";
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      className="pointer-events-none fixed inset-0 z-[99999] opacity-0 transition-opacity duration-150 select-none overflow-hidden"
      style={{ pointerEvents: "none" }}
    >
      {/* Click Tactile Shockwave */}
      <div
        ref={rippleRef}
        className="fixed w-8 h-8 rounded-full border border-hawk-sapphire/90 bg-hawk-sapphire/30 pointer-events-none -translate-x-1/2 -translate-y-1/2 opacity-0 transition-all duration-200 ease-out z-[99998] shadow-[0_0_15px_rgba(59,130,246,0.9)]"
      />

      {/* 3D Isometric Cyber Arrowhead (Pure 0ms Native Hardware Speed) */}
      <div
        ref={arrowRef}
        className="fixed top-0 left-0 will-change-transform z-[100000] pointer-events-none"
        style={{ transformOrigin: "0 0", transition: "none" }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-[0_4px_12px_rgba(0,240,255,0.65)]"
        >
          {/* 3D Extruded Depth Shadow */}
          <path
            d="M2.5 2.5L12 25.5L16.5 16.5L25.5 12L2.5 2.5Z"
            fill="#080E24"
            stroke="#1E3A8A"
            strokeWidth="2"
            transform="translate(2.5, 3.5)"
          />

          {/* 3D Bevel Rim Highlight (Laser Cyan & Electric Violet) */}
          <path
            d="M2 2L11.5 25L16 16L25 11.5L2 2Z"
            fill="url(#cyberArrowGradFast)"
            stroke="url(#cyberRimGradFast)"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />

          {/* Inner Prismatic Glow Core */}
          <path
            d="M4.5 4.5L10.5 19L13.8 13.8L19 10.5L4.5 4.5Z"
            fill="url(#innerCoreGradFast)"
            opacity="0.95"
          />

          {/* Precision Needle Dot Tip */}
          <circle cx="2" cy="2" r="1.5" fill="#FFFFFF" />

          {/* Gradient Definitions */}
          <defs>
            <linearGradient id="cyberArrowGradFast" x1="2" y1="2" x2="25" y2="25" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#00F0FF" />
              <stop offset="50%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>

            <linearGradient id="cyberRimGradFast" x1="0" y1="0" x2="30" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="30%" stopColor="#00F0FF" />
              <stop offset="80%" stopColor="#EC4899" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>

            <linearGradient id="innerCoreGradFast" x1="4.5" y1="4.5" x2="19" y2="19" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#00F0FF" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0.25" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Floating Frosted Glass Context Tooltip / Teaser Badge */}
      <div
        ref={badgeRef}
        className="fixed top-0 left-0 pointer-events-none will-change-transform opacity-0 transition-opacity duration-100 z-[99999]"
        style={{ transition: "opacity 0.12s ease" }}
      >
        <div className="flex items-center gap-1.5 px-2.5 py-0.8 rounded-full bg-[#080B14]/90 backdrop-blur-xl border border-white/20 shadow-[0_8px_30px_rgba(0,0,0,0.85),0_0_15px_rgba(59,130,246,0.35)]">
          <span className="h-1.5 w-1.5 rounded-full bg-hawk-sapphire animate-ping" />
          <span
            ref={badgeTextRef}
            className="text-[8.5px] font-mono font-black tracking-widest text-white uppercase whitespace-nowrap"
          >
            EXECUTE
          </span>
        </div>
      </div>
    </div>
  );
}
