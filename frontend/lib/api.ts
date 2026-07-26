/**
 * VisionCCTV API client
 * All calls go to http://localhost:8000
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("visioncctv_token");
      localStorage.removeItem("visioncctv_user");
      window.location.href = "/";
    }
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
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
  clip_url?: string;
  confidence: number;
  label: string;
  search_type: "face_recognition" | "keyword" | "lpr" | "object_detection" | "activity_analysis";
  box?: { x1: number; y1: number; x2: number; y2: number };
  frame_hash?: string;
  clip_hash?: string;
  ocr_text?: string;
  detections?: Array<{
    class_name: string;
    confidence: number;
    box: { x1: number; y1: number; x2: number; y2: number };
  }>;
  object_count?: number;
}

export interface SearchJob {
  status: "queued" | "running" | "completed" | "failed";
  type: string;
  match_count: number;
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
  return apiFetch("/api/references/list");
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
