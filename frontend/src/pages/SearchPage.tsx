import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Search as SearchIcon } from "lucide-react";

export default function SearchPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto mt-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-semibold text-white mb-2" style={{ fontFamily: "'Clash Display', sans-serif" }}>
          Footage Search
        </h1>
        <p className="text-sm text-hawk-muted">
          Use natural language to search across all connected cameras
        </p>
      </div>

      {/* Search bar */}
      <Card className="flex items-center gap-4 border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.05)]" glowColor="blue">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-blue-400/70" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="e.g. 'person in red jacket near entrance at 3 PM'"
            className="h-12 w-full rounded-full border border-white/5 bg-black/40 pl-11 pr-4 text-sm text-white placeholder:text-white/30 outline-none transition-all duration-300 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 focus:bg-black/60"
          />
        </div>
        <Button variant="primary" size="lg" icon={<SearchIcon className="h-4 w-4" strokeWidth={1.75} />}>
          Search
        </Button>
      </Card>

      {/* Results placeholder */}
      <Card className="border-white/5 bg-black/20">
        <div className="flex h-64 flex-col items-center justify-center gap-3 opacity-60">
          <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 mb-2">
             <SearchIcon className="h-6 w-6 text-blue-400" strokeWidth={1.5} />
          </div>
          <p className="text-base font-semibold text-white" style={{ fontFamily: "'Clash Display', sans-serif" }}>
            Ready for your query
          </p>
          <p className="text-xs text-hawk-muted">
            AI search functionality will be connected to the ML service soon.
          </p>
        </div>
      </Card>
    </div>
  );
}
