/**
 * SentinelVision / VIGINT API client
 * Default endpoint: http://localhost:8000
 */

export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type ApiError = Error & { status: number; isNetworkError?: boolean };

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const headers = new Headers(options?.headers || {});
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("visioncctv_token");
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch (err: unknown) {
    // Network-level failure (backend down, DNS, CORS, offline). Surface a typed
    // error instead of a fake empty object so callers don't cascade into
    // `undefined`/`NaN`. Callers that catch will keep their safe initial state.
    const e = new Error(
      `Cannot reach VisionCCTV backend at ${BASE_URL}. Is the server running?`
    ) as ApiError;
    e.status = 0;
    e.isNetworkError = true;
    throw e;
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err = new Error(body || `HTTP ${res.status}`) as ApiError;
    err.status = res.status;
    throw err;
  }
  // Tolerate empty / non-JSON bodies (e.g. 204 responses) without throwing.
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

// ─── Types ──────────────────────────────────────────

export interface VideoMeta {
  id: string;
  original_filename?: string;
  stored_filename?: string;
  filename?: string;
  camera_id: string;
  upload_time: number;
  size_bytes: number;
  duration_seconds: number | null;
  thumbnail_url?: string | null;
}

export interface ReferenceMeta {
  id: string;
  original_filename?: string;
  stored_filename?: string;
  label: string;
  upload_time: number;
  image_url?: string;
}

export interface MatchResult {
  camera_id: string;
  timestamp: number;
  timestamp_str: string;
  frame_url: string;
  all_frame_url?: string;
  modality_frame_url?: string;
  clip_url?: string;
  confidence: number;
  label: string;
  severity?: "P1" | "P2" | "P3" | "P4" | string;
  incident_type?: string;
  box?: { x1: number; y1: number; x2: number; y2: number; label?: string; confidence?: number };
  boxes?: Array<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    label?: string;
    confidence?: number;
    color_bgr?: number[];
  }>;
  detected_instances?: number;
  frame_hash?: string;
  clip_hash?: string;
  ocr_text?: string;
  detections?: Array<{
    class_name: string;
    confidence: number;
    box: { x1: number; y1: number; x2: number; y2: number };
  }>;
  object_count?: number;
  search_type?: string;
}

export interface SearchJob {
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  type: string;
  query?: string;
  source_module?: string;
  match_count: number;
  frames_processed?: number;
  frames_matched?: number;
  matches?: MatchResult[];
  error?: string;
  activity_data?: {
    heatmap_url?: string;
    total_frames_analyzed?: number;
    average_motion_intensity?: number;
    total_motion_events?: number;
    total_scene_changes?: number;
    max_persons_detected?: number;
    average_persons_per_frame?: number;
    total_crowd_events?: number;
    activity_level?: string;
  };
}

// ─── Camera Types ───────────────────────────────────

export interface CameraInfo {
  id: string;
  camera_id?: string;
  name: string;
  url: string;
  brand: string;
  is_connected: boolean;
  is_running?: boolean;
  detection_active?: boolean;
  width: number;
  height: number;
  fps: number;
  error?: string | null;
  added_at?: number;
  last_frame_age?: number | null;
}

export interface DiscoveredCamera {
  ip: string;
  port: number;
  url: string;
  brand: string;
  width: number;
  height: number;
  fps: number;
  credentials_used: string;
}

export interface DetectionAlert {
  id: string;
  camera_id: string;
  camera_name: string;
  timestamp: number;
  timestamp_str: string;
  detections: Array<{
    type: string;
    label: string;
    confidence: number;
    box: { x1: number; y1: number; x2: number; y2: number };
  }>;
  detection_count: number;
  snapshot_url: string;
}

// ─── Videos ─────────────────────────────────────────

export async function listVideos(): Promise<{ videos: VideoMeta[]; count: number }> {
  return apiFetch("/api/videos/list");
}

export async function uploadVideo(
  file: File,
  cameraId: string
): Promise<{ success: boolean; video: VideoMeta }> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("camera_id", cameraId);
  return apiFetch("/api/videos/upload", { method: "POST", body: fd });
}

