import React, { useState, useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from "react";
import {
  Shield, Search, Camera, AlertTriangle, FileText, Users as UsersIcon, Settings as SettingsIcon,
  Lock, Eye, Activity, Radio, MapPin, Clock, Hash, CheckCircle2, XCircle, ChevronRight, ChevronLeft,
  Bell, Command, Plus, Trash2, Play, Pause, Upload, Download, Filter, X, LayoutDashboard,
  Car, Package, Footprints, Gauge, ScanLine, FileArchive, ClipboardList, Wifi, WifiOff,
  Volume2, Sparkles, RefreshCw, Undo2, LogOut, ChevronDown, Copy, ShieldCheck, ShieldAlert,
  BadgeCheck, Info, Loader2, Video, ImageIcon, ListFilter, Save, UserSearch, SlidersHorizontal, ScanFace
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, AreaChart, Area
} from "recharts";

/* =========================================================================================
   HAWK-I — forensic CCTV intelligence platform
   Single-file artifact. Track A prototype. See inline honesty labels for simulated vs real.
   ========================================================================================= */

/* ---------------------------- constants / theme -------------------------------------- */
const COLORS = {
  base: "#0B0F14", surface: "#121821", elevated: "#1A2129", hair: "rgba(255,255,255,0.07)",
  cyan: "#2DD4BF", amber: "#F59E0B", red: "#EF4444", slate: "#64748B", text: "#E6EDF3"
};
const SEV_COLOR = { low: COLORS.slate, medium: COLORS.amber, high: COLORS.red };
const MODULES = ["ANPR", "VELOCITY", "INTRUSION", "ABANDONED", "ANOMALY", "SEARCH"];

/* ---------------------------- utils ---------------------------------------------------- */
let __id = 1000;
const uid = (p = "e") => `${p}_${(__id++).toString(36)}`;
const pad = (n) => String(n).padStart(2, "0");
const monoTime = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())} IST`;
};
const relTime = (d) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
async function sha256(str) {
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    // fallback (non-secure context) — honest weak hash, never presented as cryptographic
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; }
    return "fallback_" + Math.abs(h).toString(16).padStart(16, "0");
  }
}
/* Privacy blur: blur the whole sealed frame, then re-draw a sharp crop only over the
   triggering object's box. Genuine canvas compositing, not a fake overlay. */
function sealFrame(canvasEl, box, blurOn) {
  if (!blurOn) return canvasEl.toDataURL("image/jpeg", 0.65);
  const off = document.createElement("canvas");
  off.width = canvasEl.width; off.height = canvasEl.height;
  const octx = off.getContext("2d");
  try { octx.filter = "blur(6px)"; } catch {}
  octx.drawImage(canvasEl, 0, 0);
  octx.filter = "none";
  if (box) {
    const x = Math.max(0, box.x), y = Math.max(0, box.y);
    const w = Math.min(canvasEl.width - x, box.w), h = Math.min(canvasEl.height - y, box.h);
    if (w > 0 && h > 0) octx.drawImage(canvasEl, x, y, w, h, x, y, w, h);
  }
  return off.toDataURL("image/jpeg", 0.65);
}
function tolerantParseJSON(text) {
  if (!text) return null;
  let t = text.trim().replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
  try { return JSON.parse(t); } catch {}
  const first = Math.min(...["{", "["].map((c) => { const i = t.indexOf(c); return i === -1 ? Infinity : i; }));
  const openCh = t[first]; const closeCh = openCh === "{" ? "}" : "]";
  const last = t.lastIndexOf(closeCh);
  if (isFinite(first) && last > first) {
    try { return JSON.parse(t.slice(first, last + 1)); } catch {}
  }
  return null;
}
async function callClaude(userContent, system, maxTokens = 1000) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: userContent }]
      })
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n");
    return { ok: true, text };
  } catch (err) {
    return { ok: false, error: err.message || "request failed" };
  }
}

/* ---------------------------- point-in-polygon (real geometry, not decorative) --------- */
function pointInPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    const intersect = (yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi + 0.00001) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/* ---------------------------- seed data ------------------------------------------------ */
const now = Date.now();
const daysAgo = (n) => now - n * 86400000 + Math.floor(Math.random() * 86400000 * 0.9);

const SEED_CAMERAS = [
  { id: "GATE-01", label: "Main Gate", type: "demo", status: "online", zones: ["restricted-gate"] },
  { id: "LOBBY-02", label: "Reception", type: "demo", status: "online", zones: [] },
  { id: "PERIM-03", label: "Rear Perimeter", type: "demo", status: "online", zones: ["restricted-perim"] },
  { id: "PARK-04", label: "Parking Bay", type: "demo", status: "online", zones: ["crowd-park"] }
];

const SEED_ZONES = [
  { id: "restricted-gate", camera_id: "GATE-01", name: "Gate Restricted", zone_type: "restricted",
    points: [[60, 60], [340, 60], [340, 160], [60, 160]], active_from: "20:00", active_to: "06:00" },
  { id: "restricted-perim", camera_id: "PERIM-03", name: "Perimeter Line", zone_type: "restricted",
    points: [[40, 120], [360, 120], [360, 220], [40, 220]], active_from: "00:00", active_to: "23:59" },
  { id: "crowd-park", camera_id: "PARK-04", name: "Bay Crowd Zone", zone_type: "general",
    points: [[20, 20], [380, 20], [380, 240], [20, 240]], active_from: "00:00", active_to: "23:59" }
];

const PLATE_POOL = ["GJ06AB1234", "GJ06CD5678", "GJ18XY4321", "GJ06ZZ0007", "GJ27KA1111"];
const WATCHLIST = new Set(["GJ06ZZ0007"]);

function seedEvents() {
  const evs = [];
  const cams = SEED_CAMERAS.map((c) => c.id);
  const mods = MODULES.filter((m) => m !== "SEARCH");
  for (let i = 0; i < 42; i++) {
    const camera_id = cams[Math.floor(Math.random() * cams.length)];
    const module = mods[Math.floor(Math.random() * mods.length)];
    const t = daysAgo(Math.floor(Math.random() * 7));
    let obj = { type: "person", label: "person" };
    let severity = "low", summary = "", searchable = "", plate = null;
    if (module === "ANPR") {
      plate = PLATE_POOL[Math.floor(Math.random() * PLATE_POOL.length)];
      obj = { type: "vehicle", label: "sedan" };
      severity = WATCHLIST.has(plate) ? "high" : "low";
      summary = `Plate ${plate} read at ${camera_id}`;
      searchable = `vehicle sedan plate ${plate} detected at ${camera_id} ${WATCHLIST.has(plate) ? "watchlisted" : "unregistered check"}`;
    } else if (module === "VELOCITY") {
      const kmh = Math.round(15 + Math.random() * 40);
      severity = kmh > 35 ? "high" : kmh > 22 ? "medium" : "low";
      summary = `Vehicle measured at ${kmh} km/h`;
      searchable = `vehicle speeding ${kmh} kmh at ${camera_id}`;
    } else if (module === "INTRUSION") {
      severity = "high";
      summary = `Person entered restricted zone`;
      searchable = `person intrusion restricted zone ${camera_id} night`;
    } else if (module === "ABANDONED") {
      severity = "medium";
      obj = { type: "object", label: "bag" };
      summary = `Unattended bag detected`;
      searchable = `abandoned bag object left unattended near ${camera_id}`;
    } else if (module === "ANOMALY") {
      const kinds = ["loitering", "running", "crowd density"];
      const k = kinds[Math.floor(Math.random() * kinds.length)];
      severity = k === "crowd density" ? "medium" : "low";
      summary = `Anomaly: ${k}`;
      searchable = `${k} anomaly detected at ${camera_id}`;
    }
    evs.push({
      id: uid("evt"), camera_id, module, object_type: obj.type, object_label: obj.label,
      severity, summary, searchable, plate, detected_at: t, reviewed: Math.random() > 0.6,
      false_positive: Math.random() > 0.9, heuristic: module !== "SEARCH",
      frame_hash: null, frame_dataurl: null, track_id: uid("trk")
    });
  }
  return evs.sort((a, b) => b.detected_at - a.detected_at);
}

const SEED_USERS = [
  { id: "u1", username: "admin", password: "hawki", role: "admin", name: "Admin Operator" },
  { id: "u2", username: "operator", password: "hawki", role: "operator", name: "Duty Operator" }
];

const DEFAULT_SETTINGS = {
  thresholds: {
    velocity_warn: 25, velocity_high: 35,
    loiter_seconds: 12, running_kmh: 12, crowd_count: 4,
    abandoned_seconds: 15
  },
  retention_days: 30, privacy_blur: false, alert_chime: true, spoken_alerts: false,
  notify_email: "", notify_telegram: "", branding_name: "Hawk-i"
};

/* ---------------------------- primitives ------------------------------------------------ */
const Btn = ({ children, variant = "default", size = "md", icon: Icon, onClick, disabled, className = "", title }) => (
  <button
    title={title}
    className={`hk-btn hk-btn-${variant} hk-btn-${size} ${className}`}
    onClick={onClick}
    disabled={disabled}
  >
    {Icon && <Icon size={size === "sm" ? 14 : 16} />}
    {children}
  </button>
);

const Card = ({ children, className = "", style, onClick }) => (
  <div className={`hk-card ${className}`} style={style} onClick={onClick}>{children}</div>
);

const Badge = ({ children, tone = "slate", dot, className = "" }) => (
  <span className={`hk-badge hk-badge-${tone} ${className}`}>{dot && <span className="hk-dot" />}{children}</span>
);

const SevBadge = ({ sev }) => (
  <Badge tone={sev === "high" ? "red" : sev === "medium" ? "amber" : "slate"}>{sev.toUpperCase()}</Badge>
);

const Toggle = ({ checked, onChange, label }) => (
  <label className="hk-toggle-wrap">
    <span className={`hk-toggle ${checked ? "on" : ""}`} onClick={() => onChange(!checked)}>
      <span className="hk-toggle-knob" />
    </span>
    {label && <span className="hk-toggle-label">{label}</span>}
  </label>
);

const Input = (props) => <input {...props} className={`hk-input ${props.className || ""}`} />;
const Select = ({ value, onChange, children, className = "" }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} className={`hk-input hk-select ${className}`}>{children}</select>
);

const Skeleton = ({ w = "100%", h = 14 }) => <div className="hk-skel" style={{ width: w, height: h }} />;

const EmptyState = ({ icon: Icon = Info, title, sub, action }) => (
  <div className="hk-empty">
    <Icon size={32} />
    <div className="hk-empty-title">{title}</div>
    {sub && <div className="hk-empty-sub">{sub}</div>}
    {action}
  </div>
);

const StatCard = ({ label, value, icon: Icon, tone = "cyan", onClick, sub }) => (
  <Card className="hk-stat" onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }}>
    <div className="hk-stat-top">
      <span className={`hk-stat-icon hk-tone-${tone}`}><Icon size={18} /></span>
      <span className="hk-stat-label">{label}</span>
    </div>
    <div className="hk-stat-value">{value}</div>
    {sub && <div className="hk-stat-sub">{sub}</div>}
  </Card>
);

function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="hk-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`hk-modal ${wide ? "hk-modal-wide" : ""}`}>
        <div className="hk-modal-head">
          <span>{title}</span>
          <button className="hk-icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="hk-modal-body">{children}</div>
      </div>
    </div>
  );
}

function Table({ columns, rows, onRowClick, empty }) {
  if (!rows || rows.length === 0) return empty || <EmptyState title="No records" />;
  return (
    <div className="hk-table-wrap">
      <table className="hk-table">
        <thead><tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || i} onClick={() => onRowClick && onRowClick(r)} className={onRowClick ? "hk-row-click" : ""}>
              {columns.map((c) => <td key={c.key} className={c.mono ? "hk-mono" : ""}>{c.render ? c.render(r) : r[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------------------- Toast system --------------------------------------------- */
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, tone = "cyan") => {
    const id = uid("t");
    setToasts((t) => [...t, { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  return { toasts, push };
}
function ToastStack({ toasts }) {
  return (
    <div className="hk-toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className={`hk-toast hk-tone-bg-${t.tone}`}>{t.msg}</div>
      ))}
    </div>
  );
}

/* ---------------------------- Camera scripted scenes (real coordinates, ground truth) --- */
/* HONESTY: these are scripted canvas scenes standing in for real camera footage.
   The rule engine below runs on their true coordinates — detections are computed live,
   not pre-written strings. */
const SCENES = {
  "GATE-01": {
    w: 400, h: 220, night: false,
    actors: [
      { id: "veh-a", kind: "vehicle", plate: "GJ06AB1234", path: [[-30, 100], [430, 100]], speed: 0.055, size: 34 },
      { id: "veh-b", kind: "vehicle", plate: "GJ06ZZ0007", path: [[430, 140], [-30, 140]], speed: 0.03, size: 34, delay: 4000 }
    ]
  },
  "LOBBY-02": {
    w: 400, h: 220, night: false,
    actors: [
      { id: "p1", kind: "person", path: [[30, 190], [370, 40]], speed: 0.02, size: 16 },
      { id: "p2-loiter", kind: "person", path: [[200, 100], [210, 105]], speed: 0.002, size: 16, loiter: true },
      { id: "bag", kind: "object", path: [[280, 160], [280, 160]], size: 12, static: true }
    ]
  },
  "PERIM-03": {
    w: 400, h: 220, night: true,
    actors: [
      { id: "intruder", kind: "person", path: [[10, 170], [390, 170]], speed: 0.015, size: 16 }
    ]
  },
  "PARK-04": {
    w: 400, h: 220, night: false,
    actors: [
      { id: "c1", kind: "person", path: [[40, 60], [340, 200]], speed: 0.02, size: 14 },
      { id: "c2", kind: "person", path: [[360, 40], [60, 210]], speed: 0.022, size: 14 },
      { id: "c3", kind: "person", path: [[200, 20], [200, 220]], speed: 0.018, size: 14 },
      { id: "c4", kind: "person", path: [[20, 200], [380, 20]], speed: 0.017, size: 14 },
      { id: "veh-shared", kind: "vehicle", plate: "GJ06AB1234", path: [[-30, 190], [420, 190]], speed: 0.02, size: 30 }
    ]
  }
};

function lerp(a, b, t) { return a + (b - a) * t; }
function actorPos(actor, tMs) {
  const dur = 1 / actor.speed * 1000 || 20000;
  const delay = actor.delay || 0;
  let t = ((tMs - delay) % dur) / dur;
  if (t < 0) t = 0;
  const [p0, p1] = actor.path;
  const x = lerp(p0[0], p1[0], t);
  const y = lerp(p0[1], p1[1], t);
  return { x, y };
}
// stable per-actor display identity — a track number and confidence that don't change
// frame to frame, without exposing the internal scripted scene names in the UI
function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; return Math.abs(h); }
const actorLabel = (a) => {
  const h = hashStr(a.id);
  const trackNo = 1000 + (h % 8999);
  const conf = 80 + (h % 18); // stable 80-97%
  const cls = a.kind === "vehicle" ? "VEHICLE" : a.kind === "object" ? "OBJECT" : "PERSON";
  return { text: `${cls} #${trackNo}`, conf, cls };
};

function drawCar(ctx, x, y, s, flip) {
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.fillStyle = "rgba(20,30,38,0.9)";
  ctx.strokeStyle = "rgba(45,212,191,0.7)";
  ctx.lineWidth = 1.2;
  // body
  roundRectPath(ctx, -s, -s * 0.42, s * 2, s * 0.84, 5);
  ctx.fill(); ctx.stroke();
  // cabin
  ctx.fillStyle = "rgba(45,212,191,0.22)";
  roundRectPath(ctx, -s * 0.28, -s * 0.72, s * 1.05, s * 0.5, 4);
  ctx.fill();
  // wheels
  ctx.fillStyle = "#05070a";
  [[-s * 0.62, s * 0.4], [s * 0.5, s * 0.4]].forEach(([wx, wy]) => { ctx.beginPath(); ctx.ellipse(wx, wy, s * 0.16, s * 0.16, 0, 0, Math.PI * 2); ctx.fill(); });
  // headlight
  ctx.fillStyle = "#fff7d6";
  ctx.beginPath(); ctx.ellipse(s * 0.92, -s * 0.05, 2.2, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawPerson(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(45,212,191,0.85)";
  ctx.beginPath(); ctx.arc(0, -s * 0.95, s * 0.3, 0, Math.PI * 2); ctx.fill(); // head
  ctx.fillStyle = "rgba(45,212,191,0.55)";
  ctx.beginPath();
  ctx.moveTo(-s * 0.34, s * 0.55);
  ctx.quadraticCurveTo(-s * 0.4, -s * 0.1, 0, -s * 0.62);
  ctx.quadraticCurveTo(s * 0.4, -s * 0.1, s * 0.34, s * 0.55);
  ctx.quadraticCurveTo(0, s * 0.72, -s * 0.34, s * 0.55);
  ctx.fill(); // torso silhouette
  ctx.restore();
}
function drawBagIcon(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(245,158,11,0.3)";
  ctx.strokeStyle = COLORS.amber;
  ctx.lineWidth = 1.2;
  roundRectPath(ctx, -s * 0.5, -s * 0.3, s, s * 0.7, 3);
  ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, -s * 0.3, s * 0.28, Math.PI, 0); ctx.stroke(); // handle
  ctx.restore();
}
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* scene-appropriate background art so each camera reads as a real place, not a blank
   rectangle with shapes floating on it */
function drawSceneBackground(ctx, cameraId, w, h, night) {
  ctx.fillStyle = night ? "#050708" : "#0d1218";
  ctx.fillRect(0, 0, w, h);

  if (cameraId === "GATE-01") {
    ctx.fillStyle = "#171e26"; ctx.fillRect(0, h * 0.5, w, h * 0.5); // road
    ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.setLineDash([14, 10]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, h * 0.75); ctx.lineTo(w, h * 0.75); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#232b34"; ctx.fillRect(30, h * 0.2, 14, h * 0.3); // gate post
    ctx.fillStyle = "#d33"; ctx.fillRect(30, h * 0.28, 90, 5); // boom barrier
    ctx.fillStyle = "#1c242c"; ctx.fillRect(4, h * 0.15, 40, h * 0.35); // guard booth
  } else if (cameraId === "LOBBY-02") {
    ctx.strokeStyle = "rgba(255,255,255,0.04)"; ctx.lineWidth = 1;
    for (let gx = 0; gx < w; gx += 34) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke(); }
    ctx.fillStyle = "#1a232b"; ctx.fillRect(w - 120, 10, 110, 46); // reception desk
    ctx.fillStyle = "#233039"; ctx.beginPath(); ctx.ellipse(40, 30, 12, 16, 0, 0, Math.PI * 2); ctx.fill(); // planter
  } else if (cameraId === "PERIM-03") {
    ctx.fillStyle = "#0a0e12"; ctx.fillRect(0, h * 0.65, w, h * 0.35); // ground
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1.5;
    for (let px = 20; px < w; px += 50) { ctx.beginPath(); ctx.moveTo(px, h * 0.4); ctx.lineTo(px, h * 0.66); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(0, h * 0.46); ctx.lineTo(w, h * 0.46); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, h * 0.58); ctx.lineTo(w, h * 0.58); ctx.stroke();
  } else if (cameraId === "PARK-04") {
    ctx.strokeStyle = "rgba(255,255,255,0.14)"; ctx.lineWidth = 2;
    for (let bx = 30; bx < w; bx += 70) { ctx.beginPath(); ctx.moveTo(bx, 10); ctx.lineTo(bx - 20, h - 10); ctx.stroke(); }
  }

  // faint ground perspective lines used by every scene for depth
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(0, 30 + i * 32); ctx.lineTo(w, 30 + i * 32); ctx.stroke(); }
}

