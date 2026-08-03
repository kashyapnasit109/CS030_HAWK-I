interface LogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}

/**
 * HAWK-I Brand Logo v5
 * 1. Icon Mark: Iridescent Liquid Glass Orb with glowing multi-color rim (purple -> blue -> green -> red)
 *    and a crisp geometric Hawk aperture emblem inside (matching liquid orb references).
 * 2. Wordmark: "hawk-i" in bold lowercase Space Grotesk/Outfit with electric blue glowing dot,
 *    and "CCTV INTELLIGENCE PLATFORM" in tracked uppercase text.
 */
export function Logo({ size = 42, showWordmark = true, className = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-3.5 ${className}`}>
      {/* Liquid Iridescent Glass Orb Icon Mark */}
      <div 
        className="hawk-logo-orb shrink-0" 
        style={{ width: size, height: size }}
      >
        <svg
          width={size * 0.65}
          height={size * 0.65}
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Hawk Eye / Lens Aperture emblem */}
          <g stroke="#F8FAFC" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            {/* Outer winged eye arch */}
            <path d="M 6,20 C 12,11 28,11 34,20 C 28,29 12,29 6,20 Z" strokeWidth="2.4" opacity="0.95" />
            {/* Inner pupil circle */}
            <circle cx="20" cy="20" r="5.5" strokeWidth="2" opacity="0.9" fill="rgba(59,130,246,0.3)" />
            {/* Core pupil point */}
            <circle cx="20" cy="20" r="2" fill="#F8FAFC" stroke="none" />
            {/* Corner wing accents */}
            <path d="M 6,20 L 2,20" strokeWidth="2" opacity="0.7" />
            <path d="M 34,20 L 38,20" strokeWidth="2" opacity="0.7" />
          </g>
        </svg>
      </div>

      {/* Wordmark Lockup — HAWK-I */}
      {showWordmark && (
        <div className="flex flex-col justify-center">
          <div className="flex items-baseline">
            <span
              className="text-[22px] font-extrabold leading-none tracking-[-0.04em] text-white"
              style={{ fontFamily: "'Space Grotesk', 'Outfit', sans-serif" }}
            >
              hawk-i
            </span>
            <span className="ml-1 h-2 w-2 rounded-full bg-[#3B82F6] shadow-[0_0_10px_#3B82F6]" />
          </div>
          <span 
            className="mt-1 text-[9px] font-bold uppercase tracking-[0.24em] text-[#94A3B8] opacity-80"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            CCTV INTELLIGENCE PLATFORM
          </span>
        </div>
      )}
    </div>
  );
}
