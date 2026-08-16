import { useState } from "react";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { 
  Cpu, 
  Save, 
  Check, 
  User, 
  Eye, 
  Bell,
  Key,
  ShieldCheck,
  AlertCircle
} from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "models" | "hardware" | "routing">("profile");
  const [saved, setSaved] = useState(false);

  // Profile States
  const [operatorName, setOperatorName] = useState("Command Officer");
  const [operatorHandle, setOperatorHandle] = useState("admin_hawk");
  const [autoLockMinutes, setAutoLockMinutes] = useState(15);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);

  // Password Change States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Model States
  const [yoloWeights, setYoloWeights] = useState("yolov8x-surveillance.pt");
  const [confidenceThreshold, setConfidenceThreshold] = useState(85);
  const [bytetrackIoU, setBytetrackIoU] = useState(0.7);
  const [ocrConfidence, setOcrConfidence] = useState(88);

  // Hardware States
  const [cudaEnabled, setCudaEnabled] = useState(true);
  const [tensorRtFp16, setTensorRtFp16] = useState(true);
  const [targetFps, setTargetFps] = useState("60 FPS");

  // Routing States
  const [webhookUrl, setWebhookUrl] = useState("https://hooks.hawk-i.security/alerts/v1");
  const [notifyCritical, setNotifyCritical] = useState(true);
  const [notifyWarning, setNotifyWarning] = useState(true);
  const [slackChannel, setSlackChannel] = useState("#sec-ops-hawk-i");

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (!currentPassword) {
      setPasswordMsg({ type: "error", text: "Please enter your current access key." });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "New access key must be at least 6 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "New access keys do not match." });
      return;
    }

    setIsUpdatingPassword(true);
    setTimeout(() => {
      setIsUpdatingPassword(false);
      setPasswordMsg({ type: "success", text: "Access key and credentials successfully updated." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }, 800);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-hawk-sapphire animate-pulse" />
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-hawk-muted">
              SYSTEM ENGINE & ATTRIBUTION MATRIX
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-display font-extrabold text-white tracking-tight">
            System Settings
          </h1>
          <p className="text-sm text-hawk-muted font-sans mt-1">
            Configure operator clearances, credentials, vision model weights, and encrypted alert dispatches
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={saved ? <Check className="h-3.5 w-3.5 text-hawk-emerald" /> : <Save className="h-3.5 w-3.5" />}
          onClick={handleSave}
        >
          {saved ? "CONFIG SAVED" : "SAVE CONFIG"}
        </Button>
      </div>

      {/* Settings Navigation Tabs - Full Width Balanced Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-1.5 rounded-2xl bg-[#0C0E14]/80 border border-white/[0.08]">
        {[
          { id: "profile", label: "Operator & Credentials", icon: User },
          { id: "models", label: "Vision Neural Models", icon: Eye },
          { id: "hardware", label: "CUDA Hardware Engine", icon: Cpu },
          { id: "routing", label: "Alert Dispatches & SIEM", icon: Bell },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-xs font-mono font-bold transition-all text-center cursor-pointer ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-hawk-sapphire/30 to-hawk-sapphire/15 text-white border border-hawk-sapphire/50 shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                  : "text-hawk-muted hover:text-white hover:bg-white/[0.03] border border-transparent"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Operator Profile & Security Credentials */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          
          {/* Operator Profile Information */}
          <Card padding="lg" glowColor="burgundy" className="space-y-6">
            <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4">
              <div className="p-2.5 rounded-xl bg-hawk-burgundy/10 border border-hawk-burgundy/20 text-hawk-burgundy">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-display font-bold text-white">
                  Operator Profile & Clearance Policies
                </h3>
                <p className="text-xs text-hawk-muted font-sans mt-0.5">
                  Session lifetime, physical security clearance, and access credentials
                </p>
              </div>
            </div>

            <div className="space-y-6 text-xs font-mono">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-white/[0.04] pb-6">
                <div className="space-y-2">
                  <label className="text-white font-bold block text-xs tracking-wider">
                    Operator Full Name
                  </label>
                  <input
                    type="text"
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-xs text-white font-sans outline-none focus:border-hawk-sapphire transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-white font-bold block text-xs tracking-wider">
                    Security Handle
                  </label>
                  <input
                    type="text"
                    value={operatorHandle}
                    onChange={(e) => setOperatorHandle(e.target.value)}
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-xs text-white font-mono outline-none focus:border-hawk-sapphire transition-colors"
                  />
                </div>
              </div>

              {/* Session Auto-Lock */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.04] pb-6">
                <div className="space-y-1">
                  <span className="text-white font-bold text-sm block">Session Inactivity Auto-Lock</span>
                  <p className="text-xs text-hawk-muted font-sans">Automatically locks the surveillance console after operator inactivity</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-display font-bold text-white tabular-nums">{autoLockMinutes} MIN</span>
                  <input
                    type="range"
                    min={5}
                    max={60}
                    step={5}
                    value={autoLockMinutes}
                    onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
                    className="w-40 accent-hawk-burgundy cursor-pointer"
                  />
                </div>
              </div>

              {/* 2FA Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-white font-bold text-sm block">Multi-Factor Hardware Key (2FA / FIDO2)</span>
                  <p className="text-xs text-hawk-muted font-sans">Require biometric or TOTP authorization on every session login</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={twoFactorEnabled ? "emerald" : "neutral"} size="sm" dot>
                    {twoFactorEnabled ? "ENFORCED" : "DISABLED"}
                  </Badge>
                  <button
                    onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                    className={`w-12 h-6 rounded-full border transition-all relative cursor-pointer ${
                      twoFactorEnabled ? "bg-hawk-emerald/20 border-hawk-emerald" : "bg-white/5 border-white/20"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full absolute top-1/2 -translate-y-1/2 transition-all ${
                        twoFactorEnabled ? "right-1 bg-hawk-emerald shadow-[0_0_10px_rgba(16,185,129,0.8)]" : "left-1 bg-white/40"
                      }`}
                    />
                  </button>
                </div>
              </div>

            </div>
          </Card>

          {/* Security Credentials & Password Update Suite */}
          <Card padding="lg" glowColor="sapphire" className="space-y-6">
            <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4">
              <div className="p-2.5 rounded-xl bg-hawk-sapphire/10 border border-hawk-sapphire/20 text-hawk-sapphire">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-display font-bold text-white">
                  Security Credentials & Password Management
                </h3>
                <p className="text-xs text-hawk-muted font-sans mt-0.5">
                  Update operator password, rotate cryptographic access keys, and invalidate active sessions
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                <div className="space-y-2">
                  <label className="text-white font-bold block text-xs tracking-wider">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-xs text-white font-sans outline-none focus:border-hawk-sapphire transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-white font-bold block text-xs tracking-wider">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-xs text-white font-sans outline-none focus:border-hawk-sapphire transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-white font-bold block text-xs tracking-wider">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-xs text-white font-sans outline-none focus:border-hawk-sapphire transition-colors"
                  />
                </div>

              </div>

              {/* Password Feedback Alert */}
              {passwordMsg && (
                <div className={`p-3 rounded-xl border text-xs font-sans flex items-center gap-2 ${
                  passwordMsg.type === "success" 
                    ? "bg-hawk-emerald/10 border-hawk-emerald/30 text-hawk-emerald" 
                    : "bg-hawk-burgundy/10 border-hawk-burgundy/30 text-hawk-burgundy"
                }`}>
                  {passwordMsg.type === "success" ? <ShieldCheck className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                  <span>{passwordMsg.text}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isUpdatingPassword}
                  icon={<Key className="h-3.5 w-3.5" />}
                >
                  UPDATE CREDENTIALS
                </Button>
              </div>
            </form>
          </Card>

        </div>
      )}

      {/* Tab 2: Vision Neural Models */}
      {activeTab === "models" && (
        <Card padding="lg" glowColor="sapphire" className="space-y-6">
          <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4">
            <div className="p-2.5 rounded-xl bg-hawk-sapphire/10 border border-hawk-sapphire/20 text-hawk-sapphire">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-display font-bold text-white">
                Vision AI Model Weights & Neural Sensitivity
              </h3>
              <p className="text-xs text-hawk-muted font-sans mt-0.5">
                Adjust confidence thresholds, tracking IoU, and difference filters per neural pipeline
              </p>
            </div>
          </div>

          <div className="space-y-6 text-xs font-mono">
            
            {/* YOLOv8 Weights Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.04] pb-6">
              <div className="space-y-1">
                <span className="text-white font-bold text-sm block">Primary Object Detection Weights</span>
                <p className="text-xs text-hawk-muted font-sans">Active backbone model for person, vehicle, and weapon detection</p>
              </div>
              <select
                value={yoloWeights}
                onChange={(e) => setYoloWeights(e.target.value)}
                className="bg-black/60 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white font-mono outline-none focus:border-hawk-sapphire cursor-pointer"
              >
                <option value="yolov8x-surveillance.pt">YOLOv8x Surveillance (Extra Large - 99.4% mAP)</option>
                <option value="yolov8l-threat.pt">YOLOv8l Threat Matrix (Large - 98.6% mAP)</option>
                <option value="yolov8m-realtime.pt">YOLOv8m Realtime (Medium - 60 FPS)</option>
              </select>
            </div>

            {/* Global Confidence Slider */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.04] pb-6">
              <div className="space-y-1">
                <span className="text-white font-bold text-sm block">Global Confidence Threshold</span>
                <p className="text-xs text-hawk-muted font-sans">Minimum AI certainty required before flagging an anomaly</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xl font-display font-bold text-hawk-sapphire tabular-nums">{confidenceThreshold}%</span>
                <input
                  type="range"
                  min={50}
                  max={99}
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                  className="w-40 accent-hawk-sapphire cursor-pointer"
                />
              </div>
            </div>

            {/* ByteTrack IoU */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.04] pb-6">
              <div className="space-y-1">
                <span className="text-white font-bold text-sm block">ByteTrack Trajectory IoU Association</span>
                <p className="text-xs text-hawk-muted font-sans">Bounding box intersection threshold for multi-frame vehicle velocity tracking</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xl font-display font-bold text-hawk-emerald tabular-nums">{bytetrackIoU.toFixed(2)}</span>
                <input
                  type="range"
                  min={0.3}
                  max={0.95}
                  step={0.05}
                  value={bytetrackIoU}
                  onChange={(e) => setBytetrackIoU(Number(e.target.value))}
                  className="w-40 accent-hawk-emerald cursor-pointer"
                />
              </div>
            </div>

            {/* OCR License Plate Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-white font-bold text-sm block">ANPR OCR Character Match Threshold</span>
                <p className="text-xs text-hawk-muted font-sans">Minimum certainty percentage for alphanumeric plate extraction</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xl font-display font-bold text-hawk-amber tabular-nums">{ocrConfidence}%</span>
                <input
                  type="range"
                  min={60}
                  max={99}
                  value={ocrConfidence}
                  onChange={(e) => setOcrConfidence(Number(e.target.value))}
                  className="w-40 accent-hawk-amber cursor-pointer"
                />
              </div>
            </div>

          </div>
        </Card>
      )}

      {/* Tab 3: CUDA Hardware Engine */}
      {activeTab === "hardware" && (
        <Card padding="lg" glowColor="emerald" className="space-y-6">
          <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4">
            <div className="p-2.5 rounded-xl bg-hawk-emerald/10 border border-hawk-emerald/20 text-hawk-emerald">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-display font-bold text-white">
                NVIDIA CUDA & TensorRT Acceleration Engine
              </h3>
              <p className="text-xs text-hawk-muted font-sans mt-0.5">
                GPU hardware acceleration, half-precision FP16 inference, and VRAM allocations
              </p>
            </div>
          </div>

          <div className="space-y-6 text-xs font-mono">
            
            {/* CUDA 12.4 Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.04] pb-6">
              <div className="space-y-1">
                <span className="text-white font-bold text-sm block">NVIDIA CUDA 12.4 Driver Acceleration</span>
                <p className="text-xs text-hawk-muted font-sans">Execute vision tensor graphs directly on GPU CUDA cores</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={cudaEnabled ? "emerald" : "neutral"} size="sm" dot>
                  {cudaEnabled ? "ACTIVE (CUDA 12.4)" : "CPU FALLBACK"}
                </Badge>
                <button
                  onClick={() => setCudaEnabled(!cudaEnabled)}
                  className={`w-12 h-6 rounded-full border transition-all relative cursor-pointer ${
                    cudaEnabled ? "bg-hawk-emerald/20 border-hawk-emerald" : "bg-white/5 border-white/20"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full absolute top-1/2 -translate-y-1/2 transition-all ${
                      cudaEnabled ? "right-1 bg-hawk-emerald shadow-[0_0_10px_rgba(16,185,129,0.8)]" : "left-1 bg-white/40"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* TensorRT FP16 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.04] pb-6">
              <div className="space-y-1">
                <span className="text-white font-bold text-sm block">TensorRT FP16 Precision Mode</span>
                <p className="text-xs text-hawk-muted font-sans">Quantize model layers to FP16 for 2.4x throughput increase</p>
              </div>
              <button
                onClick={() => setTensorRtFp16(!tensorRtFp16)}
                className={`w-12 h-6 rounded-full border transition-all relative cursor-pointer ${
                  tensorRtFp16 ? "bg-hawk-sapphire/20 border-hawk-sapphire" : "bg-white/5 border-white/20"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full absolute top-1/2 -translate-y-1/2 transition-all ${
                    tensorRtFp16 ? "right-1 bg-hawk-sapphire shadow-[0_0_10px_rgba(59,130,246,0.8)]" : "left-1 bg-white/40"
                  }`}
                />
              </button>
            </div>

            {/* Target FPS */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-white font-bold text-sm block">Optical Stream Target Frame Rate</span>
                <p className="text-xs text-hawk-muted font-sans">Maximum camera ingestion frame rate per optical channel</p>
              </div>
              <div className="flex gap-2">
                {["30 FPS", "60 FPS", "120 FPS (High-Speed)"].map((fps) => (
                  <button
                    key={fps}
                    onClick={() => setTargetFps(fps)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
                      targetFps === fps
                        ? "bg-hawk-emerald/20 border-hawk-emerald text-white font-bold"
                        : "bg-white/[0.02] border-white/10 text-hawk-muted hover:text-white"
                    }`}
                  >
                    {fps}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </Card>
      )}

      {/* Tab 4: Alert Dispatches & SIEM */}
      {activeTab === "routing" && (
        <Card padding="lg" glowColor="sapphire" className="space-y-6">
          <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4">
            <div className="p-2.5 rounded-xl bg-hawk-sapphire/10 border border-hawk-sapphire/20 text-hawk-sapphire">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-display font-bold text-white">
                SIEM Alert Routing & Encrypted Webhooks
              </h3>
              <p className="text-xs text-hawk-muted font-sans mt-0.5">
                Dispatch verified threat alerts to Security Information & Event Management platforms
              </p>
            </div>
          </div>

          <div className="space-y-6 text-xs font-mono">
            
            {/* Webhook URL */}
            <div className="space-y-2 border-b border-white/[0.04] pb-6">
              <label className="text-white font-bold text-xs block tracking-wider">
                Encrypted Incident Webhook (SIEM / Slack / Telegram)
              </label>
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-xs text-white font-mono outline-none focus:border-hawk-sapphire transition-colors"
              />
            </div>

            {/* Slack Channel */}
            <div className="space-y-2 border-b border-white/[0.04] pb-6">
              <label className="text-white font-bold text-xs block tracking-wider">
                Dedicated Slack Dispatch Channel
              </label>
              <input
                type="text"
                value={slackChannel}
                onChange={(e) => setSlackChannel(e.target.value)}
                className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-xs text-white font-mono outline-none focus:border-hawk-sapphire transition-colors"
              />
            </div>

            {/* Trigger Thresholds */}
            <div className="space-y-3">
              <span className="text-white font-bold text-sm block">Active Dispatch Triggers</span>
              <div className="space-y-2.5">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyCritical}
                    onChange={(e) => setNotifyCritical(e.target.checked)}
                    className="h-4 w-4 rounded accent-hawk-burgundy cursor-pointer"
                  />
                  <span className="text-white font-sans text-xs">Dispatch immediately on Level 1 Critical Breaches (Intrusion, Weapons)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyWarning}
                    onChange={(e) => setNotifyWarning(e.target.checked)}
                    className="h-4 w-4 rounded accent-hawk-amber cursor-pointer"
                  />
                  <span className="text-white font-sans text-xs">Dispatch on Level 2 Warnings (Excessive Speeding &gt; 80km/h, Unattended Objects)</span>
                </label>
              </div>
            </div>

          </div>
        </Card>
      )}

    </div>
  );
}