export async function deleteVideo(id: string): Promise<void> {
  await apiFetch(`/api/videos/${id}`, { method: "DELETE" });
}

// ─── References ─────────────────────────────────────

export async function listReferences(): Promise<{ references: ReferenceMeta[]; count: number }> {
  try {
    const data = await apiFetch("/api/references/list") as any;
    return {
      references: Array.isArray(data?.references) ? data.references : [],
      count: data?.count ?? 0,
    };
  } catch {
    return { references: [], count: 0 };
  }
}

export async function uploadReference(
  file: File,
  label: string
): Promise<{ success: boolean; reference: ReferenceMeta }> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("label", label);
  return apiFetch("/api/references/upload", { method: "POST", body: fd });
}

export async function deleteReference(id: string): Promise<void> {
  await apiFetch(`/api/references/${id}`, { method: "DELETE" });
}

export async function addReferenceFromUrl(
  imageUrl: string,
  label: string = "Suspect",
  subjectType: string = "person"
): Promise<{ success: boolean; reference: ReferenceMeta }> {
  return apiFetch("/api/references/from-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, label, subject_type: subjectType }),
  });
}

// ─── Search ─────────────────────────────────────────

export async function startImageSearch(
  videoIds: string[],
  referenceIds: string[],
  confidenceThreshold = 0.65,
  similarityThreshold = 0.70,
  sampleFps = 1.0,
  startTime: number | null = null,
  endTime: number | null = null
): Promise<{ job_id: string; status: string }> {
  return apiFetch("/api/search/by-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      video_ids: videoIds,
      reference_ids: referenceIds,
      confidence_threshold: confidenceThreshold,
      similarity_threshold: similarityThreshold,
      sample_fps: sampleFps,
      start_time: startTime,
      end_time: endTime,
    }),
  });
}

export async function startKeywordSearch(
  videoIds: string[],
  keyword: string,
  similarityThreshold = 0.25,
  sampleFps = 1.0,
  startTime: number | null = null,
  endTime: number | null = null
): Promise<{ job_id: string; status: string }> {
  return apiFetch("/api/search/by-keyword", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      video_ids: videoIds,
      keyword,
      similarity_threshold: similarityThreshold,
      sample_fps: sampleFps,
      start_time: startTime,
      end_time: endTime,
    }),
  });
}

export async function startLprSearch(
  videoIds: string[],
  plateText: string,
  similarityThreshold = 0.50,
  sampleFps = 1.0,
  startTime: number | null = null,
  endTime: number | null = null
): Promise<{ job_id: string; status: string }> {
  return apiFetch("/api/search/by-lpr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      video_ids: videoIds,
      plate_text: plateText,
      similarity_threshold: similarityThreshold,
      sample_fps: sampleFps,
      start_time: startTime,
      end_time: endTime,
    }),
  });
}

export async function startObjectSearch(
  videoIds: string[],
  targetClasses: string[] = [],
  confidenceThreshold = 0.40,
  sampleFps = 1.0,
  startTime: number | null = null,
  endTime: number | null = null
): Promise<{ job_id: string; status: string }> {
  return apiFetch("/api/search/by-object", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      video_ids: videoIds,
      target_classes: targetClasses,
      confidence_threshold: confidenceThreshold,
      sample_fps: sampleFps,
      start_time: startTime,
      end_time: endTime,
    }),
  });
}

export async function startActivityAnalysis(
  videoIds: string[],
  sampleFps = 2.0,
  crowdThreshold = 3,
  motionThreshold = 0.03,
  sceneChangeThreshold = 0.35,
  startTime: number | null = null,
  endTime: number | null = null
): Promise<{ job_id: string; status: string }> {
  return apiFetch("/api/search/activity-analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      video_ids: videoIds,
      sample_fps: sampleFps,
      crowd_threshold: crowdThreshold,
      motion_threshold: motionThreshold,
      scene_change_threshold: sceneChangeThreshold,
      start_time: startTime,
      end_time: endTime,
    }),
  });
}

export async function getJobStatus(jobId: string): Promise<SearchJob> {
  return apiFetch(`/api/search/job/${jobId}`);
}

export async function cancelSearchJob(jobId: string): Promise<{ success: boolean; message: string }> {
  return apiFetch(`/api/search/cancel/${jobId}`, { method: "POST" });
}

