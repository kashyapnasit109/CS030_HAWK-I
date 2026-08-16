import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Terminal, Cpu, ArrowRight } from "lucide-react";

interface CommandConsoleProps {
  isOpen: boolean;
  onClose: () => void;
}

const COMMAND_SUGGESTIONS = [
  { cmd: "/dashboard", desc: "Navigate to Dashboard (Command Center)" },
  { cmd: "/live", desc: "Open Live View CCTV Grid" },
  { cmd: "/anpr", desc: "Launch ANPR (License Plate) Test Bench" },
  { cmd: "/velocity", desc: "Launch Velocity (Speed Tracking) Test Bench" },
  { cmd: "/threat", desc: "Launch Threat & Anomaly Test Bench" },
  { cmd: "/entry", desc: "Launch Perimeter Breach Test Bench" },
  { cmd: "/misplacement", desc: "Launch Object Misplacement Bench" },
  { cmd: "/settings", desc: "Open System Settings & Telemetry" },
  { cmd: "/status", desc: "Query live Engine diagnostic stats" },
  { cmd: "/clear", desc: "Clear terminal history buffer" },
];

export function CommandConsole({ isOpen, onClose }: CommandConsoleProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([
    "HAWK-I AI COGNITIVE CONSOLE v5.0.2",
    "Initializing cognitive terminal bindings... OK",
    "Type /status or /dashboard to interact. Press ESC to close.",
  ]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);

  const filteredSuggestions = COMMAND_SUGGESTIONS.filter((s) =>
    s.cmd.toLowerCase().startsWith(input.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const executeCommand = (cmdText: string) => {
    const trimmed = cmdText.trim();
    if (!trimmed) return;

    setHistory((prev) => [...prev, `operator@hawk-i:~$ ${trimmed}`]);
    setInput("");

    const lower = trimmed.toLowerCase();

    if (lower === "/dashboard") {
      setHistory((prev) => [...prev, "Redirecting to Command Center..."]);
      setTimeout(() => { navigate("/"); onClose(); }, 400);
    } else if (lower === "/live") {
      setHistory((prev) => [...prev, "Opening CCTV grids..."]);
      setTimeout(() => { navigate("/live"); onClose(); }, 400);
    } else if (lower === "/anpr") {
      setHistory((prev) => [...prev, "Launching Automatic Number Plate Recognition..."]);
      setTimeout(() => { navigate("/modules/anpr"); onClose(); }, 400);
    } else if (lower === "/velocity") {
      setHistory((prev) => [...prev, "Launching Speed Estimation & Trajectory Radar..."]);
      setTimeout(() => { navigate("/modules/velocity"); onClose(); }, 400);
    } else if (lower === "/threat") {
      setHistory((prev) => [...prev, "Launching Neural Threat Detection model..."]);
      setTimeout(() => { navigate("/modules/threat"); onClose(); }, 400);
    } else if (lower === "/entry") {
      setHistory((prev) => [...prev, "Launching Unauthorized Perimeter Breach tracking..."]);
      setTimeout(() => { navigate("/modules/entry"); onClose(); }, 400);
    } else if (lower === "/misplacement") {
      setHistory((prev) => [...prev, "Launching Object Misplacement analytics..."]);
      setTimeout(() => { navigate("/modules/misplacement"); onClose(); }, 400);
    } else if (lower === "/settings") {
      setHistory((prev) => [...prev, "Opening configuration panel..."]);
      setTimeout(() => { navigate("/settings"); onClose(); }, 400);
    } else if (lower === "/clear") {
      setHistory([]);
    } else if (lower === "/status") {
      setHistory((prev) => [
        ...prev,
        "--- HAWK ENGINE STATUS REPORT ---",
        "• AI Core State: OPTIMAL (30 FPS/stream)",
        "• Active Modules: ANPR, Velocity, Threat, Entry, Misplacement",
        "• Network RTSP Handshakes: 9 Streams Active",
        "• GPU Memory: 5.8 / 16.0 GB VRAM Utilized",
        "• Core System Uptime: 14 hours 2 minutes",
        "---------------------------------",
      ]);
    } else {
      setHistory((prev) => [
        ...prev,
        `Unknown command: '${trimmed}'. Type / to see suggestions.`,
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (filteredSuggestions.length > 0 && input.startsWith("/")) {
        executeCommand(filteredSuggestions[suggestionIndex].cmd);
      } else {
        executeCommand(input);
      }
    } else if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSuggestionIndex((prev) => (prev + 1) % Math.max(1, filteredSuggestions.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSuggestionIndex((prev) => (prev - 1 + filteredSuggestions.length) % Math.max(1, filteredSuggestions.length));
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#060709]/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#08090C] border border-white/10 rounded-lg shadow-2xl flex flex-col overflow-hidden hawk-hud-card"
        style={{ height: "420px" }}
      >
        {/* HUD corners */}
        <span className="hawk-hud-card-bracket-bl" />
        <span className="hawk-hud-card-bracket-br" />

        {/* Terminal Header */}
        <div className="flex items-center justify-between bg-[#0B0B0E] px-4 py-3 border-b border-white/5 font-mono text-xs text-hawk-muted">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-hawk-sapphire" />
            <span className="text-white font-semibold">hawk-i-console.sh</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><Cpu className="h-3 w-3" /> GPU Load: 12%</span>
            <span className="text-[10px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">ESC Close</span>
          </div>
        </div>

        {/* Log Screen */}
        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1.5 text-hawk-muted selection:bg-hawk-sapphire/30">
          {history.map((log, idx) => (
            <div
              key={idx}
              className={
                log.startsWith("operator@hawk-i:")
                  ? "text-white"
                  : log.startsWith("---")
                  ? "text-hawk-sapphire"
                  : log.includes("Error") || log.includes("Unknown")
                  ? "text-hawk-burgundy"
                  : "text-hawk-muted/90"
              }
            >
              {log}
            </div>
          ))}
          <div ref={terminalEndRef} />
        </div>

        {/* Suggestion list */}
        {input && filteredSuggestions.length > 0 && (
          <div className="border-t border-white/5 bg-[#0B0B0E]/60 max-h-36 overflow-y-auto px-2 py-1.5 font-mono text-[11px]">
            {filteredSuggestions.map((s, idx) => (
              <div
                key={s.cmd}
                onClick={() => executeCommand(s.cmd)}
                onMouseEnter={() => setSuggestionIndex(idx)}
                className={`flex items-center justify-between px-3 py-1.5 rounded cursor-pointer transition-colors ${
                  idx === suggestionIndex
                    ? "bg-hawk-sapphire/15 text-white"
                    : "text-hawk-muted hover:text-white"
                }`}
              >
                <span className="font-bold flex items-center gap-1.5">
                  <ArrowRight className="h-3 w-3 text-hawk-sapphire" /> {s.cmd}
                </span>
                <span className="text-[10px] text-hawk-muted/70">{s.desc}</span>
              </div>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div className="border-t border-white/5 bg-[#0B0B0E] p-3 flex items-center gap-2 font-mono">
          <span className="text-hawk-sapphire font-bold text-xs select-none">operator@hawk-i:~$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setSuggestionIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type Command (e.g. /dashboard, /status, /anpr)..."
            className="flex-1 bg-transparent text-white border-none outline-none focus:ring-0 text-xs placeholder:text-white/20"
          />
        </div>
      </div>
    </div>
  );
}
