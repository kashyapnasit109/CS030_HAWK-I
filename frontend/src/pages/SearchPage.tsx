import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Search as SearchIcon, Loader2, Video, FileQuestion, Activity, AlertTriangle, UserX } from "lucide-react";

type SearchResult = {
  event_id: number;
  description: string;
  similarity_score: number;
  camera_name: string;
  zone_type: string;
  detected_at: string;
  module: string;
};

export default function SearchPage() {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [error, setError] = useState("");

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setResults(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ query, limit: 10 })
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      setResults(data);
    } catch (err: any) {
      console.error(err);
      setError("Failed to execute search. Ensure ML service is running.");
    } finally {
      setLoading(false);
    }
  };

  const getModuleIcon = (module: string) => {
    switch (module) {
      case 'vehicle': return <Video className="h-4 w-4" />;
      case 'object': return <FileQuestion className="h-4 w-4" />;
      case 'loitering': return <AlertTriangle className="h-4 w-4" />;
      case 'intrusion': return <UserX className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto mt-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-semibold text-white mb-2" style={{ fontFamily: "'Clash Display', sans-serif" }}>
          Semantic Search
        </h1>
        <p className="text-sm text-hawk-muted">
          Use natural language to search across all event embeddings
        </p>
      </div>

      <form onSubmit={handleSearch}>
        <Card className="flex items-center gap-4 border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.05)]" glowColor="blue">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-blue-400/70" strokeWidth={1.75} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
              placeholder="e.g. 'Unregistered vehicle near north gate'"
              className="h-12 w-full rounded-full border border-white/5 bg-black/40 pl-11 pr-4 text-sm text-white placeholder:text-white/30 outline-none transition-all duration-300 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 focus:bg-black/60"
            />
          </div>
          <Button 
            type="submit" 
            variant="primary" 
            size="lg" 
            disabled={!query.trim() || loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <SearchIcon className="h-4 w-4 mr-2" strokeWidth={1.75} />}
            Search
          </Button>
        </Card>
      </form>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400 text-center">
          {error}
        </div>
      )}

      {results && results.length === 0 && (
         <Card className="border-white/5 bg-black/20">
         <div className="flex h-64 flex-col items-center justify-center gap-3 opacity-60">
           <div className="h-16 w-16 rounded-full bg-hawk-muted/10 flex items-center justify-center border border-hawk-muted/20 mb-2">
              <SearchIcon className="h-6 w-6 text-hawk-muted" strokeWidth={1.5} />
           </div>
           <p className="text-base font-semibold text-white" style={{ fontFamily: "'Clash Display', sans-serif" }}>
             No results found
           </p>
           <p className="text-xs text-hawk-muted">
             Try a different query or make sure you have backfilled the embeddings.
           </p>
         </div>
       </Card>
      )}

      {results && results.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-semibold text-hawk-muted pl-1">Found {results.length} matches</p>
          {results.map((result) => {
            const similarityPercent = Math.round(result.similarity_score * 100);
            return (
              <Card key={result.event_id} padding="md" className="group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4 flex-1">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border bg-blue-500/10 border-blue-500/20 text-blue-400">
                      {getModuleIcon(result.module)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white mb-1 leading-relaxed">
                        {result.description}
                      </p>
                      <p className="text-xs text-hawk-muted">
                        {result.camera_name} <span className="opacity-50 mx-1">•</span> {new Date(result.detected_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Badge variant={similarityPercent > 60 ? "emerald" : similarityPercent > 40 ? "amber" : "neutral"}>
                      {similarityPercent}% Match
                    </Badge>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  );
}