export async function cancelAllSearchJobs(): Promise<{ success: boolean; message: string; count: number }> {
  return apiFetch("/api/search/cancel-all", { method: "POST" });
}

// ─── Cameras ────────────────────────────────────────

export async function addCamera(
  url: string,
  name = "",
  brand = "generic",
  username = "admin",
  password = "admin",
  channel = 1,
  isNvr = false,
  channelsCount = 4
): Promise<{ success: boolean; camera?: CameraInfo; cameras?: CameraInfo[] }> {
  return apiFetch("/api/cameras/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      url, 
      name, 
      brand, 
      username, 
      password, 
      channel,
      is_nvr: isNvr,
      channels_count: channelsCount
    }),
  });
}

export async function removeCamera(id: string): Promise<void> {
  await apiFetch(`/api/cameras/${id}`, { method: "DELETE" });
}

export async function listCameras(): Promise<{ cameras: CameraInfo[]; count: number }> {
  return apiFetch("/api/cameras/list");
}

export async function discoverCameras(
  subnet?: string,
  timeout = 0.5
): Promise<{ discovered: DiscoveredCamera[]; count: number }> {
  return apiFetch("/api/cameras/discover", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subnet, timeout }),
  });
}

export function getCameraStreamUrl(cameraId: string): string {
  return `${BASE_URL}/api/cameras/${cameraId}/stream`;
}

export function getCameraSnapshotUrl(cameraId: string): string {
  return `${BASE_URL}/api/cameras/${cameraId}/snapshot`;
}

export async function startCameraDetection(
  cameraId: string,
  detectionType = "face",
  targetClasses?: string[],
  intervalSeconds = 2.0
): Promise<{ success: boolean }> {
  return apiFetch(`/api/cameras/${cameraId}/start-detection`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      detection_type: detectionType,
      target_classes: targetClasses,
      interval_seconds: intervalSeconds,
    }),
  });
}

export async function stopCameraDetection(cameraId: string): Promise<{ success: boolean }> {
  return apiFetch(`/api/cameras/${cameraId}/stop-detection`, { method: "POST" });
}

export async function getCameraDetections(
  cameraId: string,
  since = 0
): Promise<{ alerts: DetectionAlert[]; count: number }> {
  return apiFetch(`/api/cameras/${cameraId}/detections?since=${since}`);
}

export async function getAllAlerts(since = 0): Promise<{ alerts: DetectionAlert[]; count: number }> {
  return apiFetch(`/api/cameras/alerts/all?since=${since}`);
}

// ─── Export ──────────────────────────────────────────

export async function exportReport(
  jobId: string,
  title: string,
  investigator: string,
  caseNumber = "N/A",
  department = "N/A",
  notes = ""
): Promise<Blob> {
  const res = await fetch(`${BASE_URL}/api/export/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      job_id: jobId,
      title,
      investigator,
      case_number: caseNumber,
      department,
      notes,
    }),
  });
  if (!res.ok) throw new Error(`Export failed: HTTP ${res.status}`);
  return res.blob();
}

export function resolveStorageUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${BASE_URL}${path}`;
}

export async function downloadFramesZip(jobId: string): Promise<Blob> {
  const res = await fetch(`${BASE_URL}/api/export/frames-zip?job_id=${encodeURIComponent(jobId)}`);
  if (!res.ok) throw new Error(`ZIP export failed: HTTP ${res.status}`);
  return res.blob();
}

// ─── Image Enhancer ──────────────────────────────────

export interface EnhanceOptions {
  image_url: string;
  mode?: "general" | "face" | "lpr" | "super_res";
  scale_factor?: number;
  sharpness_boost?: number;
  contrast_boost?: number;
  denoise_level?: "low" | "medium" | "high";
  engine?: "local_ai" | "cloud_api";
  api_key?: string;
}

export interface EnhanceResult {
  success: boolean;
  enhanced_image_url: string;
  filename: string;
  sha256_hash: string;
  metadata: {
    engine: string;
    mode: string;
    original_width: number;
    original_height: number;
    enhanced_width: number;
    enhanced_height: number;
    scale_factor: number;
    processing_time_seconds: number;
    applied_filters: string[];
  };
}

export async function enhanceImage(options: EnhanceOptions): Promise<EnhanceResult> {
  return apiFetch("/api/enhance/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: options.image_url,
      mode: options.mode || "general",
      scale_factor: options.scale_factor ?? 2.0,
      sharpness_boost: options.sharpness_boost ?? 1.5,
      contrast_boost: options.contrast_boost ?? 1.2,
      denoise_level: options.denoise_level || "medium",
      engine: options.engine || "local_ai",
      api_key: options.api_key || null,
    }),
  });
}

