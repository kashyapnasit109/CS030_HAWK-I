import orbSrc from "../../assets/hawk_i_3d_orb_transparent.png";

interface LogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}

export function Logo({ size = 48, showWordmark = false, className = "" }: LogoProps) {
  return (
    <div className={`flex flex-col items-center justify-center group cursor-none ${className}`}>
      
      {/* 
        The 3D Iridescent Orb 
        Applying the zoom-out (scale-90) and elegant glow hover transition.
      */}
      <div 
        className="relative flex items-center justify-center transition-all duration-700 ease-out group-hover:scale-95" 
        style={{ width: size, height: size }}
      >
        {/* Subtle hover glow ring */}
        <div className="absolute inset-0 bg-hawk-sapphire/30 rounded-full blur-[30px] mix-blend-screen opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none scale-110" />
        
        <img
          src={orbSrc}
          alt="Hawk-I Core"
          className="w-full h-full object-contain filter contrast-125 brightness-110 drop-shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-transform duration-1000 group-hover:rotate-12"
        />
      </div>
      
      {/* 
        Wordmark
        Fixed alignment, removed top margin when sizing down. 
        Glow should not overpower the text. 
      */}
      {showWordmark && (
        <div className="mt-4 flex flex-col items-center select-none cursor-none relative z-10 transition-transform duration-700 group-hover:-translate-y-1">
          <h1 className="text-3xl font-bold text-white tracking-[0.15em] font-display uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
            Hawk-I
          </h1>
          <p className="text-[7.5px] font-mono tracking-[0.45em] text-hawk-muted uppercase mt-1 opacity-80 pl-1 drop-shadow-md">
            Advanced Vision Technologies
          </p>
        </div>
      )}
    </div>
  );
}