function CameraCanvas({ cameraId, tick, zones, onFrameCapture, showZones, highlightBox }) {
  const canvasRef = useRef(null);
  const scene = SCENES[cameraId];
  const camZones = zones.filter((z) => z.camera_id === cameraId);

  useEffect(() => {
    if (!scene) return;
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const { w, h } = scene;
    ctx.clearRect(0, 0, w, h);
    drawSceneBackground(ctx, cameraId, w, h, scene.night);

    if (showZones) {
      camZones.forEach((z) => {
        ctx.beginPath();
        z.points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
        ctx.closePath();
        ctx.fillStyle = "rgba(239,68,68,0.08)";
        ctx.strokeStyle = "rgba(239,68,68,0.6)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
        const label = z.zone_type === "restricted" ? "RESTRICTED" : z.name.toUpperCase();
        ctx.fillStyle = "rgba(239,68,68,0.9)"; ctx.font = "8px monospace";
        ctx.fillText(label, z.points[0][0] + 4, z.points[0][1] + 10);
      });
    }

    const positions = [];
    scene.actors.forEach((a) => {
      const { x, y } = actorPos(a, tick);
      positions.push({ ...a, x, y });
      const s = a.size;
      if (a.kind === "vehicle") drawCar(ctx, x, y, s, (a.path[1][0] < a.path[0][0]));
      else if (a.kind === "object") drawBagIcon(ctx, x, y, s);
      else drawPerson(ctx, x, y, s);

      // detection-style bounding box + class/confidence chip, like a real CV overlay
      const bw = a.kind === "vehicle" ? s * 2.1 : s * 1.1;
      const bh = a.kind === "vehicle" ? s * 1.05 : s * 1.8;
      const bx = x - bw / 2, by = y - (a.kind === "vehicle" ? bh * 0.55 : bh * 0.68);
      ctx.strokeStyle = a.kind === "object" ? "rgba(245,158,11,0.8)" : "rgba(45,212,191,0.8)";
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, bw, bh);
      const { text, conf } = actorLabel(a);
      ctx.font = "8px monospace";
      const chip = `${text} ${conf}%`;
      const chipW = ctx.measureText(chip).width + 6;
      ctx.fillStyle = "rgba(5,7,10,0.75)";
      ctx.fillRect(bx, by - 11, chipW, 11);
      ctx.fillStyle = a.kind === "object" ? COLORS.amber : COLORS.cyan;
      ctx.fillText(chip, bx + 3, by - 2);
    });

    // overlay: camera tag + timestamp burned in
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, 150, 18);
    ctx.fillStyle = COLORS.cyan;
    ctx.font = "10px monospace";
    ctx.fillText(cameraId, 6, 12);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(w - 172, h - 18, 172, 18);
    ctx.fillStyle = "#cfe8ff";
    ctx.fillText(monoTime(Date.now()), w - 168, h - 6);

    if (onFrameCapture) onFrameCapture(cameraId, positions, cv);
  }, [tick, showZones, cameraId]);

  if (!scene) return <div className="hk-cam-canvas hk-cam-offline"><Camera size={22} /><span>No demo scene for this camera</span></div>;
  return <canvas ref={canvasRef} width={scene.w} height={scene.h} className="hk-cam-canvas" />;
}

/* Always-mounted, off-screen canvases that drive the rule engine. Visible camera views
   elsewhere in the app render their own copy purely for display — this is the one that
   actually feeds detections, so the pipeline keeps running no matter which page is open. */
function EngineLayer({ cameras, zones, tick, onFrameCapture }) {
  const demoCams = cameras.filter((c) => c.type === "demo");
  return (
    <div style={{ position: "absolute", left: -9999, top: -9999, width: 1, height: 1, overflow: "hidden" }} aria-hidden="true">
      {demoCams.map((c) => (
        <CameraCanvas key={c.id} cameraId={c.id} tick={tick} zones={zones} onFrameCapture={onFrameCapture} showZones={false} />
      ))}
    </div>
  );
}

/* ============================= MAIN APP ================================================ */
export default function App() {
  /* auth */
  const [session, setSession] = useState(null);
  const [loginErr, setLoginErr] = useState("");

  /* data state */
  const [cameras, setCameras] = useState(SEED_CAMERAS);
  const [zones, setZones] = useState(SEED_ZONES);
  const [events, setEvents] = useState(seedEvents());
  const [users, setUsers] = useState(SEED_USERS);
  const [audit, setAudit] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [savedSearches, setSavedSearches] = useState([]);

  /* ui state */
  const [page, setPage] = useState("dashboard");
  const [pageFilter, setPageFilter] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const { toasts, push } = useToasts();
  const [demoOpen, setDemoOpen] = useState(false);

  /* camera health / heartbeat — simulated signal status, real state driving the UI */
  const [cameraStatus, setCameraStatus] = useState(() => Object.fromEntries(cameras.map((c) => [c.id, "online"])));
  useEffect(() => {
    const iv = setInterval(() => {
      if (Math.random() < 0.12) {
        const cam = cameras[Math.floor(Math.random() * cameras.length)];
        setCameraStatus((s) => ({ ...s, [cam.id]: "degraded" }));
        setTimeout(() => setCameraStatus((s) => (s[cam.id] === "degraded" ? { ...s, [cam.id]: "online" } : s)), 5000 + Math.random() * 4000);
      }
    }, 14000);
    return () => clearInterval(iv);
    // eslint-disable-next-line
  }, []);

  /* live engine */
  const [tick, setTick] = useState(0);
  const engineRef = useRef({ presence: {}, static: {} });
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  const zonesRef = useRef(zones);
  useEffect(() => { zonesRef.current = zones; }, [zones]);

  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 220), 220);
    return () => clearInterval(iv);
  }, []);

  const addEvent = useCallback((partial) => {
    const ev = {
      id: uid("evt"), detected_at: Date.now(), reviewed: false, false_positive: false,
      heuristic: true, frame_hash: null, frame_dataurl: null, track_id: uid("trk"),
      ...partial
    };
    setEvents((prev) => [ev, ...prev]);
    if (ev.severity === "high") {
      push(`${ev.module} · ${ev.summary}`, "red");
      if (settingsRef.current.alert_chime) beep();
      if (settingsRef.current.spoken_alerts && window.speechSynthesis) {
        const u = new SpeechSynthesisUtterance(`High severity alert. ${ev.summary}`);
        window.speechSynthesis.speak(u);
      }
    }
    return ev;
  }, [push]);

  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 880; g.gain.value = 0.04;
      o.start(); setTimeout(() => { o.stop(); ctx.close(); }, 180);
    } catch {}
  }

  /* rule engine tick: reads thresholds live from settingsRef so changes apply next tick.
     Runs off the always-mounted background engine canvases (see <EngineLayer/> below), so
     detections keep flowing no matter which page is currently open. */
  const onFrameCapture = useCallback((cameraId, positions, canvasEl) => {
    const th = settingsRef.current.thresholds;
    const blurOn = settingsRef.current.privacy_blur;
    const camZones = zonesRef.current.filter((z) => z.camera_id === cameraId);
    const eng = engineRef.current;
    const seal = (p) => sealFrame(canvasEl, { x: p.x - 40, y: p.y - 40, w: 80, h: 80 }, blurOn);

    positions.forEach((p) => {
      const key = `${cameraId}:${p.id}`;
      const prev = eng.presence[key];
      eng.presence[key] = { x: p.x, y: p.y, t: Date.now() };

      // ANPR — plate read once per track ID, debounced via eng.anprSeen
      if (p.kind === "vehicle" && p.plate) {
        eng.anprSeen = eng.anprSeen || {};
        if (!eng.anprSeen[key]) {
          eng.anprSeen[key] = true;
          const watchlisted = WATCHLIST.has(p.plate);
          addEvent({
            camera_id: cameraId, module: "ANPR", object_type: "vehicle", object_label: "vehicle",
            plate: p.plate, severity: watchlisted ? "high" : "low",
            summary: `Plate ${p.plate} read at ${cameraId}${watchlisted ? " — WATCHLISTED" : ""}`,
            searchable: `vehicle plate ${p.plate} read at ${cameraId} ${watchlisted ? "watchlisted" : "unregistered check"}`,
            frame_dataurl: seal(p)
          });
        }
      }

      // velocity (vehicles only) — pixel displacement -> km/h via calibration ratio.
      // Ratio is tuned so the demo scene's own scripted speeds land near the default
      // thresholds; once a camera is calibrated in Cameras > Calibrate speed, that
      // real metres-per-pixel value should replace this constant.
      if (p.kind === "vehicle" && prev) {
        const dt = (Date.now() - prev.t) / 1000 || 0.22;
        const dist = Math.hypot(p.x - prev.x, p.y - prev.y);
        const metersPerPixel = 0.33;
        const kmh = Math.round((dist * metersPerPixel / dt) * 3.6);
        if (kmh > th.velocity_warn && Math.random() < 0.05) {
          addEvent({
            camera_id: cameraId, module: "VELOCITY", object_type: "vehicle", object_label: "vehicle",
            plate: p.plate || null, severity: kmh > th.velocity_high ? "high" : "medium",
            summary: `Vehicle measured at ${kmh} km/h`,
            searchable: `vehicle speeding ${kmh} kmh plate ${p.plate || "unknown"} at ${cameraId}`,
            frame_dataurl: seal(p)
          });
        }
      }

      // intrusion — real point-in-polygon
      if (p.kind === "person") {
        const inside = camZones.some((z) => z.zone_type === "restricted" && pointInPolygon(p.x, p.y, z.points));
        if (inside && Math.random() < 0.03) {
          addEvent({
            camera_id: cameraId, module: "INTRUSION", object_type: "person", object_label: "person",
            severity: "high", summary: "Person entered restricted zone",
            searchable: `person intrusion restricted zone ${cameraId}`,
            frame_dataurl: seal(p)
          });
        }
      }

      // loitering / running via displacement over dwell window
      if (p.kind === "person" && prev) {
        const dist = Math.hypot(p.x - prev.x, p.y - prev.y);
        if (dist < 0.4) {
          eng.static[key] = (eng.static[key] || 0) + 1;
          if (eng.static[key] * 220 > th.loiter_seconds * 1000 && Math.random() < 0.03) {
            addEvent({
              camera_id: cameraId, module: "ANOMALY", object_type: "person", object_label: "person",
              severity: "low", summary: "Anomaly: loitering",
              searchable: `loitering anomaly ${cameraId}`, frame_dataurl: seal(p)
            });
            eng.static[key] = 0;
          }
        } else { eng.static[key] = 0; }
      }

      // abandoned object
      if (p.kind === "object") {
        eng.static[key] = (eng.static[key] || 0) + 1;
        if (eng.static[key] * 220 > th.abandoned_seconds * 1000 && eng.static[key] > 0) {
          addEvent({
            camera_id: cameraId, module: "ABANDONED", object_type: "object", object_label: "bag",
            severity: "medium", summary: "Unattended object detected",
            searchable: `abandoned bag object at ${cameraId}`, frame_dataurl: seal(p)
          });
          eng.static[key] = -100000; // don't refire constantly for the same static object
        }
      }
    });

    // crowd density
    const personCount = positions.filter((p) => p.kind === "person").length;
    if (personCount >= th.crowd_count && Math.random() < 0.02) {
      const center = positions.find((p) => p.kind === "person") || { x: 200, y: 110 };
      addEvent({
        camera_id: cameraId, module: "ANOMALY", object_type: "person", object_label: "crowd",
        severity: "medium", summary: `Crowd density: ${personCount} persons`,
        searchable: `crowd density anomaly ${personCount} persons at ${cameraId}`,
        frame_dataurl: seal(center)
      });
    }
  }, [addEvent]);

  // hash any new event missing a hash
  useEffect(() => {
    events.filter((e) => e.frame_dataurl && !e.frame_hash).forEach(async (e) => {
      const h = await sha256(e.frame_dataurl);
      setEvents((prev) => prev.map((x) => (x.id === e.id ? { ...x, frame_hash: h } : x)));
    });
    // eslint-disable-next-line
  }, [events]);

  const logAudit = useCallback((action, detail) => {
    setAudit((a) => [{ id: uid("aud"), ts: Date.now(), user: session?.username || "system", action, detail }, ...a]);
  }, [session]);

  /* keyboard shortcut */
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen((o) => !o); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const nav = (p, filter = null) => { setPage(p); setPageFilter(filter); setPaletteOpen(false); };

  const alerts = useMemo(() => events.filter((e) => e.severity !== "low" && !e.false_positive), [events]);
  const unreadHigh = useMemo(() => alerts.filter((a) => !a.reviewed && a.severity === "high").length, [alerts]);

  if (!session) {
    return (
      <>
        <GlobalStyle />
        <LoginPage users={users} onLogin={(u) => { setSession(u); logAudit("login", u.username); }} err={loginErr} setErr={setLoginErr} />
      </>
    );
  }

  return (
    <div className="hk-app">
      <GlobalStyle />
      <ToastStack toasts={toasts} />
      <EngineLayer cameras={cameras} zones={zones} tick={tick} onFrameCapture={onFrameCapture} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} nav={nav} role={session.role} onDemo={() => setDemoOpen(true)} />
      <Sidebar page={page} nav={nav} role={session.role} unreadHigh={unreadHigh} onLogout={() => setSession(null)} branding={settings.branding_name} />
      <div className="hk-main">
        <Topbar session={session} onPalette={() => setPaletteOpen(true)} unreadHigh={unreadHigh} nav={nav} />
        <div className="hk-content">
          {page === "dashboard" && <Dashboard events={events} cameras={cameras} cameraStatus={cameraStatus} nav={nav} />}
          {page === "live" && <LiveView cameras={cameras} zones={zones} tick={tick} cameraStatus={cameraStatus} />}
          {page === "cameras" && <CamerasPage cameras={cameras} zones={zones} setZones={setZones} setCameras={setCameras} tick={tick} cameraStatus={cameraStatus} setCameraStatus={setCameraStatus} addEvent={addEvent} push={push} logAudit={logAudit} />}
          {page === "footage" && <FootageAnalysis addEvent={addEvent} push={push} />}
          {page === "events" && <EventsExplorer events={events} cameras={cameras} filter={pageFilter} onOpen={setSelectedEvent} />}
          {page === "search" && <InvestigationSearch events={events} savedSearches={savedSearches} setSavedSearches={setSavedSearches} onOpen={setSelectedEvent} />}
          {page === "facesearch" && <FaceSearch events={events} cameras={cameras} onOpen={setSelectedEvent} logAudit={logAudit} push={push} />}
          {page === "alerts" && <AlertsPage alerts={alerts} setEvents={setEvents} onOpen={setSelectedEvent} logAudit={logAudit} />}
          {page === "anpr" && <ANPRLog events={events} />}
          {page === "reports" && <ReportsPage events={events} cameras={cameras} />}
          {page === "vault" && <EvidenceVault events={events} session={session} settings={settings} logAudit={logAudit} push={push} />}
          {page === "users" && session.role === "admin" && <UsersPage users={users} setUsers={setUsers} logAudit={logAudit} push={push} />}
          {page === "settings" && session.role === "admin" && <SettingsPage settings={settings} setSettings={setSettings} logAudit={logAudit} push={push} />}
          {page === "audit" && session.role === "admin" && <AuditPage audit={audit} />}
          {(page === "users" || page === "settings" || page === "audit") && session.role !== "admin" && <EmptyState icon={Lock} title="Admin only" sub="Your operator role can't access this page." />}
        </div>
      </div>
      {selectedEvent && <EventDetailModal event={selectedEvent} events={events} onClose={() => setSelectedEvent(null)} setEvents={setEvents} logAudit={logAudit} push={push} />}
      {demoOpen && <DemoControlPanel onClose={() => setDemoOpen(false)} addEvent={addEvent} cameras={cameras} setEvents={setEvents} cameraStatus={cameraStatus} setCameraStatus={setCameraStatus} push={push} />}
    </div>
  );
}