// ─── Case Evidence (cross-feature: pin any search hit to a case) ──────

export interface CaseEvidence {
  evidence_id: number;
  case_id: number;
  kind: string;
  label: string;
  summary?: string | null;
  video_id?: string | null;
  source_label?: string | null;
  timestamp_seconds?: number | null;
  confidence?: number | null;
  thumb_url?: string | null;
  frame_hash?: string | null;
  meta_json?: string | null;
  added_by?: number | null;
  added_at: number;
}

export interface AddEvidenceInput {
  kind?: string;
  label: string;
  summary?: string | null;
  video_id?: string | null;
  source_label?: string | null;
  timestamp_seconds?: number | null;
  confidence?: number | null;
  thumb_url?: string | null;
  frame_hash?: string | null;
  meta_json?: string | null;
}

export async function addCaseEvidence(
  caseId: number | string,
  input: AddEvidenceInput
): Promise<{ success: boolean; evidence_id: number }> {
  return apiFetch(`/api/cases/${caseId}/evidence`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "manual", ...input }),
  });
}

export async function listCaseEvidence(
  caseId: number | string
): Promise<{ evidence: CaseEvidence[]; count: number }> {
  try {
    const data = (await apiFetch(`/api/cases/${caseId}/evidence`)) as any;
    return {
      evidence: Array.isArray(data?.evidence) ? data.evidence : [],
      count: data?.count ?? 0,
    };
  } catch {
    return { evidence: [], count: 0 };
  }
}

export async function deleteCaseEvidence(
  caseId: number | string,
  evidenceId: number | string
): Promise<{ success: boolean }> {
  return apiFetch(`/api/cases/${caseId}/evidence/${evidenceId}`, {
    method: "DELETE",
  });
}

// ─── Active case (shared cross-tab context) ──────────────────────────

export interface ActiveCase {
  id: string | null;
  number: string | null;
}

/** Read the globally-selected active case from localStorage (client only). */
export function getActiveCase(): ActiveCase {
  if (typeof window === "undefined") return { id: null, number: null };
  return {
    id: localStorage.getItem("visioncctv_active_case_id"),
    number: localStorage.getItem("visioncctv_active_case_number"),
  };
}

// ─── Custom AI Gateway ───────────────────────────────────────────────
// Connect any OpenAI-compatible router (OpenAI, OpenRouter, LM Studio,
// Ollama, vLLM, LiteLLM, Groq, …). Sync models, get an intelligent
// recommendation, and select one for SentinelVision's AI tasks.

export interface GatewayModel {
  id: string;
  score: number;
  compatible: boolean;
  capabilities: string[];
  reason: string;
  recommended: boolean;
  context_length?: number;
  owned_by?: string;
}

export interface GatewayConfig {
  enabled: boolean;
  base_url: string;
  api_key_masked: string;
  has_api_key: boolean;
  selected_model: string;
  recommended_model: string;
  temperature: number;
  max_tokens: number;
  timeout_seconds: number;
  models: GatewayModel[];
  last_synced: number;
  last_status: string;
  use_for_query: boolean;
  use_for_translation: boolean;
  use_for_reports: boolean;
}

export interface GatewayRequirementTask {
  key: string;
  title: string;
  detail: string;
  needs: string[];
}

export interface GatewayRequirements {
  summary: string;
  tasks: GatewayRequirementTask[];
  priorities: Record<string, string>;
}

export async function getGatewayConfig(): Promise<GatewayConfig> {
  return apiFetch<GatewayConfig>("/api/ai-gateway/config");
}

