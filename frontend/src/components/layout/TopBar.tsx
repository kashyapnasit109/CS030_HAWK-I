import { Bell, User, Search } from "lucide-react";

interface TopBarProps {
  title?: string;
}

export function TopBar({ title }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-white/[0.08] bg-[#020306]/70 px-8 backdrop-blur-2xl">
      {/* Page Title in Outfit Geometric Font */}
      <div>
        <h2 
          className="text-2xl font-extrabold tracking-tight text-white"
          style={{ fontFamily: "'Outfit', 'Space Grotesk', sans-serif" }}
        >
          {title ?? "Command Center"}
        </h2>
      </div>

      {/* Right Section — Agex Search Input & Actions */}
      <div className="flex items-center gap-4">
        {/* Prominent Agex Search Bar with ⌘K Shortcut Hint */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-hawk-muted" />
          <input 
            type="text" 
            placeholder="Search cameras, zones, events..." 
            className="h-10 w-72 rounded-full border border-white/10 bg-white/[0.04] pl-10 pr-12 text-sm text-hawk-text placeholder:text-hawk-muted/60 focus:border-hawk-blue/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-hawk-blue/30 transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-bold text-hawk-muted shadow-sm">
            ⌘K
          </div>
        </div>

        {/* Notification Bell */}
        <button
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-hawk-muted transition-all duration-200 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" strokeWidth={1.8} />
          <span className="absolute right-2 top-2">
            <span className="hawk-dot hawk-dot--crimson" style={{ width: 8, height: 8 }} />
          </span>
        </button>

        {/* User Avatar with Glowing Sapphire Halo */}
        <button
          className="flex h-10 w-10 items-center justify-center rounded-full border border-hawk-blue/40 bg-gradient-to-br from-hawk-blue/20 to-hawk-blue-deep/60 text-white shadow-[0_0_15px_rgba(59,130,246,0.35)] transition-all duration-200 hover:scale-105"
          aria-label="User menu"
        >
          <User className="h-5 w-5" strokeWidth={1.8} />
        </button>
      </div>
    </header>
  );
}