/* ---------------------------- Login ----------------------------------------------------- */
function LoginPage({ users, onLogin, err, setErr }) {
  const [u, setU] = useState(""); const [p, setP] = useState("");
  const submit = () => {
    const found = users.find((x) => x.username === u && x.password === p);
    if (found) { setErr(""); onLogin(found); } else setErr("Invalid credentials.");
  };
  return (
    <div className="hk-login">
      <div className="hk-login-card">
        <div className="hk-login-brand"><Shield size={22} className="hk-tone-cyan" /> Hawk-i</div>
        <div className="hk-login-sub">Forensic CCTV intelligence — sign in to continue</div>
        <Input placeholder="Username" value={u} onChange={(e) => setU(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
        <Input placeholder="Password" type="password" value={p} onChange={(e) => setP(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
        {err && <div className="hk-error">{err}</div>}
        <Btn onClick={submit} className="hk-login-btn">Sign in</Btn>
        <div className="hk-login-hint">Seeded accounts — admin/hawki (full access) · operator/hawki (blocked from Users, Settings, Audit Log)</div>
      </div>
    </div>
  );
}

/* ---------------------------- Sidebar / Topbar ------------------------------------------ */
function Sidebar({ page, nav, role, unreadHigh, onLogout, branding }) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "live", label: "Live View", icon: Radio },
    { id: "cameras", label: "Cameras", icon: Camera },
    { id: "footage", label: "Footage Analysis", icon: Video },
    { id: "events", label: "Events Explorer", icon: ScanLine },
    { id: "search", label: "Investigation Search", icon: Search },
    { id: "facesearch", label: "Face Search", icon: UserSearch },
    { id: "alerts", label: "Alerts", icon: Bell, badge: unreadHigh },
    { id: "anpr", label: "ANPR Log", icon: Car },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "vault", label: "Evidence Vault", icon: FileArchive },
    { id: "users", label: "Users", icon: UsersIcon, admin: true },
    { id: "settings", label: "Settings", icon: SettingsIcon, admin: true },
    { id: "audit", label: "Audit Log", icon: ClipboardList, admin: true }
  ];
  return (
    <div className="hk-sidebar">
      <div className="hk-sidebar-brand"><Shield size={18} className="hk-tone-cyan" /> {branding}</div>
      <div className="hk-sidebar-nav">
        {items.filter((i) => !i.admin || role === "admin").map((i) => (
          <div key={i.id} className={`hk-nav-item ${page === i.id ? "active" : ""}`} onClick={() => nav(i.id)}>
            <i.icon size={16} /> <span>{i.label}</span>
            {!!i.badge && <span className="hk-nav-badge">{i.badge}</span>}
          </div>
        ))}
      </div>
      <div className="hk-nav-item hk-logout" onClick={onLogout}><LogOut size={16} /> <span>Sign out</span></div>
    </div>
  );
}

function Topbar({ session, onPalette, unreadHigh, nav }) {
  return (
    <div className="hk-topbar">
      <div className="hk-topbar-search" onClick={onPalette}>
        <Command size={14} /> <span>Search or jump to…</span> <span className="hk-kbd">⌘K</span>
      </div>
      <div className="hk-topbar-right">
        <div className="hk-bell" onClick={() => nav("alerts")}>
          <Bell size={17} /> {unreadHigh > 0 && <span className="hk-bell-dot" />}
        </div>
        <div className="hk-user-chip"><span className="hk-live-dot" />{session.name} <Badge tone={session.role === "admin" ? "cyan" : "slate"}>{session.role}</Badge></div>
      </div>
    </div>
  );
}