export async function saveGatewayConfig(
  patch: Partial<{
    base_url: string;
    api_key: string;
    enabled: boolean;
    selected_model: string;
    temperature: number;
    max_tokens: number;
    timeout_seconds: number;
    use_for_query: boolean;
    use_for_translation: boolean;
    use_for_reports: boolean;
  }>
): Promise<{ success: boolean; config: GatewayConfig }> {
  return apiFetch("/api/ai-gateway/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export async function testGatewayConnection(creds?: {
  base_url?: string;
  api_key?: string;
}): Promise<{ ok: boolean; model_count?: number; error?: string; prefix?: string }> {
  return apiFetch("/api/ai-gateway/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(creds || {}),
  });
}

export async function syncGatewayModels(creds?: {
  base_url?: string;
  api_key?: string;
}): Promise<{
  success: boolean;
  models: GatewayModel[];
  recommended_model: string;
  compatible_count: number;
  total_count: number;
  selected_model: string;
}> {
  return apiFetch("/api/ai-gateway/sync-models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(creds || {}),
  });
}

export async function selectGatewayModel(
  model: string
): Promise<{ success: boolean; selected_model: string }> {
  return apiFetch("/api/ai-gateway/select-model", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model }),
  });
}

export async function getGatewayRequirements(): Promise<GatewayRequirements> {
  return apiFetch<GatewayRequirements>("/api/ai-gateway/requirements");
}

export async function gatewayChat(
  message: string,
  system?: string
): Promise<{ success: boolean; reply: string; model: string }> {
  return apiFetch("/api/ai-gateway/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, system }),
  });
}

// ─── Emergency Campus Safety Hazard Search ──────────────────────────────

export interface HazardSearchJob {
  job_id: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  hazard_types: string[];
  match_count: number;
  frames_processed: number;
  frames_matched: number;
  video_count: number;
  matches?: MatchResult[];
  error?: string;
}

export async function startHazardSearch(
  videoIds: string[],
  hazardTypes: string[] = ["fall", "fire", "smoke", "crowd", "weapon"],
  confidenceThreshold: number = 0.50,
  sampleFps: number = 2.0,
  startTime?: number | null,
  endTime?: number | null,
  keywordQuery?: string | null,
  blurFaces?: boolean
): Promise<{ success: boolean; job_id: string; status: string }> {
  return apiFetch("/api/safety/search-hazard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      video_ids: videoIds,
      hazard_types: hazardTypes,
      confidence_threshold: confidenceThreshold,
      sample_fps: sampleFps,
      start_time: startTime ?? null,
      end_time: endTime ?? null,
      keyword_query: keywordQuery ?? null,
      blur_faces: blurFaces ?? false,
    }),
  });
}

export async function getHazardJobStatus(jobId: string): Promise<HazardSearchJob> {
  return apiFetch(`/api/safety/hazard-job/${jobId}`);
}

export async function cancelHazardJob(jobId: string): Promise<{ success: boolean; message: string }> {
  return apiFetch(`/api/safety/cancel-hazard/${jobId}`, { method: "POST" });
}

export async function escalateHazardFromSearch(payload: {
  title: string;
  severity?: string;
  zone_name?: string;
  camera_id?: string;
  confidence?: number;
  hazard_type?: string;
  video_url?: string | null;
  frame_url?: string | null;
  frame_hash?: string | null;
  iot_telemetry?: Record<string, any>;
}): Promise<{ success: boolean; incident: any; message: string }> {
  return apiFetch("/api/safety/escalate-from-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function exportHazardReport(
  jobId: string,
  title: string = "Emergency Forensic Incident Report",
  investigator: string = "Investigator",
  caseNumber: string = "EMERGENCY-01",
  department: string = "Campus Safety & Emergency Response",
  notes: string = ""
): Promise<Blob> {
  const token = typeof window !== "undefined" ? localStorage.getItem("visioncctv_token") : null;
  const res = await fetch(`${BASE_URL}/api/export/report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      job_id: jobId,
      title,
      investigator,
      case_number: caseNumber,
      department,
      notes,
    }),
  });
  if (!res.ok) {
    throw new Error(`Export failed: ${res.statusText}`);
  }
  return res.blob();
}