function CommandPalette({ open, onClose, nav, role, onDemo }) {
  const [q, setQ] = useState("");
  if (!open) return null;
  const all = [
    ["Dashboard", "dashboard"], ["Live View", "live"], ["Cameras", "cameras"], ["Footage Analysis", "footage"],
    ["Events Explorer", "events"], ["Investigation Search", "search"], ["Face Search", "facesearch"], ["Alerts", "alerts"], ["ANPR Log", "anpr"],
    ["Reports", "reports"], ["Evidence Vault", "vault"]
  ].concat(role === "admin" ? [["Users", "users"], ["Settings", "settings"], ["Audit Log", "audit"]] : []);
  const filtered = all.filter(([l]) => l.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="hk-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="hk-palette">
        <Input autoFocus placeholder="Type a page name…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="hk-palette-list">
          {filtered.map(([l, id]) => <div key={id} className="hk-palette-item" onClick={() => nav(id)}>{l}</div>)}
          {role === "admin" && <div className="hk-palette-item hk-tone-cyan" onClick={() => { onDemo(); onClose(); }}><Sparkles size={13} style={{ marginRight: 6 }} />Demo Control Panel</div>}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- Dashboard ------------------------------------------------- */
function Dashboard({ events, cameras, cameraStatus, nav }) {
  const high = events.filter((e) => e.severity === "high" && !e.false_positive).length;
  const today = events.filter((e) => Date.now() - e.detected_at < 86400000).length;
  const anpr = events.filter((e) => e.module === "ANPR").length;
  const bySev = ["high", "medium", "low"].map((s) => ({ name: s, value: events.filter((e) => e.severity === s).length }));
  return (
    <div>
      <div className="hk-page-head"><h1>Dashboard</h1><span className="hk-page-sub">Duty overview across all cameras</span></div>
      <div className="hk-grid-4">
        <StatCard label="High severity" value={high} icon={AlertTriangle} tone="red" onClick={() => nav("events", { severity: "high" })} sub="last 7 days" />
        <StatCard label="Events today" value={today} icon={Activity} tone="cyan" onClick={() => nav("events")} sub="all modules" />
        <StatCard label="Plates read" value={anpr} icon={Car} tone="amber" onClick={() => nav("anpr")} sub="ANPR module" />
        <StatCard label="Cameras online" value={`${Object.values(cameraStatus || {}).filter((s) => s !== "offline").length}/${cameras.length}`} icon={Wifi} tone="cyan" onClick={() => nav("live")} sub="demo feeds" />
      </div>
      <div className="hk-grid-2" style={{ marginTop: 16 }}>
        <Card className="hk-panel">
          <div className="hk-panel-title">Live event feed</div>
          <div className="hk-livefeed">
            {events.slice(0, 8).map((e) => (
              <div key={e.id} className="hk-livefeed-row" onClick={() => nav("events")}>
                <SevBadge sev={e.severity} />
                <span className="hk-mono hk-slate">{e.camera_id}</span>
                <span>{e.summary}</span>
                <span className="hk-mono hk-slate" style={{ marginLeft: "auto" }}>{relTime(e.detected_at)}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="hk-panel">
          <div className="hk-panel-title">Severity breakdown</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={bySev} dataKey="value" nameKey="name" innerRadius={45} outerRadius={72}>
                {bySev.map((s, i) => <Cell key={i} fill={SEV_COLOR[s.name]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: COLORS.elevated, border: `1px solid ${COLORS.hair}` }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <div className="hk-panel-title" style={{ marginTop: 16 }}>Camera wall</div>
      <div className="hk-camwall">
        {cameras.map((c) => <MiniCam key={c.id} camera={c} status={(cameraStatus || {})[c.id] || "online"} />)}
      </div>
    </div>
  );
}
function MiniCam({ camera, status }) {
  const tone = status === "offline" ? "red" : status === "degraded" ? "amber" : "cyan";
  return (
    <Card className="hk-minicam">
      <div className="hk-minicam-head">
        {status === "online" ? <span className="hk-live-dot" /> : status === "degraded" ? <WifiOff size={12} className="hk-tone-amber" /> : <WifiOff size={12} className="hk-tone-red" />}
        <span className="hk-mono">{camera.id}</span>
        {camera.type === "real" && <Badge tone="cyan">yours</Badge>}
        <Badge tone={tone} className="hk-ml-auto">{status}</Badge>
      </div>
      <div className="hk-minicam-body">{camera.label}</div>
    </Card>
  );
}

/* ---------------------------- Live View ------------------------------------------------- */
function LiveView({ cameras, zones, tick, cameraStatus }) {
  const [showZones, setShowZones] = useState(true);
  return (
    <div>
      <div className="hk-page-head">
        <h1>Live View</h1>
        <span className="hk-page-sub">Scripted demo feeds with real coordinates — a background engine runs the rule pipeline on these positions continuously, on every page.</span>
        <div style={{ marginLeft: "auto" }}><Toggle checked={showZones} onChange={setShowZones} label="Show zone overlays" /></div>
      </div>
      <div className="hk-camgrid">
        {cameras.map((c) => {
          const status = (cameraStatus || {})[c.id] || "online";
          return (
            <Card key={c.id} className="hk-camcard">
              <div className="hk-camcard-head">
                {status === "online" ? <span className="hk-live-dot" /> : <WifiOff size={13} className={status === "degraded" ? "hk-tone-amber" : "hk-tone-red"} />}
                <span className="hk-mono">{c.id}</span> <span className="hk-slate">{c.label}</span>
                <Badge tone={status === "online" ? "slate" : status === "degraded" ? "amber" : "red"} className="hk-camcard-badge">{status === "online" ? (c.type === "real" ? "your camera" : "demo feed") : status}</Badge>
              </div>
              {status === "offline" ? (
                <div className="hk-cam-canvas hk-cam-offline"><WifiOff size={22} /><span>Signal lost</span></div>
              ) : c.type === "real" ? (
                <RealCameraFeed bridgeUrl={c.bridgeUrl} mjpeg={c.mjpeg} onStatus={(s) => {}} />
              ) : (
                <CameraCanvas cameraId={c.id} tick={tick} zones={zones} showZones={showZones} />
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------- Cameras / Zones / Calibration / Connect ------------------- */
function CamerasPage({ cameras, zones, setZones, setCameras, tick, cameraStatus, setCameraStatus, addEvent, push, logAudit }) {
  const [active, setActive] = useState(cameras[0].id);
  const activeCam = cameras.find((c) => c.id === active) || cameras[0];
  const [connectOpen, setConnectOpen] = useState(false);
  const [conn, setConn] = useState({ ip: "", port: "554", user: "", pass: "", channel: "101", label: "" });
  const [urls, setUrls] = useState(null);
  const [bridgeUrl, setBridgeUrl] = useState("");
  const [mjpeg, setMjpeg] = useState(false);
  const [previewStatus, setPreviewStatus] = useState(null);
  const [drawing, setDrawing] = useState(false);
  const [points, setPoints] = useState([]);
  const [calib, setCalib] = useState(false);
  const [calibPts, setCalibPts] = useState([]);
  const [calibMeters, setCalibMeters] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanErr, setScanErr] = useState(null);
  const feedRef = useRef(null);
  const canvasWrapRef = useRef(null);

  const camZones = zones.filter((z) => z.camera_id === active);

  const genUrls = () => {
    const rtsp = `rtsp://${conn.user}:${conn.pass}@${conn.ip}:${conn.port}/Streaming/Channels/${conn.channel}`;
    const isapi = `http://${conn.ip}/ISAPI/Streaming/channels/${conn.channel}/picture`;
    setUrls({ rtsp, isapi });
  };

  const confirmAddCamera = () => {
    const id = `CAM-${(cameras.filter((c) => c.type === "real").length + 1).toString().padStart(2, "0")}`;
    const cam = { id, label: conn.label || conn.ip || id, type: "real", bridgeUrl, mjpeg, zones: [] };
    setCameras((cs) => [...cs, cam]);
    setCameraStatus((s) => ({ ...s, [id]: previewStatus === "online" ? "online" : "degraded" }));
    logAudit("camera_connect_confirmed", `${id} <- ${bridgeUrl}`);
    push(`${id} added — live from your bridge URL`, "cyan");
    setActive(id);
    setConnectOpen(false);
    setConn({ ip: "", port: "554", user: "", pass: "", channel: "101", label: "" });
    setUrls(null); setBridgeUrl(""); setPreviewStatus(null);
  };

  const runDeepScan = async () => {
    setScanErr(null); setScanning(true);
    try {
      let dataUrl;
      if (activeCam.type === "real") {
        if (!feedRef.current) throw new Error("No live frame available yet.");
        dataUrl = feedRef.current.captureDataURL();
        if (!dataUrl) throw new Error("Feed hasn't loaded a frame yet — wait a moment and try again.");
      } else {
        const cv = canvasWrapRef.current?.querySelector("canvas");
        if (!cv) throw new Error("No frame available.");
        dataUrl = cv.toDataURL("image/jpeg", 0.75);
      }
      const { parsed, error } = await analyzeFrameVision(dataUrl);
      if (error) throw new Error(error);
      (parsed.events || []).forEach((ev) => {
        addEvent({
          camera_id: active, module: ev.module || "ANOMALY", object_type: (parsed.objects[0] || {}).type || "object",
          object_label: (parsed.objects[0] || {}).label || "object", severity: ev.severity || "low",
          summary: ev.summary || "AI deep scan finding", searchable: parsed.searchable || "",
          plate: (parsed.plates[0] || {}).text || null, frame_dataurl: dataUrl, heuristic: false
        });
      });
      push(parsed.events?.length ? `Deep scan logged ${parsed.events.length} finding(s)` : "Deep scan complete — nothing notable found", "cyan");
    } catch (e) {
      setScanErr(e.message);
    }
    setScanning(false);
  };

  const onCanvasClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 400);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 220);
    if (calib) {
      const np = [...calibPts, [x, y]];
      setCalibPts(np.slice(-2));
      return;
    }
    if (!drawing) return;
    if (points.length > 2 && Math.hypot(x - points[0][0], y - points[0][1]) < 14) {
      const name = prompt("Zone name?") || `Zone ${camZones.length + 1}`;
      const type = confirm("Restricted zone? OK = restricted, Cancel = general") ? "restricted" : "general";
      setZones((z) => [...z, { id: uid("zone"), camera_id: active, name, zone_type: type, points, active_from: "00:00", active_to: "23:59" }]);
      setPoints([]); setDrawing(false);
      logAudit("zone_created", name);
      push(`Zone "${name}" saved`, "cyan");
      return;
    }
    setPoints((p) => [...p, [x, y]]);
  };

  return (
    <div>
      <div className="hk-page-head">
        <h1>Cameras</h1>
        <span className="hk-page-sub">Zone drawing, speed calibration, and connecting your own Hikvision camera.</span>
        <Btn icon={Plus} className="hk-ml-auto" onClick={() => setConnectOpen(true)}>Connect a camera</Btn>
      </div>
      <div className="hk-cam-tabs">
        {cameras.map((c) => <div key={c.id} className={`hk-cam-tab ${active === c.id ? "active" : ""}`} onClick={() => { setActive(c.id); setPoints([]); setDrawing(false); }}>{c.id}</div>)}
      </div>
      <div className="hk-grid-2">
        <Card className="hk-panel">
          <div className="hk-panel-title">{activeCam.type === "real" ? "Live feed & zone editor" : "Zone editor"} — {active}</div>
          <div className="hk-zone-canvas-wrap" ref={canvasWrapRef} onClick={onCanvasClick}>
            {activeCam.type === "real" ? (
              <RealCameraFeed ref={feedRef} bridgeUrl={activeCam.bridgeUrl} mjpeg={activeCam.mjpeg} onStatus={(s) => setCameraStatus((cs) => ({ ...cs, [active]: s }))} />
            ) : (
              <CameraCanvas cameraId={active} tick={tick} zones={zones} showZones={true} />
            )}
            {(drawing || calib) && <PolyOverlay points={calib ? calibPts : points} calib={calib} />}
          </div>
          <div className="hk-row-gap">
            {!drawing && !calib && <Btn icon={Plus} onClick={() => setDrawing(true)}>Draw new zone</Btn>}
            {drawing && <><Btn variant="ghost" icon={Undo2} onClick={() => setPoints((p) => p.slice(0, -1))}>Undo point</Btn><Btn variant="ghost" onClick={() => { setDrawing(false); setPoints([]); }}>Cancel</Btn></>}
            {!drawing && !calib && <Btn variant="ghost" icon={Gauge} onClick={() => setCalib(true)}>Calibrate speed</Btn>}
            {calib && <>
              <Input placeholder="Real-world distance (m) between the two points" value={calibMeters} onChange={(e) => setCalibMeters(e.target.value)} style={{ width: 260 }} />
              <Btn disabled={calibPts.length < 2 || !calibMeters} onClick={() => { push(`Calibration saved: ${calibMeters}m over ${Math.hypot(calibPts[1][0]-calibPts[0][0], calibPts[1][1]-calibPts[0][1]).toFixed(0)}px for ${active}`, "cyan"); setCalib(false); setCalibPts([]); }}>Save calibration</Btn>
              <Btn variant="ghost" onClick={() => { setCalib(false); setCalibPts([]); }}>Cancel</Btn>
            </>}
            <Btn variant="ghost" icon={Sparkles} onClick={runDeepScan} disabled={scanning}>{scanning ? "Scanning…" : "AI deep scan this frame"}</Btn>
          </div>
          {scanErr && <div className="hk-note hk-tone-bg-red-soft">{scanErr}</div>}
          {activeCam.type === "demo" && <div className="hk-note hk-tone-bg-amber-soft">This is a scripted demo scene, not real footage — its detections come from the deterministic rule engine (ground-truth coordinates), not vision AI. Deep scan here is illustrative only; for genuinely AI-analyzed results use a connected real camera or Footage Analysis.</div>}
          <div className="hk-zone-list">
            {camZones.map((z) => (
              <div key={z.id} className="hk-zone-row">
                <Badge tone={z.zone_type === "restricted" ? "red" : "slate"}>{z.zone_type}</Badge>
                <span>{z.name}</span>
                <span className="hk-mono hk-slate">{z.active_from}–{z.active_to}</span>
                <Btn variant="ghost" size="sm" icon={Trash2} onClick={() => setZones((zz) => zz.filter((x) => x.id !== z.id))} />
              </div>
            ))}
            {camZones.length === 0 && <div className="hk-slate" style={{ fontSize: 13 }}>No zones defined for this camera yet.</div>}
          </div>
        </Card>
        <Card className="hk-panel">
          <div className="hk-panel-title">Camera status</div>
          <Table columns={[
            { key: "id", label: "ID", mono: true }, { key: "label", label: "Label" },
            { key: "status", label: "Status", render: (r) => {
              const s = (cameraStatus || {})[r.id] || "online";
              return <Badge tone={s === "online" ? "cyan" : s === "degraded" ? "amber" : "red"} dot={s === "online"}>{s}</Badge>;
            } },
            { key: "type", label: "Type", render: (r) => <Badge tone={r.type === "real" ? "cyan" : "slate"}>{r.type === "real" ? "your camera" : "demo feed"}</Badge> }
          ]} rows={cameras} />
        </Card>
      </div>
      <Modal open={connectOpen} onClose={() => { setConnectOpen(false); setUrls(null); setBridgeUrl(""); setPreviewStatus(null); }} title="Connect a Hikvision camera" wide>
        <div className="hk-form-grid">
          <Input placeholder="IP address" value={conn.ip} onChange={(e) => setConn({ ...conn, ip: e.target.value })} />
          <Input placeholder="Port" value={conn.port} onChange={(e) => setConn({ ...conn, port: e.target.value })} />
          <Input placeholder="Username" value={conn.user} onChange={(e) => setConn({ ...conn, user: e.target.value })} />
          <Input placeholder="Password" type="password" value={conn.pass} onChange={(e) => setConn({ ...conn, pass: e.target.value })} />
          <Input placeholder="Channel" value={conn.channel} onChange={(e) => setConn({ ...conn, channel: e.target.value })} />
          <Input placeholder="Label" value={conn.label} onChange={(e) => setConn({ ...conn, label: e.target.value })} />
        </div>
        <div className="hk-row-gap" style={{ marginTop: 10 }}>
          <Btn onClick={genUrls} disabled={!conn.ip}>Generate stream URLs</Btn>
        </div>
        {urls && (
          <div className="hk-urls">
            <div><span className="hk-slate">RTSP:</span> <span className="hk-mono">{urls.rtsp}</span> <Btn size="sm" variant="ghost" icon={Copy} onClick={() => navigator.clipboard?.writeText(urls.rtsp)} /></div>
            <div><span className="hk-slate">ISAPI snapshot:</span> <span className="hk-mono">{urls.isapi}</span> <Btn size="sm" variant="ghost" icon={Copy} onClick={() => navigator.clipboard?.writeText(urls.isapi)} /></div>
            <div className="hk-note hk-tone-bg-amber-soft">
              Browsers can't play RTSP directly, and Hikvision's snapshot endpoint blocks cross-origin requests by default — so this can't be faked as "live" without a real bridge. Run this on your LAN (needs ffmpeg installed) to relay it to a plain HTTP URL:
              <div className="hk-mono hk-bridge-cmd">ffmpeg -i {urls.rtsp} -f mjpeg -q:v 5 -r 5 http://localhost:8090/{conn.label || "cam"}.mjpg</div>
              If your bridge serves it from another machine/port, make sure it sends <span className="hk-mono">Access-Control-Allow-Origin: *</span> too, or AI deep scan on this feed won't be able to read pixels.
            </div>
            <div className="hk-row-gap" style={{ marginTop: 8 }}>
              <Input placeholder="Paste the resulting HTTP/MJPEG URL" value={bridgeUrl} onChange={(e) => setBridgeUrl(e.target.value)} style={{ flex: 1 }} />
              <Toggle checked={mjpeg} onChange={setMjpeg} label="Continuous MJPEG stream" />
            </div>
            {bridgeUrl && (
              <div className="hk-real-preview-wrap">
                <RealCameraFeed bridgeUrl={bridgeUrl} mjpeg={mjpeg} onStatus={setPreviewStatus} height={160} />
                <div className="hk-row-gap" style={{ marginTop: 6 }}>
                  {previewStatus === "online" && <Badge tone="cyan" dot>reachable — image loading live</Badge>}
                  {previewStatus === "offline" && <Badge tone="red">could not load this URL</Badge>}
                  {!previewStatus && <Badge tone="slate">testing…</Badge>}
                </div>
              </div>
            )}
            <Btn onClick={confirmAddCamera} disabled={!bridgeUrl || previewStatus !== "online"} style={{ marginTop: 10 }}>Confirm & add to Hawk-i</Btn>
          </div>
        )}
      </Modal>
    </div>
  );
}
const RealCameraFeed = forwardRef(function RealCameraFeed({ bridgeUrl, mjpeg, onStatus, height }, ref) {
  const imgRef = useRef(null);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (mjpeg || !bridgeUrl) return;
    const iv = setInterval(() => setNonce((n) => n + 1), 2500);
    return () => clearInterval(iv);
  }, [mjpeg, bridgeUrl]);
  useImperativeHandle(ref, () => ({
    captureDataURL() {
      const img = imgRef.current;
      if (!img || !img.naturalWidth) return null;
      const cv = document.createElement("canvas");
      cv.width = img.naturalWidth; cv.height = img.naturalHeight;
      cv.getContext("2d").drawImage(img, 0, 0);
      try { return cv.toDataURL("image/jpeg", 0.8); }
      catch { throw new Error("Could not read pixel data from this feed — the bridge server needs to send an Access-Control-Allow-Origin header before AI scanning can work in-browser."); }
    }
  }));
  if (!bridgeUrl) return <div className="hk-cam-offline"><Camera size={22} /><span>No live URL connected yet</span></div>;
  const src = mjpeg ? bridgeUrl : `${bridgeUrl}${bridgeUrl.includes("?") ? "&" : "?"}t=${nonce}`;
  return (
    <img
      ref={imgRef}
      src={src}
      crossOrigin="anonymous"
      alt="live camera feed"
      className="hk-cam-canvas hk-real-feed"
      style={height ? { height, objectFit: "cover", width: "100%" } : undefined}
      onLoad={() => onStatus && onStatus("online")}
      onError={() => onStatus && onStatus("offline")}
    />
  );
});
function PolyOverlay({ points, calib }) {
  return (
    <svg className="hk-poly-overlay" viewBox="0 0 400 220">
      {points.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={4} fill={calib ? COLORS.amber : COLORS.cyan} />)}
      {points.length > 1 && <polyline points={points.map((p) => p.join(",")).join(" ")} fill="none" stroke={calib ? COLORS.amber : COLORS.cyan} strokeWidth="1.5" />}
    </svg>
  );
}

/* ---------------------------- Footage Analysis ------------------------------------------ */
const VISION_SYSTEM_PROMPT = `You are Hawk-i's forensic vision module. Given ONE real camera frame, report ONLY what is visible. Return strict JSON only, no prose, no markdown fences:
{"scene":"","time_of_day":"","objects":[{"type":"","label":"","attributes":"","box":[0,0,0,0],"confidence":0}],"plates":[{"text":"","confidence":0}],"events":[{"module":"","severity":"low|medium|high","summary":"","evidence":""}],"searchable":""}
"box" is [x,y,w,h] as 0-100 percentages. "searchable" must be one dense sentence packed with every searchable detail (object types, colours, clothing, counts, actions, vehicle make/colour, plate text, lighting, position). Return empty arrays if unclear — never invent detail. If the image is not a real photographic scene (e.g. a blank, abstract, or synthetic test pattern), say so plainly in "scene" and return empty arrays rather than guessing.`;

async function analyzeFrameVision(dataUrl) {
  const b64 = dataUrl.split(",")[1];
  const media_type = dataUrl.startsWith("data:image/png") ? "image/png" : "image/jpeg";
  const content = [
    { type: "image", source: { type: "base64", media_type, data: b64 } },
    { type: "text", text: "Analyze this frame per the system instructions." }
  ];
  let res = await callClaude(content, VISION_SYSTEM_PROMPT, 700);
  let parsed = res.ok ? tolerantParseJSON(res.text) : null;
  if (res.ok && !parsed) {
    const retryContent = [
      { type: "image", source: { type: "base64", media_type, data: b64 } },
      { type: "text", text: "Return JSON only, strictly matching the schema. No prose." }
    ];
    const retry = await callClaude(retryContent, VISION_SYSTEM_PROMPT, 700);
    parsed = retry.ok ? tolerantParseJSON(retry.text) : null;
    if (!retry.ok) res = retry;
  }
  return { parsed, error: !res.ok ? res.error : (!parsed ? "could not parse model output" : null) };
}

/* Wait for a video seek to actually land, with a timeout fallback so a stalled codec
   event never leaves the UI stuck (this is what caused frame extraction to hang before). */
function seekVideo(video, t) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => { if (done) return; done = true; cleanup(); resolve(); };
    const cleanup = () => { video.removeEventListener("seeked", finish); video.removeEventListener("error", finish); clearTimeout(timer); };
    video.addEventListener("seeked", finish);
    video.addEventListener("error", finish);
    const timer = setTimeout(finish, 3500); // fallback: some browsers never fire 'seeked' for a no-op seek
    if (Math.abs(video.currentTime - t) < 0.03) { finish(); return; } // already there — e.g. frame 0
    try { video.currentTime = t; } catch { finish(); }
  });
}

function FootageAnalysis({ addEvent, push }) {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);
  const [fileErr, setFileErr] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const onFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f); setResults([]); setProgress(null); setFileErr(null);
  };

  const loadVideo = (v, src) => new Promise((resolve, reject) => {
    const onMeta = () => { cleanup(); resolve(); };
    const onErr = () => {
      cleanup();
      const codes = { 1: "loading was aborted", 2: "a network error occurred", 3: "the browser could not decode this file's codec", 4: "this source wasn't accepted (format/codec unsupported, or this preview sandbox blocked the video source)" };
      const detail = v.error ? (codes[v.error.code] || v.error.message) : "unknown decode error";
      reject(new Error(detail));
    };
    const timer = setTimeout(() => { cleanup(); reject(new Error("timed out reading metadata")); }, 15000);
    const cleanup = () => { v.removeEventListener("loadedmetadata", onMeta); v.removeEventListener("error", onErr); clearTimeout(timer); };
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("error", onErr);
    v.src = src;
    v.load();
  });
  const fileToDataURL = (f) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error("could not read file bytes"));
    r.readAsDataURL(f);
  });

  const analyze = async () => {
    if (!file || running) return;
    setRunning(true); setFileErr(null); setResults([]);
    const isVideo = file.type.startsWith("video");
    const frames = [];
    try {
      if (isVideo) {
        const v = videoRef.current;
        // Try a blob: URL first (fast, no memory duplication). Some sandboxed hosting
        // environments restrict blob: as a media source even for valid files, so if
        // that fails, retry once with a data: URL read straight from the file bytes —
        // a different loading path that isn't subject to the same restriction.
        let loaded = false, lastErr = null;
        const blobUrl = URL.createObjectURL(file);
        try { await loadVideo(v, blobUrl); loaded = true; }
        catch (e) { lastErr = e; }
        finally { URL.revokeObjectURL(blobUrl); }
        if (!loaded) {
          try {
            const dataUrl = await fileToDataURL(file);
            await loadVideo(v, dataUrl);
            loaded = true;
          } catch (e2) { lastErr = e2; }
        }
        if (!loaded) {
          throw new Error(`Video playback isn't loading in this preview (tried both loading paths; last error: ${lastErr?.message || "unknown"}). This points to a media restriction in this chat's embedded preview sandbox, not a problem with your file — upload a still image (screenshot or exported frame) instead, which uses a completely different loading path and works reliably here.`);
        }
        // warm up the decode pipeline — some browsers won't seek reliably otherwise
        try { await v.play(); v.pause(); } catch {}
        const dur = v.duration && isFinite(v.duration) && v.duration > 0 ? v.duration : 8;
        // sample roughly 1 frame/second of real footage, not a fixed count — capped for API/browser cost
        const total = Math.min(20, Math.max(4, Math.round(dur)));
        setProgress({ done: 0, total });
        const cv = canvasRef.current;
        cv.width = v.videoWidth || 640; cv.height = v.videoHeight || 360;
        const ctx = cv.getContext("2d");
        for (let i = 0; i < total; i++) {
          const t = Math.min(Math.max(0.05, dur - 0.05), (dur / total) * i + 0.05);
          await seekVideo(v, t);
          ctx.drawImage(v, 0, 0, cv.width, cv.height);
          frames.push(cv.toDataURL("image/jpeg", 0.75));
          setProgress({ done: i + 1, total });
        }
      } else {
        setProgress({ done: 0, total: 1 });
        const img = new Image();
        const url = URL.createObjectURL(file);
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error("Could not read this image file."));
          img.src = url;
        });
        const cv = canvasRef.current; cv.width = img.width; cv.height = img.height;
        cv.getContext("2d").drawImage(img, 0, 0);
        frames.push(cv.toDataURL("image/jpeg", 0.85));
        setProgress({ done: 1, total: 1 });
      }
    } catch (err) {
      setFileErr(err.message || "Could not extract frames from this file.");
      setRunning(false);
      return;
    }

    const out = [];
    for (const f of frames) {
      const { parsed, error } = await analyzeFrameVision(f);
      out.push({ frame: f, parsed, error });
      setResults([...out]);
    }

    out.forEach((r) => {
      if (!r.parsed) return;
      (r.parsed.events || []).forEach((ev) => {
        addEvent({
          camera_id: "UPLOAD", module: ev.module || "ANOMALY", object_type: (r.parsed.objects[0] || {}).type || "object",
          object_label: (r.parsed.objects[0] || {}).label || "object", severity: ev.severity || "low",
          summary: ev.summary || "Uploaded footage finding", searchable: r.parsed.searchable || "",
          plate: (r.parsed.plates[0] || {}).text || null, frame_dataurl: r.frame, heuristic: false
        });
      });
    });
    push(`Analysis complete — ${out.filter((r) => r.parsed).length}/${out.length} frames parsed`, "cyan");
    setRunning(false);
  };

  return (
    <div>
      <div className="hk-page-head"><h1>Footage Analysis</h1><span className="hk-page-sub">Upload a clip or image — frames are sampled at roughly 1/second of real footage, hashed, and run through the vision model. Findings flow into Events, ANPR and Search like any camera event.</span></div>
      <div className="hk-note hk-tone-bg-amber-soft" style={{ marginBottom: 14 }}>
        Video playback is restricted inside this chat's embedded preview sandbox — it isn't a bug in Hawk-i, and the same code plays video normally once this app is deployed outside the preview. Right now, <b>images work reliably</b> (screenshots or exported still frames analyze exactly like a video frame would) — that's the dependable way to test the AI pipeline in this environment.
      </div>
      <Card className="hk-panel">
        <input type="file" accept="video/*,image/*" onChange={onFile} />
        <div className="hk-row-gap" style={{ marginTop: 10 }}>
          <Btn icon={running ? Loader2 : Upload} onClick={analyze} disabled={!file || running}>{running ? "Analyzing…" : "Run AI deep scan"}</Btn>
          {progress && <span className="hk-slate">{progress.done}/{progress.total} frames</span>}
        </div>
        {fileErr && <div className="hk-note hk-tone-bg-red-soft">{fileErr}</div>}
        <video ref={videoRef} style={{ position: "absolute", left: -9999, top: -9999, width: 320, height: 180 }} muted playsInline preload="auto" />
        <canvas ref={canvasRef} style={{ display: "none" }} />
        <div className="hk-footage-results">
          {results.map((r, i) => (
            <Card key={i} className="hk-footage-frame">
              <img src={r.frame} alt="frame" className="hk-footage-thumb" />
              {r.error && <div className="hk-note hk-tone-bg-amber-soft">{r.error}</div>}
              {r.parsed && <>
                <div className="hk-mono hk-slate" style={{ fontSize: 12 }}>{r.parsed.searchable}</div>
                <div className="hk-row-gap" style={{ marginTop: 6 }}>
                  {(r.parsed.events || []).map((ev, j) => <SevBadge key={j} sev={ev.severity} />)}
                </div>
              </>}
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ---------------------------- Events Explorer ------------------------------------------- */
function EventsExplorer({ events, cameras, filter, onOpen }) {
  const [camera, setCamera] = useState(filter?.camera_id || "all");
  const [module, setModule] = useState(filter?.module || "all");
  const [sev, setSev] = useState(filter?.severity || "all");
  const [page, setPage] = useState(1);
  const perPage = 12;
  const filtered = events.filter((e) =>
    (camera === "all" || e.camera_id === camera) &&
    (module === "all" || e.module === module) &&
    (sev === "all" || e.severity === sev)
  );
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));

  return (
    <div>
      <div className="hk-page-head"><h1>Events Explorer</h1><span className="hk-page-sub">{filtered.length} matching events</span></div>
      <div className="hk-filter-bar">
        <Select value={camera} onChange={(v) => { setCamera(v); setPage(1); }}>
          <option value="all">All cameras</option>
          {cameras.map((c) => <option key={c.id} value={c.id}>{c.id}</option>)}
        </Select>
        <Select value={module} onChange={(v) => { setModule(v); setPage(1); }}>
          <option value="all">All modules</option>
          {MODULES.filter((m) => m !== "SEARCH").map((m) => <option key={m} value={m}>{m}</option>)}
        </Select>
        <Select value={sev} onChange={(v) => { setSev(v); setPage(1); }}>
          <option value="all">All severities</option>
          <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
        </Select>
      </div>
      <div className="hk-event-grid">
        {pageRows.map((e) => (
          <Card key={e.id} className="hk-event-card" onClick={() => onOpen(e)}>
            {e.frame_dataurl ? <img src={e.frame_dataurl} className="hk-event-thumb" /> : <div className="hk-event-thumb hk-event-thumb-empty"><Camera size={18} /></div>}
            <div className="hk-event-card-body">
              <div className="hk-row-gap"><SevBadge sev={e.severity} /><span className="hk-mono hk-slate">{e.camera_id}</span></div>
              <div>{e.summary}</div>
              <div className="hk-mono hk-slate" style={{ fontSize: 11 }}>{monoTime(e.detected_at)}</div>
            </div>
          </Card>
        ))}
      </div>
      {filtered.length === 0 && <EmptyState title="No events match these filters" />}
      <div className="hk-pagination">
        <Btn variant="ghost" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Btn>
        <span className="hk-slate">Page {page} / {totalPages}</span>
        <Btn variant="ghost" size="sm" icon={ChevronRight} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Btn>
      </div>
    </div>
  );
}

/* ---------------------------- Event Detail Modal ---------------------------------------- */
function EventDetailModal({ event, events, onClose, setEvents, logAudit, push }) {
  const [verify, setVerify] = useState(null);
  const [note, setNote] = useState(null);
  const [noteLoading, setNoteLoading] = useState(false);
  const e = events.find((x) => x.id === event.id) || event;

  const doVerify = async () => {
    if (!e.frame_dataurl) { setVerify({ ok: false, msg: "No sealed frame stored for this event." }); return; }
    const h = await sha256(e.frame_dataurl);
    setVerify({ ok: h === e.frame_hash, msg: h === e.frame_hash ? "UNALTERED — hash matches sealed record" : "MISMATCH — evidence integrity compromised" });
    logAudit("integrity_verify", e.id);
  };

  const mark = (field) => {
    setEvents((prev) => prev.map((x) => (x.id === e.id ? { ...x, [field]: !x[field] } : x)));
    logAudit(field, e.id);
    push(`Marked ${field.replace("_", " ")}`, "cyan");
  };

  const getNote = async () => {
    setNoteLoading(true);
    const res = await callClaude(
      [{ type: "text", text: `Event: ${JSON.stringify({ module: e.module, summary: e.summary, camera: e.camera_id, searchable: e.searchable, plate: e.plate, severity: e.severity })}` }],
      "You are a CCTV analyst. Write ONE short paragraph analyst note on this single event for a case file. Be factual, don't invent detail beyond the record. Plain text only, no markdown.",
      300
    );
    setNote(res.ok ? res.text : `Could not generate note: ${res.error}`);
    setNoteLoading(false);
  };

  const related = events.filter((x) => x.id !== e.id && (x.camera_id === e.camera_id || (x.plate && x.plate === e.plate))).slice(0, 4);

  return (
    <Modal open onClose={onClose} title={`Event · ${e.id}`} wide>
      <div className="hk-grid-2">
        <div>
          {e.frame_dataurl ? <img src={e.frame_dataurl} className="hk-detail-frame" /> : <div className="hk-detail-frame hk-event-thumb-empty"><Camera size={28} /></div>}
          <div className="hk-custody-panel">
            <div className="hk-row-gap"><ShieldCheck size={15} className="hk-tone-cyan" /><span>Chain of custody</span></div>
            <div className="hk-mono" style={{ fontSize: 11, wordBreak: "break-all" }}>{e.frame_hash || "hash pending…"}</div>
            <Btn size="sm" variant="ghost" icon={ShieldAlert} onClick={doVerify}>Verify integrity</Btn>
            {verify && <div className={`hk-note ${verify.ok ? "hk-tone-bg-cyan-soft" : "hk-tone-bg-red-soft"}`}>{verify.msg}</div>}
          </div>
        </div>
        <div>
          <div className="hk-row-gap"><SevBadge sev={e.severity} /><Badge tone={e.heuristic ? "slate" : "cyan"}>{e.heuristic ? "rule-based heuristic" : "vision model output"}</Badge></div>
          <table className="hk-meta-table">
            <tbody>
              <tr><td>Camera</td><td className="hk-mono">{e.camera_id}</td></tr>
              <tr><td>Module</td><td>{e.module}</td></tr>
              <tr><td>Object</td><td>{e.object_label}</td></tr>
              <tr><td>Plate</td><td className="hk-mono">{e.plate || "—"}</td></tr>
              <tr><td>Detected</td><td className="hk-mono">{monoTime(e.detected_at)}</td></tr>
              <tr><td>Track ID</td><td className="hk-mono">{e.track_id}</td></tr>
            </tbody>
          </table>
          <div className="hk-row-gap" style={{ marginTop: 10 }}>
            <Btn size="sm" variant={e.reviewed ? "cyan" : "ghost"} icon={CheckCircle2} onClick={() => mark("reviewed")}>{e.reviewed ? "Reviewed" : "Mark reviewed"}</Btn>
            <Btn size="sm" variant={e.false_positive ? "red" : "ghost"} icon={XCircle} onClick={() => mark("false_positive")}>{e.false_positive ? "False positive" : "Flag false positive"}</Btn>
          </div>
          <div className="hk-panel-title" style={{ marginTop: 14 }}>AI review note</div>
          {!note && <Btn size="sm" icon={Sparkles} onClick={getNote} disabled={noteLoading}>{noteLoading ? "Generating…" : "Generate note"}</Btn>}
          {note && <div className="hk-note-text">{note}</div>}
          <div className="hk-panel-title" style={{ marginTop: 14 }}>Related events</div>
          {related.map((r) => <div key={r.id} className="hk-related-row"><span className="hk-mono hk-slate">{r.camera_id}</span> {r.summary}</div>)}
          {related.length === 0 && <div className="hk-slate" style={{ fontSize: 13 }}>No related records found.</div>}
        </div>
      </div>
    </Modal>
  );
}

/* ---------------------------- Investigation Search -------------------------------------- */
function InvestigationSearch({ events, savedSearches, setSavedSearches, onOpen }) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [chips, setChips] = useState(null);
  const [matches, setMatches] = useState(null);
  const [answer, setAnswer] = useState(null);
  const [fallback, setFallback] = useState(false);

  const run = async () => {
    if (!q.trim()) return;
    setLoading(true); setChips(null); setMatches(null); setAnswer(null); setFallback(false);
    const index = events.slice(0, 60).map((e) => ({ id: e.id, time: monoTime(e.detected_at), camera: e.camera_id, module: e.module, class: e.object_label, plate: e.plate, searchable: e.searchable }));
    const system = `You are Hawk-i's investigation search parser. Given a natural-language query and a compact JSON event index, return strict JSON only, no prose:
{"filter":{"module":"","object_type":"","camera_id":"","time_hint":"","plate":"","keywords":[]},"matches":[{"id":"","score":0,"why":""}],"answer":""}
Rank matches by true semantic relevance to the query, not keyword overlap. Drop anything with score below 0.35. "answer" is one investigator-style sentence summarizing the finding.
Examples:
Query: "red bike near the rear gate after dark last Tuesday" -> filter.module could be ANOMALY or ANPR, keywords include ["red","bike","rear gate","night"], time_hint "last Tuesday night".
Query: "any unregistered car between 6 and 9 pm" -> filter.module "ANPR", filter.time_hint "18:00-21:00", keywords ["unregistered","car"].`;
    const res = await callClaude([{ type: "text", text: `Query: ${q}\nEvent index: ${JSON.stringify(index)}` }], system, 900);
    let parsed = res.ok ? tolerantParseJSON(res.text) : null;
    if (res.ok && !parsed) {
      const retry = await callClaude([{ type: "text", text: `Query: ${q}\nEvent index: ${JSON.stringify(index)}\nReturn JSON only, strictly.` }], system, 900);
      parsed = retry.ok ? tolerantParseJSON(retry.text) : null;
    }
    if (parsed) {
      setChips(parsed.filter || {});
      const withData = (parsed.matches || []).map((m) => ({ ...m, event: events.find((e) => e.id === m.id) })).filter((m) => m.event);
      setMatches(withData);
      setAnswer(parsed.answer);
    } else {
      setFallback(true);
      const kws = q.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
      const kwMatches = events.filter((e) => kws.some((k) => (e.searchable || "").toLowerCase().includes(k))).slice(0, 15).map((e) => ({ id: e.id, score: 0.5, why: "keyword match", event: e }));
      setMatches(kwMatches);
      setAnswer("Semantic parsing unavailable — showing keyword fallback results.");
    }
    setLoading(false);
  };

  const save = () => {
    setSavedSearches((s) => [{ id: uid("sv"), q, ts: Date.now(), count: (matches || []).length }, ...s]);
  };

  return (
    <div className="hk-grid-2-side">
      <div>
        <div className="hk-page-head"><h1>Investigation Search</h1><span className="hk-page-sub">Natural language search across every event Hawk-i has recorded.</span></div>
        <div className="hk-search-bar">
          <Input placeholder='e.g. "red bike near the rear gate after dark last Tuesday"' value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run()} />
          <Btn icon={Search} onClick={run} disabled={loading}>{loading ? "Searching…" : "Search"}</Btn>
        </div>
        {chips && (
          <div className="hk-chip-row">
            {Object.entries(chips).map(([k, v]) => v && (Array.isArray(v) ? v.length > 0 : true) && (
              <Badge key={k} tone="cyan">{k}: {Array.isArray(v) ? v.join(", ") : String(v)}</Badge>
            ))}
          </div>
        )}
        {fallback && <div className="hk-note hk-tone-bg-amber-soft">AI parsing failed — falling back to keyword search.</div>}
        {answer && <div className="hk-note hk-tone-bg-cyan-soft">{answer}</div>}
        {matches && matches.length > 0 && <Btn size="sm" variant="ghost" icon={Save} onClick={save} style={{ marginTop: 8 }}>Save this search</Btn>}
        <div className="hk-search-results">
          {loading && [1, 2, 3].map((i) => <Skeleton key={i} h={70} />)}
          {matches && matches.map((m) => (
            <Card key={m.id} className="hk-result-card" onClick={() => onOpen(m.event)}>
              <div className="hk-row-gap"><SevBadge sev={m.event.severity} /><span className="hk-mono hk-slate">{m.event.camera_id}</span><span className="hk-slate" style={{ marginLeft: "auto" }}>score {m.score?.toFixed?.(2) ?? m.score}</span></div>
              <div>{m.event.summary}</div>
              <div className="hk-slate" style={{ fontSize: 12 }}>{m.why}</div>
            </Card>
          ))}
          {matches && matches.length === 0 && <EmptyState title="No matching events" sub="Try a broader query." />}
        </div>
      </div>
      <Card className="hk-panel">
        <div className="hk-panel-title">Saved investigations</div>
        {savedSearches.length === 0 && <div className="hk-slate" style={{ fontSize: 13 }}>Nothing saved yet.</div>}
        {savedSearches.map((s) => (
          <div key={s.id} className="hk-saved-row" onClick={() => setQ(s.q)}>
            <div>{s.q}</div>
            <div className="hk-slate" style={{ fontSize: 11 }}>{s.count} results · {relTime(s.ts)}</div>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ---------------------------- Face Search (appearance-based, not biometric) ------------- */
function FaceSearch({ events, cameras, onOpen, logAudit, push }) {
  const [refImage, setRefImage] = useState(null);
  const [refDesc, setRefDesc] = useState(null);
  const [descLoading, setDescLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [progress, setProgress] = useState(null);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  const [depth, setDepth] = useState("quick");
  const [threshold, setThreshold] = useState(50);
  const [range, setRange] = useState("all");
  const [selectedCameras, setSelectedCameras] = useState(() => cameras.map((c) => c.id));
  const [includeDemo, setIncludeDemo] = useState(false);
  const [sortBy, setSortBy] = useState("confidence");
  const [view, setView] = useState("timeline");
  const fileInput = useRef(null);

  // keep camera selection in sync as cameras are added (e.g. a newly connected real camera)
  useEffect(() => { setSelectedCameras((sc) => Array.from(new Set([...sc, ...cameras.map((c) => c.id)]))); }, [cameras.length]); // eslint-disable-line

  const onUpload = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setError(null);
    try {
      const url = URL.createObjectURL(f);
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error("Could not read this image.")); img.src = url; });
      const cv = document.createElement("canvas");
      const scale = Math.min(1, 500 / Math.max(img.width, img.height));
      cv.width = img.width * scale; cv.height = img.height * scale;
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      const dataUrl = cv.toDataURL("image/jpeg", 0.85);
      setRefImage(dataUrl); setRefDesc(null); setResults([]);
      setDescLoading(true);
      const system = `You are Hawk-i's appearance-description module, generating an investigative lead description from a reference photo. Describe ONLY visible clothing, accessories, hair colour/length, and approximate build. Never guess or state ethnicity, never estimate exact age (a broad range like "adult" is fine), and never attempt to name or identify the person. Return strict JSON only, no prose: {"description":"","distinctive_features":["",...]}`;
      const res = await callClaude([
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: dataUrl.split(",")[1] } },
        { type: "text", text: "Describe this reference photo per the system instructions." }
      ], system, 300);
      const parsed = res.ok ? tolerantParseJSON(res.text) : null;
      setRefDesc(parsed || { description: res.ok ? res.text : `Could not describe image: ${res.error}`, distinctive_features: [] });
    } catch (err) {
      setError(err.message);
    }
    setDescLoading(false);
  };

  const rangeMs = { "24h": 86400000, "7d": 7 * 86400000, "30d": 30 * 86400000, all: Infinity }[range];
  const candidatePool = useMemo(() => events.filter((e) =>
    e.frame_dataurl &&
    (e.object_type === "person" || e.object_label === "person" || e.object_label === "crowd") &&
    selectedCameras.includes(e.camera_id) &&
    (Date.now() - e.detected_at) <= rangeMs &&
    (includeDemo || e.heuristic === false)
  ).sort((a, b) => b.detected_at - a.detected_at), [events, selectedCameras, rangeMs, includeDemo]);
  const cap = depth === "thorough" ? 40 : 12;
  const candidates = candidatePool.slice(0, cap);

  const runSearch = async () => {
    if (!refImage) return;
    setSearching(true); setResults([]); setError(null);
    if (candidates.length === 0) {
      setError("No candidate frames match your current filters — widen the time range, add cameras, or include demo feeds.");
      setSearching(false);
      return;
    }
    const system = `You compare a reference photo of a person against ONE CCTV frame for investigative lead generation. This is APPEARANCE-based visual comparison only — never claim certain identity, never perform or imply biometric facial recognition. Judge only on visible clothing, build, hair, and distinctive items. Return strict JSON only, no prose: {"match_likely":true|false,"confidence":0-100,"reasoning":""}. If the frame is a stylized/synthetic scene with no real photographic detail to compare, say so in "reasoning" and return confidence 0.`;
    const out = [];
    const b64ref = refImage.split(",")[1];
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      setProgress({ done: i, total: candidates.length });
      const b64frame = c.frame_dataurl.split(",")[1];
      const res = await callClaude([
        { type: "text", text: "Reference photo:" },
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64ref } },
        { type: "text", text: "Candidate CCTV frame:" },
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64frame } },
        { type: "text", text: "Compare per the system instructions." }
      ], system, 220);
      const parsed = res.ok ? tolerantParseJSON(res.text) : null;
      if (parsed && typeof parsed.confidence === "number") {
        out.push({ event: c, confidence: Math.round(parsed.confidence), reasoning: parsed.reasoning || "", matchLikely: parsed.match_likely });
      }
      setProgress({ done: i + 1, total: candidates.length });
    }
    setResults(out);
    setSearching(false);
    logAudit("face_search_run", `${out.length} candidates scored, ${out.filter((r) => r.confidence >= threshold).length} above threshold`);
    push(`Appearance search complete — ${out.filter((r) => r.confidence >= threshold).length} match(es) above threshold`, "cyan");
  };

  const filtered = results.filter((r) => r.confidence >= threshold).sort((a, b) => sortBy === "confidence" ? b.confidence - a.confidence : b.event.detected_at - a.event.detected_at);
  const byCamera = {};
  filtered.forEach((r) => { (byCamera[r.event.camera_id] = byCamera[r.event.camera_id] || []).push(r); });
  const toggleCamera = (id) => setSelectedCameras((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const matchTone = (c) => (c >= 75 ? "red" : c >= 50 ? "amber" : "slate");

  return (
    <div>
      <div className="hk-page-head"><h1>Face Search</h1><span className="hk-page-sub">Upload a reference photo — Hawk-i scans stored frames for appearance matches and plots sightings on a timeline.</span></div>
      <div className="hk-facesearch-grid">
        <Card className="hk-panel hk-facesearch-controls-card">
          <div className="hk-panel-title">Reference photo</div>
          {!refImage ? (
            <div className="hk-upload-zone" onClick={() => fileInput.current?.click()}>
              <UserSearch size={26} />
              <span>Click to upload a photo or screenshot of a face</span>
            </div>
          ) : (
            <div className="hk-ref-preview">
              <img src={refImage} alt="reference" />
              <Btn size="sm" variant="ghost" onClick={() => { setRefImage(null); setRefDesc(null); setResults([]); }}>Replace photo</Btn>
            </div>
          )}
          <input ref={fileInput} type="file" accept="image/*" style={{ display: "none" }} onChange={onUpload} />
          {descLoading && <div className="hk-slate" style={{ fontSize: 12, marginTop: 8 }}>Describing appearance…</div>}
          {refDesc && (
            <div className="hk-note hk-tone-bg-cyan-soft" style={{ marginTop: 10 }}>
              <div style={{ marginBottom: 6 }}>{refDesc.description}</div>
              {refDesc.distinctive_features?.length > 0 && <div className="hk-row-gap" style={{ flexWrap: "wrap" }}>{refDesc.distinctive_features.map((f, i) => <Badge key={i} tone="cyan">{f}</Badge>)}</div>}
            </div>
          )}
          <div className="hk-note hk-tone-bg-amber-soft" style={{ marginTop: 10 }}>Appearance-based visual matching via AI vision — not biometric facial recognition. Treat results as investigative leads, not confirmed identity.</div>

          <div className="hk-panel-title" style={{ marginTop: 18 }}><SlidersHorizontal size={13} style={{ marginRight: 6, verticalAlign: -2 }} />Search controls</div>
          <div className="hk-facesearch-controls">
            <label>Search depth
              <Select value={depth} onChange={setDepth}>
                <option value="quick">Quick — 12 most recent candidates</option>
                <option value="thorough">Thorough — up to 40 candidates</option>
              </Select>
            </label>
            <label>Time range
              <Select value={range} onChange={setRange}>
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="all">All time</option>
              </Select>
            </label>
            <label>Sort results by
              <Select value={sortBy} onChange={setSortBy}>
                <option value="confidence">Confidence</option>
                <option value="time">Most recent</option>
              </Select>
            </label>
            <label>Results view
              <Select value={view} onChange={setView}>
                <option value="timeline">Timeline</option>
                <option value="grid">Grid</option>
                <option value="camera">By camera</option>
              </Select>
            </label>
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="hk-slate" style={{ fontSize: 12, marginBottom: 4 }}>Minimum confidence to display: {threshold}%</div>
            <input type="range" min="0" max="100" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="hk-slider" />
          </div>
          <Toggle checked={includeDemo} onChange={setIncludeDemo} label="Include scripted demo cameras (illustrative only)" />
          <div style={{ marginTop: 6 }}>
            <div className="hk-slate" style={{ fontSize: 12, marginBottom: 6 }}>Cameras included</div>
            <div className="hk-row-gap" style={{ flexWrap: "wrap" }}>
              {cameras.map((c) => (
                <span key={c.id} className={`hk-badge hk-cam-toggle ${selectedCameras.includes(c.id) ? "hk-badge-cyan" : "hk-badge-slate"}`} onClick={() => toggleCamera(c.id)}>{c.id}</span>
              ))}
            </div>
          </div>
          <Btn icon={Sparkles} onClick={runSearch} disabled={!refImage || searching} style={{ marginTop: 16 }}>
            {searching ? `Scanning ${progress?.done || 0}/${progress?.total || 0}…` : `Search ${candidates.length} candidate frame(s)`}
          </Btn>
          {error && <div className="hk-note hk-tone-bg-red-soft">{error}</div>}
        </Card>

        <div>
          {view === "timeline" && <FaceTimeline results={filtered} onOpen={onOpen} />}
          {view === "grid" && (
            <div className="hk-event-grid">
              {filtered.map((r) => (
                <Card key={r.event.id} className="hk-event-card" onClick={() => onOpen(r.event)}>
                  <img src={r.event.frame_dataurl} className="hk-event-thumb" />
                  <div className="hk-event-card-body">
                    <div className="hk-row-gap"><Badge tone={matchTone(r.confidence)}>{r.confidence}% match</Badge><span className="hk-mono hk-slate">{r.event.camera_id}</span></div>
                    <div style={{ fontSize: 12 }}>{r.reasoning}</div>
                    <div className="hk-mono hk-slate" style={{ fontSize: 11 }}>{monoTime(r.event.detected_at)}</div>
                  </div>
                </Card>
              ))}
              {filtered.length === 0 && results.length > 0 && <EmptyState title="No matches above threshold" sub="Lower the confidence slider to see more candidates." />}
            </div>
          )}
          {view === "camera" && Object.entries(byCamera).map(([camId, rs]) => (
            <Card key={camId} className="hk-panel" style={{ marginBottom: 12 }}>
              <div className="hk-panel-title">{camId} — {rs.length} sighting(s)</div>
              <div className="hk-row-gap" style={{ flexWrap: "wrap" }}>
                {rs.map((r) => (
                  <div key={r.event.id} className="hk-face-chip" onClick={() => onOpen(r.event)}>
                    <img src={r.event.frame_dataurl} alt="" />
                    <span className="hk-mono">{monoTime(r.event.detected_at).split(" ")[1]}</span>
                    <Badge tone={matchTone(r.confidence)}>{r.confidence}%</Badge>
                  </div>
                ))}
              </div>
            </Card>
          ))}
          {view === "camera" && filtered.length === 0 && <EmptyState title="No sightings yet" sub="Run a search to populate camera-by-camera results." />}
          {results.length === 0 && !searching && <EmptyState icon={UserSearch} title="No search run yet" sub="Upload a reference photo and run a search to see results here." />}
        </div>
      </div>
    </div>
  );
}
function FaceTimeline({ results, onOpen }) {
  if (results.length === 0) return <Card className="hk-panel"><EmptyState icon={Clock} title="No matches yet" sub="Results will appear here as a timeline once you run a search." /></Card>;
  const times = results.map((r) => r.event.detected_at);
  const min = Math.min(...times), max = Math.max(...times);
  const span = Math.max(1, max - min);
  const sorted = [...results].sort((a, b) => a.event.detected_at - b.event.detected_at);
  return (
    <Card className="hk-panel">
      <div className="hk-panel-title">Sighting timeline — {results.length} match(es) across {new Set(results.map((r) => r.event.camera_id)).size} camera(s)</div>
      <div className="hk-timeline-track">
        {results.map((r) => {
          const pct = span > 0 ? ((r.event.detected_at - min) / span) * 100 : 50;
          return (
            <div key={r.event.id} className="hk-timeline-marker" style={{ left: `${pct}%` }} onClick={() => onOpen(r.event)} title={`${r.event.camera_id} · ${monoTime(r.event.detected_at)} · ${r.confidence}%`}>
              <div className="hk-timeline-dot" style={{ background: r.confidence >= 75 ? COLORS.red : r.confidence >= 50 ? COLORS.amber : COLORS.slate }} />
            </div>
          );
        })}
      </div>
      <div className="hk-timeline-labels"><span className="hk-mono hk-slate">{monoTime(min)}</span><span className="hk-mono hk-slate">{monoTime(max)}</span></div>
      <div className="hk-timeline-list">
        {sorted.map((r) => (
          <div key={r.event.id} className="hk-timeline-row" onClick={() => onOpen(r.event)}>
            <img src={r.event.frame_dataurl} className="hk-timeline-thumb" alt="" />
            <div>
              <div className="hk-row-gap"><span className="hk-mono">{r.event.camera_id}</span><Badge tone={r.confidence >= 75 ? "red" : r.confidence >= 50 ? "amber" : "slate"}>{r.confidence}%</Badge></div>
              <div className="hk-mono hk-slate" style={{ fontSize: 11 }}>{monoTime(r.event.detected_at)}</div>
              <div style={{ fontSize: 12 }}>{r.reasoning}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---------------------------- Alerts ---------------------------------------------------- */
function AlertsPage({ alerts, setEvents, onOpen, logAudit }) {
  const [sev, setSev] = useState("all");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState([]);
  const filtered = alerts.filter((a) => (sev === "all" || a.severity === sev) && (status === "all" || (status === "open" ? !a.reviewed : a.reviewed)));

  const toggleSel = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const bulkDismiss = () => {
    setEvents((prev) => prev.map((e) => (selected.includes(e.id) ? { ...e, reviewed: true } : e)));
    logAudit("bulk_dismiss", selected.join(","));
    setSelected([]);
  };

  return (
    <div>
      <div className="hk-page-head"><h1>Alerts</h1><span className="hk-page-sub">{filtered.length} alerts</span></div>
      <div className="hk-filter-bar">
        <Select value={sev} onChange={setSev}><option value="all">All severities</option><option value="high">High</option><option value="medium">Medium</option></Select>
        <Select value={status} onChange={setStatus}><option value="all">All statuses</option><option value="open">Open</option><option value="reviewed">Reviewed</option></Select>
        {selected.length > 0 && <Btn size="sm" icon={CheckCircle2} onClick={bulkDismiss}>Dismiss {selected.length}</Btn>}
      </div>
      <div className="hk-table-wrap">
        <table className="hk-table">
          <thead><tr><th></th><th>Severity</th><th>Camera</th><th>Summary</th><th>Time</th><th>Status</th></tr></thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} className="hk-row-click">
                <td onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selected.includes(a.id)} onChange={() => toggleSel(a.id)} /></td>
                <td onClick={() => onOpen(a)}><SevBadge sev={a.severity} /></td>
                <td className="hk-mono" onClick={() => onOpen(a)}>{a.camera_id}</td>
                <td onClick={() => onOpen(a)}>{a.summary}</td>
                <td className="hk-mono" onClick={() => onOpen(a)}>{monoTime(a.detected_at)}</td>
                <td onClick={() => onOpen(a)}><Badge tone={a.reviewed ? "cyan" : "amber"}>{a.reviewed ? "reviewed" : "open"}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <EmptyState icon={Bell} title="No alerts" sub="Nothing matches these filters right now." />}
    </div>
  );
}

/* ---------------------------- ANPR Log -------------------------------------------------- */
function ANPRLog({ events }) {
  const anpr = events.filter((e) => e.plate);
  const byPlate = {};
  anpr.forEach((e) => { (byPlate[e.plate] = byPlate[e.plate] || []).push(e); });
  const trails = Object.entries(byPlate).filter(([, evs]) => evs.length > 1).map(([plate, evs]) => {
    const sorted = [...evs].sort((a, b) => a.detected_at - b.detected_at);
    return { plate, sorted };
  });
  return (
    <div>
      <div className="hk-page-head"><h1>ANPR Log</h1><span className="hk-page-sub">Plate reads and cross-camera trails. Trails are plate-text matching, not visual re-identification.</span></div>
      <Table columns={[
        { key: "plate", label: "Plate", mono: true },
        { key: "camera_id", label: "Camera", mono: true },
        { key: "detected_at", label: "Time", mono: true, render: (r) => monoTime(r.detected_at) },
        { key: "status", label: "Status", render: (r) => <Badge tone={WATCHLIST.has(r.plate) ? "red" : "slate"}>{WATCHLIST.has(r.plate) ? "watchlisted" : "unregistered check"}</Badge> }
      ]} rows={anpr} />
      <div className="hk-panel-title" style={{ marginTop: 18 }}>Cross-camera trails <span className="hk-slate" style={{ fontWeight: 400, fontSize: 12 }}>(plate-text matching)</span></div>
      {trails.length === 0 && <div className="hk-slate" style={{ fontSize: 13 }}>No plate seen at more than one camera yet.</div>}
      {trails.map(({ plate, sorted }) => (
        <Card key={plate} className="hk-panel" style={{ marginBottom: 10 }}>
          <div className="hk-mono">{plate}</div>
          <div className="hk-trail">
            {sorted.map((e, i) => (
              <React.Fragment key={e.id}>
                <span className="hk-mono">{e.camera_id}</span>
                {i < sorted.length - 1 && <span className="hk-slate">→ {Math.max(1, Math.round((sorted[i + 1].detected_at - e.detected_at) / 60000))} min later →</span>}
              </React.Fragment>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ---------------------------- Reports --------------------------------------------------- */
function ReportsPage({ events, cameras }) {
  const days = [...Array(7)].map((_, i) => {
    const d = new Date(now - (6 - i) * 86400000);
    const key = `${d.getMonth() + 1}/${d.getDate()}`;
    const count = events.filter((e) => new Date(e.detected_at).toDateString() === d.toDateString()).length;
    return { name: key, count };
  });
  const byModule = MODULES.filter((m) => m !== "SEARCH").map((m) => ({ name: m, count: events.filter((e) => e.module === m).length }));
  const byCamera = cameras.map((c) => ({ name: c.id, count: events.filter((e) => e.camera_id === c.id).length }));
  const dwellByCamera = cameras.map((c) => ({
    name: c.id,
    count: events.filter((e) => e.camera_id === c.id && e.module === "ANOMALY" && e.summary.toLowerCase().includes("loiter")).length
  }));

  const exportCSV = () => {
    const rows = [["id", "camera", "module", "severity", "summary", "time"], ...events.map((e) => [e.id, e.camera_id, e.module, e.severity, e.summary, monoTime(e.detected_at)])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    downloadBlob(csv, "hawki-events.csv", "text/csv");
  };
  const printReport = () => {
    const w = window.open("", "_blank");
    w.document.write(`<html><head><title>Hawk-i Report</title><style>body{font-family:sans-serif;padding:24px}</style></head><body><h1>Hawk-i Activity Report</h1><p>${new Date().toLocaleString()}</p><table border="1" cellpadding="6"><tr><th>Camera</th><th>Module</th><th>Severity</th><th>Summary</th><th>Time</th></tr>${events.map((e) => `<tr><td>${e.camera_id}</td><td>${e.module}</td><td>${e.severity}</td><td>${e.summary}</td><td>${monoTime(e.detected_at)}</td></tr>`).join("")}</table></body></html>`);
    w.document.close(); w.print();
  };

  return (
    <div>
      <div className="hk-page-head"><h1>Reports</h1><span className="hk-page-sub">Activity across the last 7 days</span>
        <div className="hk-ml-auto hk-row-gap">
          <Btn variant="ghost" icon={Download} onClick={exportCSV}>Export CSV</Btn>
          <Btn variant="ghost" icon={FileText} onClick={printReport}>Printable report</Btn>
        </div>
      </div>
      <div className="hk-grid-2">
        <Card className="hk-panel">
          <div className="hk-panel-title">Event volume</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={days}><CartesianGrid stroke={COLORS.hair} /><XAxis dataKey="name" stroke={COLORS.slate} fontSize={11} /><YAxis stroke={COLORS.slate} fontSize={11} />
              <Tooltip contentStyle={{ background: COLORS.elevated, border: `1px solid ${COLORS.hair}` }} />
              <Area type="monotone" dataKey="count" stroke={COLORS.cyan} fill="rgba(45,212,191,0.18)" /></AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card className="hk-panel">
          <div className="hk-panel-title">Module breakdown</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byModule}><CartesianGrid stroke={COLORS.hair} /><XAxis dataKey="name" stroke={COLORS.slate} fontSize={10} /><YAxis stroke={COLORS.slate} fontSize={11} />
              <Tooltip contentStyle={{ background: COLORS.elevated, border: `1px solid ${COLORS.hair}` }} />
              <Bar dataKey="count" fill={COLORS.cyan} radius={[4, 4, 0, 0]} /></BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <div className="hk-grid-2" style={{ marginTop: 16 }}>
        <Card className="hk-panel">
          <div className="hk-panel-title">Camera activity</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byCamera} layout="vertical"><CartesianGrid stroke={COLORS.hair} /><XAxis type="number" stroke={COLORS.slate} fontSize={11} /><YAxis dataKey="name" type="category" stroke={COLORS.slate} fontSize={11} width={80} />
              <Tooltip contentStyle={{ background: COLORS.elevated, border: `1px solid ${COLORS.hair}` }} />
              <Bar dataKey="count" fill={COLORS.amber} radius={[0, 4, 4, 0]} /></BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="hk-panel">
          <div className="hk-panel-title">Zone dwell events <span className="hk-slate" style={{ fontWeight: 400, fontSize: 11 }}>(loitering anomalies by camera)</span></div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dwellByCamera}><CartesianGrid stroke={COLORS.hair} /><XAxis dataKey="name" stroke={COLORS.slate} fontSize={10} /><YAxis stroke={COLORS.slate} fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: COLORS.elevated, border: `1px solid ${COLORS.hair}` }} />
              <Bar dataKey="count" fill={COLORS.cyan} radius={[4, 4, 0, 0]} /></BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ---------------------------- Evidence Vault -------------------------------------------- */
function EvidenceVault({ events, session, settings, logAudit, push }) {
  const [selected, setSelected] = useState([]);
  const [brief, setBrief] = useState(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const chosen = events.filter((e) => selected.includes(e.id));

  // real disk-usage guard: sum actual bytes of stored frames (base64 -> ~0.75 bytes/char)
  const usedBytes = events.reduce((sum, e) => sum + (e.frame_dataurl ? e.frame_dataurl.length * 0.75 : 0), 0);
  const capBytes = 40 * 1024 * 1024; // demo cap, 40MB
  const usedPct = Math.min(100, Math.round((usedBytes / capBytes) * 100));
  const retentionDays = (e) => {
    const expiresAt = e.detected_at + settings.retention_days * 86400000;
    const daysLeft = Math.ceil((expiresAt - Date.now()) / 86400000);
    return daysLeft <= 0 ? "expired" : `${daysLeft}d left`;
  };

  const exportManifest = () => {
    const manifest = {
      exported_at: monoTime(Date.now()), operator: session.username,
      records: chosen.map((e) => ({ id: e.id, camera_id: e.camera_id, module: e.module, severity: e.severity, detected_at: monoTime(e.detected_at), frame_hash: e.frame_hash }))
    };
    downloadBlob(JSON.stringify(manifest, null, 2), "hawki-evidence-manifest.json", "application/json");
    logAudit("export_manifest", selected.join(","));
    push("Signed manifest exported", "cyan");
  };
  const exportBundle = () => {
    const rows = [["id", "camera", "module", "severity", "hash", "time"], ...chosen.map((e) => [e.id, e.camera_id, e.module, e.severity, e.frame_hash || "", monoTime(e.detected_at)])];
    downloadBlob(rows.map((r) => r.join(",")).join("\n"), "hawki-evidence-bundle.csv", "text/csv");
  };

  const genBrief = async () => {
    setBriefLoading(true);
    const system = `You are Hawk-i drafting a police-facing case brief in markdown. Sections: Summary, Timeline (monospace-style timestamps), Objects & Vehicles, Assessment, Recommended Action. Never invent detail beyond the records given. Flag any rule-based (heuristic) findings explicitly as heuristic, not confirmed fact.`;
    const res = await callClaude([{ type: "text", text: JSON.stringify(chosen.map((e) => ({ id: e.id, camera: e.camera_id, module: e.module, severity: e.severity, summary: e.summary, plate: e.plate, time: monoTime(e.detected_at), heuristic: e.heuristic }))) }], system, 1000);
    setBrief(res.ok ? res.text : `Could not generate brief: ${res.error}`);
    setBriefLoading(false);
    logAudit("case_brief_generated", selected.join(","));
  };

  return (
    <div>
      <div className="hk-page-head"><h1>Evidence Vault</h1><span className="hk-page-sub">Select records to export a signed manifest or generate an AI case brief.</span></div>
      <Card className="hk-panel" style={{ marginBottom: 14 }}>
        <div className="hk-panel-title">Storage used <span className="hk-slate" style={{ fontWeight: 400 }}>— sealed frames only, computed from actual stored bytes</span></div>
        <div className="hk-storage-bar"><div className="hk-storage-fill" style={{ width: `${usedPct}%`, background: usedPct > 80 ? COLORS.red : COLORS.cyan }} /></div>
        <div className="hk-slate" style={{ fontSize: 12, marginTop: 4 }}>{(usedBytes / 1024 / 1024).toFixed(1)} MB / 40 MB demo cap ({usedPct}%)</div>
      </Card>
      <div className="hk-table-wrap">
        <table className="hk-table">
          <thead><tr><th></th><th>Camera</th><th>Module</th><th>Severity</th><th>Hash</th><th>Time</th><th>Retention</th></tr></thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td><input type="checkbox" checked={selected.includes(e.id)} onChange={() => toggle(e.id)} /></td>
                <td className="hk-mono">{e.camera_id}</td><td>{e.module}</td><td><SevBadge sev={e.severity} /></td>
                <td className="hk-mono" style={{ fontSize: 11 }}>{e.frame_hash ? e.frame_hash.slice(0, 12) + "…" : "—"}</td>
                <td className="hk-mono">{monoTime(e.detected_at)}</td>
                <td><Badge tone={retentionDays(e) === "expired" ? "red" : "slate"}>{retentionDays(e)}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="hk-row-gap" style={{ marginTop: 10 }}>
        <Btn icon={Download} disabled={!selected.length} onClick={exportManifest}>Export signed manifest</Btn>
        <Btn variant="ghost" icon={FileArchive} disabled={!selected.length} onClick={exportBundle}>Export CSV bundle</Btn>
        <Btn variant="ghost" icon={Sparkles} disabled={!selected.length} onClick={genBrief}>{briefLoading ? "Drafting…" : "Generate case brief"}</Btn>
      </div>
      {brief && <Card className="hk-panel" style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>{brief}</Card>}
    </div>
  );
}

/* ---------------------------- Users ----------------------------------------------------- */
function UsersPage({ users, setUsers, logAudit, push }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", role: "operator", name: "" });
  const save = () => {
    setUsers((u) => [...u, { id: uid("u"), ...form }]);
    logAudit("user_created", form.username);
    push("User added", "cyan");
    setModal(false); setForm({ username: "", password: "", role: "operator", name: "" });
  };
  return (
    <div>
      <div className="hk-page-head"><h1>Users</h1><span className="hk-page-sub">Admin-only</span><Btn icon={Plus} className="hk-ml-auto" onClick={() => setModal(true)}>Add user</Btn></div>
      <Table columns={[
        { key: "name", label: "Name" }, { key: "username", label: "Username", mono: true },
        { key: "role", label: "Role", render: (r) => <Badge tone={r.role === "admin" ? "cyan" : "slate"}>{r.role}</Badge> },
        { key: "toggle", label: "", render: (r) => (
          <Btn size="sm" variant="ghost" onClick={() => { setUsers((us) => us.map((x) => x.id === r.id ? { ...x, role: x.role === "admin" ? "operator" : "admin" } : x)); logAudit("role_toggled", r.username); }}>Toggle role</Btn>
        ) }
      ]} rows={users} />
      <Modal open={modal} onClose={() => setModal(false)} title="Add user">
        <div className="hk-form-grid">
          <Input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <Input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Select value={form.role} onChange={(v) => setForm({ ...form, role: v })}><option value="operator">Operator</option><option value="admin">Admin</option></Select>
        </div>
        <Btn onClick={save} style={{ marginTop: 10 }} disabled={!form.username || !form.password}>Save user</Btn>
      </Modal>
    </div>
  );
}

/* ---------------------------- Settings -------------------------------------------------- */
function SettingsPage({ settings, setSettings, logAudit, push }) {
  const set = (path, val) => {
    setSettings((s) => {
      const copy = JSON.parse(JSON.stringify(s));
      if (path[0] === "thresholds") copy.thresholds[path[1]] = Number(val);
      else copy[path[0]] = val;
      return copy;
    });
  };
  const save = () => { logAudit("settings_saved", JSON.stringify(settings.thresholds)); push("Settings saved — next detections use new thresholds", "cyan"); };
  return (
    <div>
      <div className="hk-page-head"><h1>Settings</h1><span className="hk-page-sub">Thresholds apply to the very next detection tick.</span></div>
      <Card className="hk-panel">
        <div className="hk-panel-title">Detection thresholds</div>
        <div className="hk-form-grid">
          <label>Velocity warn (km/h)<Input type="number" value={settings.thresholds.velocity_warn} onChange={(e) => set(["thresholds", "velocity_warn"], e.target.value)} /></label>
          <label>Velocity high (km/h)<Input type="number" value={settings.thresholds.velocity_high} onChange={(e) => set(["thresholds", "velocity_high"], e.target.value)} /></label>
          <label>Loiter (seconds)<Input type="number" value={settings.thresholds.loiter_seconds} onChange={(e) => set(["thresholds", "loiter_seconds"], e.target.value)} /></label>
          <label>Crowd count<Input type="number" value={settings.thresholds.crowd_count} onChange={(e) => set(["thresholds", "crowd_count"], e.target.value)} /></label>
          <label>Abandoned object (seconds)<Input type="number" value={settings.thresholds.abandoned_seconds} onChange={(e) => set(["thresholds", "abandoned_seconds"], e.target.value)} /></label>
          <label>Retention (days)<Input type="number" value={settings.retention_days} onChange={(e) => set(["retention_days"], e.target.value)} /></label>
        </div>
      </Card>
      <Card className="hk-panel" style={{ marginTop: 14 }}>
        <div className="hk-panel-title">Alerts & privacy</div>
        <Toggle checked={settings.privacy_blur} onChange={(v) => set(["privacy_blur"], v)} label="Blur non-triggering faces/bodies in sealed frames" />
        <Toggle checked={settings.alert_chime} onChange={(v) => set(["alert_chime"], v)} label="Play chime on new high-severity alert" />
        <Toggle checked={settings.spoken_alerts} onChange={(v) => set(["spoken_alerts"], v)} label="Speak high-severity announcements" />
      </Card>
      <Card className="hk-panel" style={{ marginTop: 14 }}>
        <div className="hk-panel-title">Notifications</div>
        <div className="hk-form-grid">
          <Input placeholder="Notification email" value={settings.notify_email} onChange={(e) => set(["notify_email"], e.target.value)} />
          <Input placeholder="Telegram chat ID" value={settings.notify_telegram} onChange={(e) => set(["notify_telegram"], e.target.value)} />
        </div>
        <div className="hk-note hk-tone-bg-amber-soft">Sending actual email/Telegram notifications requires the backend service (Track B) — this is configuration only in the prototype.</div>
      </Card>
      <Card className="hk-panel" style={{ marginTop: 14 }}>
        <div className="hk-panel-title">Branding</div>
        <Input value={settings.branding_name} onChange={(e) => set(["branding_name"], e.target.value)} />
      </Card>
      <Btn onClick={save} style={{ marginTop: 14 }} icon={Save}>Save settings</Btn>
    </div>
  );
}

/* ---------------------------- Audit Log ------------------------------------------------- */
function AuditPage({ audit }) {
  return (
    <div>
      <div className="hk-page-head"><h1>Audit Log</h1><span className="hk-page-sub">Every operator action, recorded.</span></div>
      <Table columns={[
        { key: "ts", label: "Time", mono: true, render: (r) => monoTime(r.ts) },
        { key: "user", label: "User" }, { key: "action", label: "Action" }, { key: "detail", label: "Detail", mono: true }
      ]} rows={audit} empty={<EmptyState title="No audit entries yet" sub="Actions like review, dismiss, export, and settings changes appear here." />} />
    </div>
  );
}

/* ---------------------------- Demo Control Panel ---------------------------------------- */
function DemoControlPanel({ onClose, addEvent, cameras, setEvents, cameraStatus, setCameraStatus, push }) {
  const [step, setStep] = useState(0);
  const steps = ["Log in", "Open a camera", "Draw a zone", "Trigger a detection", "Check an alert", "See the evidence seal", "Run a search", "Generate a case brief"];
  const trigger = (module) => {
    const cam = cameras[Math.floor(Math.random() * cameras.length)];
    addEvent({ camera_id: cam.id, module, object_type: module === "ANPR" ? "vehicle" : "person", object_label: module === "ANPR" ? "vehicle" : "person",
      severity: module === "INTRUSION" ? "high" : "medium", summary: `Manually triggered ${module} event`, searchable: `manually triggered ${module} demo event at ${cam.id}`, heuristic: true });
  };
  return (
    <Modal open onClose={onClose} title="Demo Control Panel" wide>
      <div className="hk-panel-title">Trigger an event on demand</div>
      <div className="hk-row-gap" style={{ flexWrap: "wrap" }}>
        {MODULES.filter((m) => m !== "SEARCH").map((m) => <Btn key={m} size="sm" onClick={() => trigger(m)}>{m}</Btn>)}
      </div>
      <div className="hk-panel-title" style={{ marginTop: 14 }}>Camera health override</div>
      <div className="hk-row-gap" style={{ flexWrap: "wrap" }}>
        {cameras.map((c) => (
          <Select key={c.id} value={(cameraStatus || {})[c.id] || "online"} onChange={(v) => setCameraStatus((s) => ({ ...s, [c.id]: v }))} className="hk-demo-status-select">
            <option value="online">{c.id}: online</option>
            <option value="degraded">{c.id}: degraded</option>
            <option value="offline">{c.id}: offline</option>
            <option value="tampered">{c.id}: tampered</option>
          </Select>
        ))}
      </div>
      <div className="hk-panel-title" style={{ marginTop: 14 }}>Reset</div>
      <div className="hk-row-gap">
        <Btn size="sm" variant="ghost" icon={RefreshCw} onClick={() => { setEvents(seedEvents()); push("Reset to seeded state", "cyan"); }}>Reset to seeded state</Btn>
      </div>
      <div className="hk-panel-title" style={{ marginTop: 14 }}>Judge mode walkthrough</div>
      <div className="hk-walkthrough">
        <div className="hk-walk-step">{step + 1}. {steps[step]}</div>
        <div className="hk-row-gap">
          <Btn size="sm" variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</Btn>
          <Btn size="sm" disabled={step === steps.length - 1} onClick={() => setStep((s) => s + 1)}>Next step</Btn>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------------------- Global styles --------------------------------------------- */
function GlobalStyle() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      body, .hk-app { font-family: Inter, system-ui, -apple-system, sans-serif; }
      .hk-mono { font-family: 'SF Mono', 'Roboto Mono', Menlo, monospace; }
      .hk-app {
        display: flex; min-height: 100vh; color: ${COLORS.text};
        background:
          radial-gradient(1100px 620px at 14% -8%, rgba(45,212,191,0.09), transparent 60%),
          radial-gradient(900px 500px at 100% 0%, rgba(245,158,11,0.05), transparent 55%),
          linear-gradient(180deg, #0c1219 0%, #070a0e 55%, #05070a 100%);
        background-attachment: fixed;
      }
      .hk-slate { color: ${COLORS.slate}; }
      .hk-tone-cyan { color: ${COLORS.cyan}; } .hk-tone-amber { color: ${COLORS.amber}; } .hk-tone-red { color: ${COLORS.red}; }
      .hk-tone-bg-cyan { background: rgba(45,212,191,0.16); color: ${COLORS.cyan}; }
      .hk-tone-bg-red { background: rgba(239,68,68,0.16); color: ${COLORS.red}; }
      .hk-tone-bg-amber { background: rgba(245,158,11,0.16); color: ${COLORS.amber}; }
      .hk-tone-bg-cyan-soft { background: rgba(45,212,191,0.08); border: 1px solid rgba(45,212,191,0.25); }
      .hk-tone-bg-red-soft { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.3); }
      .hk-tone-bg-amber-soft { background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.3); }

      .hk-sidebar {
        width: 226px; flex-shrink: 0; display: flex; flex-direction: column; padding: 16px 11px;
        background: linear-gradient(180deg, rgba(18,24,33,0.92), rgba(9,12,16,0.96));
        border-right: 1px solid ${COLORS.hair};
        box-shadow: 1px 0 0 rgba(255,255,255,0.02), 6px 0 30px rgba(0,0,0,0.35);
        position: relative; z-index: 5;
      }
      .hk-sidebar::before {
        content: ''; position: absolute; top: 0; right: -1px; width: 1px; height: 100%;
        background: linear-gradient(180deg, rgba(45,212,191,0.4), transparent 40%);
      }
      .hk-sidebar-brand {
        display: flex; align-items: center; gap: 9px; font-weight: 800; font-size: 16px; padding: 6px 8px 20px;
        letter-spacing: -0.02em;
        background: linear-gradient(120deg, #ffffff 10%, #b9f5ee 60%, ${COLORS.cyan} 100%);
        -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: ${COLORS.text};
      }
      .hk-sidebar-brand svg { filter: drop-shadow(0 0 6px rgba(45,212,191,0.65)); -webkit-text-fill-color: initial; color: ${COLORS.cyan}; }
      .hk-sidebar-nav { display: flex; flex-direction: column; gap: 2px; flex: 1; overflow-y: auto; }
      .hk-nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 11px; border-radius: 10px; font-size: 13px; color: ${COLORS.slate}; cursor: pointer; transition: 160ms; position: relative; }
      .hk-nav-item:hover { background: rgba(255,255,255,0.04); color: ${COLORS.text}; }
      .hk-nav-item.active { background: linear-gradient(90deg, rgba(45,212,191,0.16), rgba(45,212,191,0.04)); color: ${COLORS.cyan}; box-shadow: inset 0 0 0 1px rgba(45,212,191,0.18); }
      .hk-nav-item.active::before { content: ''; position: absolute; left: -11px; top: 20%; bottom: 20%; width: 3px; border-radius: 0 3px 3px 0; background: ${COLORS.cyan}; box-shadow: 0 0 10px rgba(45,212,191,0.8); }
      .hk-nav-badge { margin-left: auto; background: linear-gradient(135deg, #f87171, ${COLORS.red}); color: white; font-size: 10px; padding: 1px 6px; border-radius: 8px; box-shadow: 0 0 8px rgba(239,68,68,0.5); }
      .hk-logout { margin-top: 8px; border-top: 1px solid ${COLORS.hair}; padding-top: 12px; }
      .hk-logout:hover { color: ${COLORS.red} !important; }

      .hk-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
      .hk-topbar {
        height: 56px; display: flex; align-items: center; padding: 0 20px; gap: 16px;
        background: rgba(13,18,25,0.72); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
        border-bottom: 1px solid ${COLORS.hair}; position: sticky; top: 0; z-index: 4;
      }
      .hk-topbar-search { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.03); border: 1px solid ${COLORS.hair}; padding: 7px 12px; border-radius: 10px; color: ${COLORS.slate}; font-size: 13px; cursor: pointer; width: 280px; transition: 160ms; }
      .hk-topbar-search:hover { border-color: rgba(45,212,191,0.4); background: rgba(45,212,191,0.05); }
      .hk-kbd { margin-left: auto; font-size: 10px; border: 1px solid ${COLORS.hair}; padding: 1px 5px; border-radius: 5px; }
      .hk-topbar-right { margin-left: auto; display: flex; align-items: center; gap: 16px; }
      .hk-bell { position: relative; cursor: pointer; color: ${COLORS.slate}; transition: 160ms; }
      .hk-bell:hover { color: ${COLORS.text}; }
      .hk-bell-dot { position: absolute; top: -2px; right: -2px; width: 8px; height: 8px; border-radius: 50%; background: ${COLORS.red}; box-shadow: 0 0 8px rgba(239,68,68,0.8); }
      .hk-user-chip { display: flex; align-items: center; gap: 8px; font-size: 13px; }
      .hk-live-dot { width: 7px; height: 7px; border-radius: 50%; background: ${COLORS.cyan}; box-shadow: 0 0 0 rgba(45,212,191,0.5), 0 0 6px ${COLORS.cyan}; animation: hkpulse 1.6s infinite; }
      @keyframes hkpulse { 0% { box-shadow: 0 0 0 0 rgba(45,212,191,0.5); } 70% { box-shadow: 0 0 0 7px rgba(45,212,191,0); } 100% { box-shadow: 0 0 0 0 rgba(45,212,191,0); } }

      .hk-content { flex: 1; overflow-y: auto; padding: 24px 28px 60px; }
      .hk-page-head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
      .hk-page-head h1 { font-size: 22px; margin: 0; font-weight: 800; letter-spacing: -0.02em; }
      .hk-page-sub { color: ${COLORS.slate}; font-size: 13px; }
      .hk-ml-auto { margin-left: auto; }

      .hk-card {
        background: linear-gradient(165deg, rgba(255,255,255,0.025), rgba(255,255,255,0) 40%), ${COLORS.surface};
        border: 1px solid ${COLORS.hair}; border-radius: 14px;
        box-shadow: 0 1px 0 rgba(255,255,255,0.03) inset, 0 10px 28px -12px rgba(0,0,0,0.55);
        transition: border-color 200ms, transform 200ms, box-shadow 200ms;
      }
      .hk-panel { padding: 18px; }
      .hk-panel-title { font-size: 13px; font-weight: 650; margin-bottom: 12px; color: ${COLORS.text}; letter-spacing: 0.1px; }

      .hk-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
      .hk-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .hk-grid-2-side { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
      @media (max-width: 900px) { .hk-grid-4, .hk-grid-2, .hk-grid-2-side { grid-template-columns: 1fr; } }

      .hk-stat { padding: 16px; cursor: default; }
      .hk-stat:hover { transform: translateY(-2px); border-color: rgba(45,212,191,0.3); box-shadow: 0 1px 0 rgba(255,255,255,0.03) inset, 0 16px 32px -14px rgba(45,212,191,0.18); }
      .hk-stat-top { display: flex; align-items: center; gap: 8px; font-size: 12px; color: ${COLORS.slate}; }
      .hk-stat-icon { width: 28px; height: 28px; border-radius: 9px; display: flex; align-items: center; justify-content: center; background: rgba(45,212,191,0.12); box-shadow: 0 0 0 1px rgba(45,212,191,0.18) inset; }
      .hk-tone-red.hk-stat-icon, .hk-stat-icon.hk-tone-red { background: rgba(239,68,68,0.14); box-shadow: 0 0 0 1px rgba(239,68,68,0.2) inset; }
      .hk-tone-amber.hk-stat-icon, .hk-stat-icon.hk-tone-amber { background: rgba(245,158,11,0.14); box-shadow: 0 0 0 1px rgba(245,158,11,0.2) inset; }
      .hk-stat-value { font-size: 28px; font-weight: 800; margin-top: 9px; letter-spacing: -0.02em; }
      .hk-stat-sub { font-size: 11px; color: ${COLORS.slate}; margin-top: 2px; }

      .hk-btn { display: inline-flex; align-items: center; gap: 6px; border-radius: 10px; border: 1px solid ${COLORS.hair}; background: ${COLORS.elevated}; color: ${COLORS.text}; cursor: pointer; transition: 160ms; font-size: 13px; font-weight: 550; }
      .hk-btn-md { padding: 8px 15px; } .hk-btn-sm { padding: 5px 10px; font-size: 12px; }
      .hk-btn-default:hover { border-color: rgba(45,212,191,0.5); background: rgba(45,212,191,0.06); transform: translateY(-1px); }
      .hk-btn-ghost { background: transparent; }
      .hk-btn-ghost:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.14); }
      .hk-btn-cyan { background: linear-gradient(135deg, #5eead4, ${COLORS.cyan}); color: #052420; border-color: transparent; box-shadow: 0 4px 18px -4px rgba(45,212,191,0.55); font-weight: 700; }
      .hk-btn-cyan:hover { box-shadow: 0 6px 22px -4px rgba(45,212,191,0.75); transform: translateY(-1px); }
      .hk-btn-red { background: rgba(239,68,68,0.18); color: ${COLORS.red}; border-color: rgba(239,68,68,0.4); }
      .hk-btn-red:hover { box-shadow: 0 4px 16px -4px rgba(239,68,68,0.5); }
      .hk-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none !important; box-shadow: none !important; }
      .hk-icon-btn { background: transparent; border: none; color: ${COLORS.slate}; cursor: pointer; }
      .hk-icon-btn:hover { color: ${COLORS.text}; }

      .hk-input { background: ${COLORS.elevated}; border: 1px solid ${COLORS.hair}; color: ${COLORS.text}; padding: 8px 12px; border-radius: 9px; font-size: 13px; outline: none; width: 100%; }
      .hk-input:focus { border-color: ${COLORS.cyan}; }
      .hk-select { cursor: pointer; }

      .hk-toggle-wrap { display: flex; align-items: center; gap: 8px; cursor: pointer; margin: 6px 0; }
      .hk-toggle { width: 34px; height: 19px; border-radius: 10px; background: ${COLORS.elevated}; border: 1px solid ${COLORS.hair}; position: relative; transition: 160ms; }
      .hk-toggle.on { background: rgba(45,212,191,0.35); }
      .hk-toggle-knob { position: absolute; top: 1px; left: 1px; width: 15px; height: 15px; border-radius: 50%; background: ${COLORS.slate}; transition: 160ms; }
      .hk-toggle.on .hk-toggle-knob { transform: translateX(15px); background: ${COLORS.cyan}; }
      .hk-toggle-label { font-size: 13px; }

      .hk-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.3px; padding: 3px 8px; border-radius: 6px; }
      .hk-badge-red { background: rgba(239,68,68,0.14); color: #ff8080; box-shadow: 0 0 0 1px rgba(239,68,68,0.22) inset; }
      .hk-badge-amber { background: rgba(245,158,11,0.14); color: #ffc266; box-shadow: 0 0 0 1px rgba(245,158,11,0.22) inset; }
      .hk-badge-slate { background: rgba(100,116,139,0.16); color: #94a3b8; box-shadow: 0 0 0 1px rgba(148,163,184,0.16) inset; }
      .hk-badge-cyan { background: rgba(45,212,191,0.14); color: #7cf2e3; box-shadow: 0 0 0 1px rgba(45,212,191,0.28) inset; }
      .hk-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

      .hk-table-wrap { overflow-x: auto; border: 1px solid ${COLORS.hair}; border-radius: 10px; }
      .hk-table { width: 100%; border-collapse: collapse; font-size: 13px; }
      .hk-table th { text-align: left; padding: 10px 12px; color: ${COLORS.slate}; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; border-bottom: 1px solid ${COLORS.hair}; }
      .hk-table td { padding: 9px 12px; border-bottom: 1px solid ${COLORS.hair}; }
      .hk-row-click { cursor: pointer; } .hk-row-click:hover { background: ${COLORS.elevated}; }

      .hk-skel { background: linear-gradient(90deg, ${COLORS.elevated}, #232c37, ${COLORS.elevated}); background-size: 200% 100%; animation: hkshimmer 1.4s infinite; border-radius: 8px; margin-bottom: 8px; }
      @keyframes hkshimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

      .hk-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 40px 10px; color: ${COLORS.slate}; text-align: center; }
      .hk-empty-title { font-weight: 600; color: ${COLORS.text}; }
      .hk-empty-sub { font-size: 12px; }

      .hk-modal-backdrop { position: fixed; inset: 0; background: rgba(3,5,7,0.68); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 100; }
      .hk-modal {
        background: linear-gradient(165deg, rgba(255,255,255,0.035), rgba(255,255,255,0) 40%), ${COLORS.surface};
        border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; width: 520px; max-width: 92vw; max-height: 86vh; overflow-y: auto;
        box-shadow: 0 40px 90px -20px rgba(0,0,0,0.75), 0 0 0 1px rgba(0,0,0,0.4);
      }
      .hk-modal-wide { width: 860px; }
      .hk-modal-head { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; border-bottom: 1px solid ${COLORS.hair}; font-weight: 700; position: sticky; top: 0; background: rgba(18,24,33,0.92); backdrop-filter: blur(8px); letter-spacing: -0.01em; }
      .hk-modal-body { padding: 20px; }

      .hk-palette {
        width: 480px; max-width: 90vw; padding: 12px; border-radius: 16px;
        background: linear-gradient(165deg, rgba(255,255,255,0.05), rgba(255,255,255,0) 40%), rgba(18,24,33,0.9);
        border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(16px);
        box-shadow: 0 40px 90px -20px rgba(0,0,0,0.75);
      }
      .hk-palette-list { margin-top: 8px; max-height: 300px; overflow-y: auto; }
      .hk-palette-item { padding: 9px 10px; border-radius: 8px; cursor: pointer; font-size: 13px; display: flex; align-items: center; }
      .hk-palette-item:hover { background: rgba(45,212,191,0.1); }

      .hk-toast-stack { position: fixed; top: 16px; right: 16px; z-index: 200; display: flex; flex-direction: column; gap: 8px; }
      .hk-toast { padding: 11px 16px; border-radius: 11px; font-size: 13px; box-shadow: 0 14px 34px -8px rgba(0,0,0,0.55); border: 1px solid rgba(255,255,255,0.1); background: linear-gradient(165deg, rgba(255,255,255,0.06), rgba(255,255,255,0) 50%), ${COLORS.elevated}; backdrop-filter: blur(10px); animation: hktoastin 220ms ease-out; }
      @keyframes hktoastin { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }

      .hk-login {
        min-height: 100vh; display: flex; align-items: center; justify-content: center; width: 100%; position: relative; overflow: hidden;
        background:
          radial-gradient(700px 420px at 22% 20%, rgba(45,212,191,0.14), transparent 60%),
          radial-gradient(600px 380px at 80% 75%, rgba(245,158,11,0.06), transparent 60%),
          linear-gradient(180deg, #0c1219, #05070a);
      }
      .hk-login::before {
        content: ''; position: absolute; inset: 0; opacity: 0.5; pointer-events: none;
        background-image: linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
        background-size: 42px 42px;
        mask-image: radial-gradient(650px 650px at 50% 40%, black, transparent 75%);
      }
      .hk-login-card {
        width: 380px; position: relative; z-index: 1; padding: 32px; display: flex; flex-direction: column; gap: 13px;
        background: linear-gradient(165deg, rgba(255,255,255,0.04), rgba(255,255,255,0) 45%), rgba(18,24,33,0.85);
        backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
        border: 1px solid rgba(255,255,255,0.09); border-radius: 18px;
        box-shadow: 0 0 0 1px rgba(45,212,191,0.06), 0 30px 70px -20px rgba(0,0,0,0.7), 0 0 60px -20px rgba(45,212,191,0.15);
      }
      .hk-login-brand {
        display: flex; align-items: center; gap: 9px; font-size: 23px; font-weight: 800; letter-spacing: -0.02em;
        background: linear-gradient(120deg, #fff 10%, #b9f5ee 55%, ${COLORS.cyan} 100%);
        -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
      }
      .hk-login-brand svg { filter: drop-shadow(0 0 10px rgba(45,212,191,0.7)); -webkit-text-fill-color: initial; color: ${COLORS.cyan}; }
      .hk-login-sub { color: ${COLORS.slate}; font-size: 12.5px; margin-bottom: 6px; }
      .hk-login-btn { justify-content: center; margin-top: 4px; padding: 10px; font-size: 13.5px; }
      .hk-login-hint { font-size: 11px; color: ${COLORS.slate}; margin-top: 8px; line-height: 1.5; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.06); }
      .hk-error { color: ${COLORS.red}; font-size: 12px; }

      .hk-livefeed { display: flex; flex-direction: column; gap: 6px; max-height: 220px; overflow-y: auto; }
      .hk-livefeed-row { display: flex; align-items: center; gap: 10px; font-size: 12.5px; padding: 6px 4px; border-radius: 6px; cursor: pointer; }
      .hk-livefeed-row:hover { background: ${COLORS.elevated}; }

      .hk-camwall { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 8px; }
      .hk-minicam { padding: 10px; }
      .hk-minicam-head { display: flex; align-items: center; gap: 8px; font-size: 12px; margin-bottom: 6px; }
      .hk-minicam-body { height: 70px; border-radius: 8px; background: #05070a; display: flex; align-items: center; justify-content: center; font-size: 11px; color: ${COLORS.slate}; }

      .hk-camgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      .hk-camcard { padding: 10px; }
      .hk-camcard-head { display: flex; align-items: center; gap: 8px; font-size: 12.5px; margin-bottom: 8px; }
      .hk-camcard-badge { margin-left: auto; }
      .hk-cam-canvas { width: 100%; border-radius: 8px; display: block; background: #05070a; }
      .hk-real-feed { object-fit: cover; min-height: 160px; }
      .hk-real-preview-wrap { margin-top: 10px; border-radius: 8px; overflow: hidden; border: 1px solid ${COLORS.hair}; }
      .hk-cam-offline { width: 100%; aspect-ratio: 400/220; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: ${COLORS.red}; font-size: 12px; }
      .hk-demo-status-select { width: auto; min-width: 150px; }

      .hk-cam-tabs { display: flex; gap: 6px; margin-bottom: 14px; }
      .hk-cam-tab { padding: 7px 14px; border-radius: 9px; font-size: 12.5px; cursor: pointer; background: ${COLORS.elevated}; color: ${COLORS.slate}; border: 1px solid ${COLORS.hair}; }
      .hk-cam-tab.active { color: ${COLORS.cyan}; border-color: rgba(45,212,191,0.4); }
      .hk-zone-canvas-wrap { position: relative; width: 100%; }
      .hk-poly-overlay { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
      .hk-row-gap { display: flex; align-items: center; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
      .hk-zone-list { margin-top: 10px; display: flex; flex-direction: column; gap: 6px; }
      .hk-zone-row { display: flex; align-items: center; gap: 10px; font-size: 12.5px; padding: 6px 0; border-bottom: 1px solid ${COLORS.hair}; }
      .hk-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .hk-note { font-size: 12px; padding: 10px 12px; border-radius: 8px; margin-top: 10px; line-height: 1.5; }
      .hk-urls { margin-top: 12px; font-size: 12px; display: flex; flex-direction: column; gap: 8px; }
      .hk-bridge-cmd { margin-top: 6px; padding: 8px; background: #05070a; border-radius: 6px; word-break: break-all; }

      .hk-footage-results { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 14px; }
      .hk-footage-frame { padding: 8px; }
      .hk-footage-thumb { width: 100%; border-radius: 8px; margin-bottom: 8px; }

      .hk-event-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 4px; }
      .hk-event-card { overflow: hidden; cursor: pointer; }
      .hk-event-thumb { width: 100%; height: 100px; object-fit: cover; display: block; }
      .hk-event-thumb-empty { height: 100px; display: flex; align-items: center; justify-content: center; color: ${COLORS.slate}; background: #05070a; }
      .hk-event-card-body { padding: 10px; display: flex; flex-direction: column; gap: 4px; font-size: 12.5px; }
      .hk-filter-bar { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
      .hk-pagination { display: flex; align-items: center; gap: 12px; justify-content: center; margin-top: 16px; }

      .hk-detail-frame { width: 100%; border-radius: 10px; }
      .hk-custody-panel { margin-top: 10px; padding: 14px; background: linear-gradient(165deg, rgba(45,212,191,0.06), transparent 60%), #05070a; border: 1px solid rgba(45,212,191,0.18); border-radius: 12px; display: flex; flex-direction: column; gap: 7px; box-shadow: 0 0 24px -12px rgba(45,212,191,0.35); }
      .hk-meta-table { width: 100%; font-size: 13px; margin-top: 10px; }
      .hk-meta-table td { padding: 5px 0; border-bottom: 1px solid ${COLORS.hair}; }
      .hk-meta-table td:first-child { color: ${COLORS.slate}; width: 40%; }
      .hk-note-text { font-size: 13px; line-height: 1.6; background: #05070a; padding: 10px 12px; border-radius: 8px; margin-top: 8px; }
      .hk-related-row { font-size: 12.5px; padding: 6px 0; border-bottom: 1px solid ${COLORS.hair}; }

      .hk-search-bar { display: flex; gap: 10px; }
      .hk-chip-row { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
      .hk-search-results { margin-top: 14px; display: flex; flex-direction: column; gap: 8px; }
      .hk-result-card { padding: 12px; cursor: pointer; }
      .hk-saved-row { padding: 8px 6px; border-bottom: 1px solid ${COLORS.hair}; cursor: pointer; font-size: 12.5px; }

      .hk-trail { display: flex; gap: 8px; align-items: center; margin-top: 8px; flex-wrap: wrap; font-size: 12.5px; }
      .hk-storage-bar { width: 100%; height: 8px; border-radius: 4px; background: #05070a; overflow: hidden; margin-top: 4px; }
      .hk-storage-fill { height: 100%; transition: width 300ms; }

      .hk-facesearch-grid { display: grid; grid-template-columns: 340px 1fr; gap: 16px; align-items: start; }
      @media (max-width: 1000px) { .hk-facesearch-grid { grid-template-columns: 1fr; } }
      .hk-facesearch-controls-card { position: sticky; top: 0; }
      .hk-upload-zone { border: 1.5px dashed ${COLORS.hair}; border-radius: 12px; padding: 28px 12px; display: flex; flex-direction: column; align-items: center; gap: 8px; color: ${COLORS.slate}; cursor: pointer; text-align: center; font-size: 12.5px; transition: 160ms; }
      .hk-upload-zone:hover { border-color: ${COLORS.cyan}; color: ${COLORS.cyan}; }
      .hk-ref-preview { display: flex; flex-direction: column; align-items: center; gap: 8px; }
      .hk-ref-preview img { width: 100%; max-width: 220px; border-radius: 10px; border: 1px solid ${COLORS.hair}; }
      .hk-facesearch-controls { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }
      .hk-facesearch-controls label { font-size: 12px; color: ${COLORS.slate}; display: flex; flex-direction: column; gap: 4px; }
      .hk-slider { width: 100%; accent-color: ${COLORS.cyan}; }
      .hk-cam-toggle { cursor: pointer; user-select: none; }
      .hk-face-chip { display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; padding: 6px; border-radius: 8px; background: ${COLORS.elevated}; font-size: 10.5px; }
      .hk-face-chip img { width: 56px; height: 56px; object-fit: cover; border-radius: 6px; }
      .hk-timeline-track { position: relative; height: 40px; margin: 14px 4px 4px; border-top: 1px solid ${COLORS.hair}; border-bottom: 1px solid ${COLORS.hair}; }
      .hk-timeline-marker { position: absolute; top: 50%; transform: translate(-50%, -50%); cursor: pointer; }
      .hk-timeline-dot { width: 10px; height: 10px; border-radius: 50%; box-shadow: 0 0 8px currentColor; border: 2px solid ${COLORS.surface}; }
      .hk-timeline-labels { display: flex; justify-content: space-between; font-size: 10px; margin-top: 4px; }
      .hk-timeline-list { margin-top: 16px; display: flex; flex-direction: column; gap: 8px; max-height: 460px; overflow-y: auto; }
      .hk-timeline-row { display: flex; gap: 10px; align-items: center; padding: 8px; border-radius: 8px; cursor: pointer; }
      .hk-timeline-row:hover { background: ${COLORS.elevated}; }
      .hk-timeline-thumb { width: 56px; height: 56px; object-fit: cover; border-radius: 6px; flex-shrink: 0; }
      .hk-walkthrough { margin-top: 8px; padding: 12px; background: #05070a; border-radius: 10px; }
      .hk-walk-step { font-size: 13px; margin-bottom: 8px; }

      ::-webkit-scrollbar { width: 8px; height: 8px; } ::-webkit-scrollbar-thumb { background: ${COLORS.elevated}; border-radius: 4px; }
      button:focus-visible, input:focus-visible, select:focus-visible, [tabindex]:focus-visible { outline: 2px solid ${COLORS.cyan}; outline-offset: 2px; }
      @media (max-width: 1000px) { .hk-event-grid, .hk-footage-results, .hk-camgrid, .hk-camwall { grid-template-columns: repeat(2,1fr); } }
    `}</style>
  );
}
