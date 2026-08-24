"""
Camera Manager — Connect to real IP cameras, DVRs, and NVRs.
Supports:
- RTSP/HTTP stream connection via OpenCV
- LAN camera discovery (port scanning + common manufacturer URLs)
- MJPEG streaming for browser display
- Background frame capture
- Live detection with SSE alerts
"""

import json
import socket
import struct
import threading
import time
import uuid
from pathlib import Path
from typing import Any, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

import cv2
import numpy as np
import opencv_compat  # noqa: F401

BASE_DIR = Path(__file__).parent.parent
STORAGE_DIR = BASE_DIR / "storage"
CAMERAS_DIR = STORAGE_DIR / "cameras"
CAMERAS_DIR.mkdir(parents=True, exist_ok=True)

# Camera registry file
CAMERAS_FILE = CAMERAS_DIR / "cameras.json"

# Common RTSP URL templates for popular manufacturers
RTSP_TEMPLATES = {
    "generic": "rtsp://{user}:{pass}@{ip}:{port}/stream1",
    "hikvision": "rtsp://{user}:{pass}@{ip}:{port}/Streaming/Channels/{channel}01",
    "dahua": "rtsp://{user}:{pass}@{ip}:{port}/cam/realmonitor?channel={channel}&subtype=0",
    "onvif_generic": "rtsp://{user}:{pass}@{ip}:{port}/onvif1",
    "reolink": "rtsp://{user}:{pass}@{ip}:{port}/h264Preview_{channel}_main",
    "uniview": "rtsp://{user}:{pass}@{ip}:{port}/media/video{channel}",
    "axis": "rtsp://{user}:{pass}@{ip}:{port}/axis-media/media.amp",
    "amcrest": "rtsp://{user}:{pass}@{ip}:{port}/cam/realmonitor?channel={channel}&subtype=0",
    "tp-link": "rtsp://{user}:{pass}@{ip}:{port}/stream1",
    "webcam": "0",  # Local webcam
}

# Common RTSP ports
RTSP_PORTS = [554, 8554, 8080, 80, 443, 9000]

# Common HTTP ports for web interfaces
HTTP_PORTS = [80, 8080, 8888, 9000, 443]


def _seed_default_cameras() -> dict[str, dict]:
    """Seed 4 default active CCTV channels using uploaded/sample videos and webcam."""
    uploads_dir = STORAGE_DIR / "uploads"
    video_files = list(uploads_dir.glob("*.mp4")) if uploads_dir.exists() else []

    defaults = {}
    default_configs = [
        ("cam-01", "CAM-01 · North Entrance & Security Gate", "subway.mp4"),
        ("cam-02", "CAM-02 · Main Lobby & Concourse", "5638efce.mp4"),
        ("cam-03", "CAM-03 · Quad & Research Labs", "f724299b.mp4"),
        ("cam-04", "CAM-04 · East Perimeter Fence", "00289bcb.mp4"),
    ]

    for idx, (cid, name, preferred_vid) in enumerate(default_configs):
        target_file = uploads_dir / preferred_vid
        if not target_file.exists() and video_files:
            target_file = video_files[idx % len(video_files)]

        url_str = str(target_file) if target_file.exists() else "/storage/uploads/subway.mp4"
        defaults[cid] = {
            "id": cid,
            "name": name,
            "url": url_str,
            "brand": "generic",
            "added_at": time.time(),
            "is_connected": True,
            "is_looping": True,
            "width": 1280,
            "height": 720,
            "fps": 25.0,
            "error": None,
        }

    _save_cameras(defaults)
    return defaults


def _load_cameras() -> dict[str, dict]:
    """Load camera registry from disk or seed defaults."""
    if CAMERAS_FILE.exists():
        try:
            data = json.loads(CAMERAS_FILE.read_text())
            if data and len(data) > 0:
                return data
        except Exception:
            pass
    return _seed_default_cameras()


def _save_cameras(cameras: dict[str, dict]):
    """Persist camera registry to disk."""
    CAMERAS_FILE.write_text(json.dumps(cameras, indent=2))


class CameraStream:
    """Manages a single camera connection and frame capture with infinite loop support."""

    def __init__(self, camera_id: str, url: str, name: str = ""):
        self.camera_id = camera_id
        self.url = url
        self.name = name or camera_id
        self.cap: Optional[cv2.VideoCapture] = None
        self.last_frame: Optional[np.ndarray] = None
        self.last_frame_time: float = 0
        self.is_connected = False
        self.is_running = False
        self.is_looping = True
        self.error: Optional[str] = None
        self._lock = threading.Lock()
        self._thread: Optional[threading.Thread] = None
        self.fps: float = 25.0
        self.width: int = 1280
        self.height: int = 720
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 5
        self.active_overlay_boxes: list[dict] = []
        self.active_hud_banner: Optional[dict] = None

    def _resolve_stream_url(self) -> str:
        """Resolve storage URLs and relative paths to absolute filesystem paths."""
        url_to_open = str(self.url)
        if url_to_open.startswith("/storage/uploads/"):
            filename = url_to_open.replace("/storage/uploads/", "")
            return str(STORAGE_DIR / "uploads" / filename)
        if not url_to_open.isdigit() and not (url_to_open.startswith("rtsp://") or url_to_open.startswith("http://")):
            p = Path(url_to_open)
            if not p.is_absolute():
                resolved = STORAGE_DIR / "uploads" / url_to_open
                if resolved.exists():
                    return str(resolved)
        return url_to_open

    def connect(self) -> bool:
        """Attempt to connect to the camera stream or video file."""
        try:
            resolved_url = self._resolve_stream_url()
            if resolved_url.isdigit():
                self.cap = cv2.VideoCapture(int(resolved_url))
            else:
                self.cap = cv2.VideoCapture(resolved_url)

            if not self.cap.isOpened():
                # Fallback to any uploaded mp4 in storage
                uploads_vids = list((STORAGE_DIR / "uploads").glob("*.mp4"))
                if uploads_vids:
                    fallback = str(uploads_vids[0])
                    print(f"[camera_manager] Failed to open {resolved_url}. Falling back to: {fallback}")
                    self.cap = cv2.VideoCapture(fallback)
                    self.url = fallback
                else:
                    self.error = "Failed to open video stream"
                    self.is_connected = False
                    return False

            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            self.fps = self.cap.get(cv2.CAP_PROP_FPS) or 25.0
            self.width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 1280
            self.height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 720

            # Read initial frame
            ok, frame = self.cap.read()
            if not ok:
                self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ok, frame = self.cap.read()

            if not ok:
                self.error = "Could not read frame from stream"
                self.is_connected = False
                return False

            self.last_frame = frame
            self.last_frame_time = time.time()
            self.is_connected = True
            self.error = None
            self.reconnect_attempts = 0
            print(f"[camera_manager] Connected to {self.camera_id} ({self.name}): {self.width}x{self.height} @ {self.fps:.1f}fps")
            return True

        except Exception as e:
            self.error = str(e)
            self.is_connected = False
            return False

    def disconnect(self):
        """Disconnect from camera stream."""
        self.is_running = False
        if self._thread and self._thread.is_alive():
            try:
                self._thread.join(timeout=2)
            except Exception:
                pass
        if self.cap:
            try:
                self.cap.release()
            except Exception:
                pass
            self.cap = None
        self.is_connected = False

    def start_capture(self):
        """Start background frame capture thread."""
        if self.is_running:
            return
        if not self.is_connected:
            if not self.connect():
                return

        self.is_running = True
        self._thread = threading.Thread(target=self._capture_loop, daemon=True)
        self._thread.start()

    def _capture_loop(self):
        """Background thread: continuously capture frames with infinite looping."""
        while self.is_running:
            try:
                if not self.cap or not self.cap.isOpened():
                    self.reconnect_attempts += 1
                    if self.reconnect_attempts > self.max_reconnect_attempts:
                        self.error = "Max reconnection attempts exceeded"
                        self.is_running = False
                        break
                    time.sleep(1.0)
                    self.connect()
                    continue

                ok, frame = self.cap.read()
                if not ok:
                    # End of video reached: loop back to frame 0 immediately
                    self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    ok, frame = self.cap.read()
                    if not ok:
                        resolved_url = self._resolve_stream_url()
                        self.cap.release()
                        self.cap = cv2.VideoCapture(int(resolved_url) if resolved_url.isdigit() else resolved_url)
                        ok, frame = self.cap.read()

                if ok and frame is not None:
                    with self._lock:
                        self.last_frame = frame
                        self.last_frame_time = time.time()
                        self.is_connected = True
                        self.error = None
                        self.reconnect_attempts = 0
                else:
                    time.sleep(0.04)

                # Regulate capture rate smoothly matching video FPS
                sleep_time = max(0.015, (1.0 / max(10.0, min(self.fps, 30.0))) - 0.005)
                time.sleep(sleep_time)

            except Exception as e:
                self.error = str(e)
                time.sleep(0.5)

    def get_frame(self) -> Optional[np.ndarray]:
        """Get the latest captured frame."""
        with self._lock:
            return self.last_frame.copy() if self.last_frame is not None else None

    def change_source(self, new_url_or_path: str, new_name: str = ""):
        """Dynamically switch video source (e.g. uploaded video, RTSP, or webcam) and persist."""
        print(f"[camera_manager] Changing source for {self.camera_id} to: {new_url_or_path}")
        self.disconnect()
        self.url = str(new_url_or_path)
        if new_name:
            self.name = new_name
        self.active_overlay_boxes = []
        self.active_hud_banner = None
        self.connect()
        self.start_capture()

        # Persist updated source in cameras.json
        cameras = _load_cameras()
        if self.camera_id in cameras:
            cameras[self.camera_id]["url"] = self.url
            cameras[self.camera_id]["name"] = self.name
            cameras[self.camera_id]["is_connected"] = self.is_connected
            _save_cameras(cameras)

    def get_snapshot_jpeg(self, quality: int = 80) -> Optional[bytes]:
        """Get latest frame with live AI HUD overlays as JPEG bytes."""
        frame = self.get_frame()
        if frame is None:
            if self.cap and self.cap.isOpened():
                ok, frame = self.cap.read()
                if not ok:
                    return None
            else:
                return None

        # Burn active AI HUD overlays if detection is active
        if hasattr(self, "active_overlay_boxes") and self.active_overlay_boxes:
            from ai_pipeline.frame_extractor import draw_premium_hud_overlay
            annotated = frame.copy()
            for b in self.active_overlay_boxes:
                annotated = draw_premium_hud_overlay(annotated, b, color_bgr=b.get("color_bgr", (246, 130, 59)))
            frame = annotated

        # If HUD banner is set (e.g. crowd counter, fall alert)
        if hasattr(self, "active_hud_banner") and self.active_hud_banner:
            banner_text = self.active_hud_banner.get("text", "")
            banner_color = self.active_hud_banner.get("color", (40, 200, 80))
            cv2.rectangle(frame, (10, 10), (frame.shape[1] - 10, 52), (10, 15, 29), -1)
            cv2.rectangle(frame, (10, 10), (frame.shape[1] - 10, 52), banner_color, 2)
            cv2.putText(frame, banner_text, (24, 38), cv2.FONT_HERSHEY_DUPLEX, 0.75, (255, 255, 255), 1, cv2.LINE_AA)

        ok, jpeg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, quality])
        if not ok:
            return None
        return jpeg.tobytes()

    def generate_mjpeg(self):
        """
        Generator that yields MJPEG frames for streaming to browser.
        Each yield is a complete multipart frame boundary.
        """
        while self.is_running or self.is_connected:
            jpeg = self.get_snapshot_jpeg(quality=75)
            if jpeg:
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" + jpeg + b"\r\n"
                )
            time.sleep(1.0 / 25)  # Smooth 25 fps stream

    def get_status(self) -> dict:
        """Get camera status info."""
        return {
            "camera_id": self.camera_id,
            "name": self.name,
            "url": self.url,
            "is_connected": self.is_connected,
            "is_running": self.is_running,
            "error": self.error,
            "fps": self.fps,
            "width": self.width,
            "height": self.height,
            "last_frame_age": round(time.time() - self.last_frame_time, 1) if self.last_frame_time > 0 else None,
        }


# ─── Global Camera Registry ────────────────────────────────────────────

_active_streams: dict[str, CameraStream] = {}
_detection_threads: dict[str, threading.Thread] = {}
_detection_running: dict[str, bool] = {}
_detection_alerts: dict[str, list] = {}  # camera_id -> list of recent alerts


def add_camera(
    url: str,
    name: str = "",
    brand: str = "generic",
    username: str = "admin",
    password: str = "admin",
    channel: int = 1,
) -> dict[str, Any]:
    """
    Add a new camera to the system.
    Can accept raw RTSP/HTTP URL or use brand templates.
    """
    camera_id = str(uuid.uuid4())[:8]

    # Build URL from template if brand is specified
    if brand in RTSP_TEMPLATES and brand != "generic" and not url.startswith("rtsp://"):
        template = RTSP_TEMPLATES[brand]
        if template == "0":
            final_url = "0"
        else:
            # Extract IP and port from URL if provided
            ip = url.strip()
            port = 554
            if ":" in ip:
                parts = ip.split(":")
                ip = parts[0]
                try:
                    port = int(parts[1])
                except ValueError:
                    pass

            final_url = template.format(
                user=username, **{"pass": password},
                ip=ip, port=port, channel=channel,
            )
    else:
        final_url = url

    if not name:
        name = f"Camera {camera_id}"

    # Try to connect
    stream = CameraStream(camera_id, final_url, name)
    connected = stream.connect()

    # Save to registry
    cameras = _load_cameras()
    cameras[camera_id] = {
        "id": camera_id,
        "name": name,
        "url": final_url,
        "brand": brand,
        "added_at": time.time(),
        "is_connected": connected,
        "width": stream.width,
        "height": stream.height,
        "fps": stream.fps,
        "error": stream.error,
    }
    _save_cameras(cameras)

    if connected:
        stream.start_capture()
        _active_streams[camera_id] = stream

    return cameras[camera_id]


def remove_camera(camera_id: str) -> bool:
    """Remove a camera from the system."""
    # Stop stream
    if camera_id in _active_streams:
        _active_streams[camera_id].disconnect()
        del _active_streams[camera_id]

    # Stop detection
    stop_live_detection(camera_id)

    # Remove from registry
    cameras = _load_cameras()
    if camera_id in cameras:
        del cameras[camera_id]
        _save_cameras(cameras)
        return True
    return False


def list_cameras() -> list[dict]:
    """List all registered cameras with live status."""
    cameras = _load_cameras()
    result = []
    for cam_id, cam_data in cameras.items():
        status = cam_data.copy()
        if cam_id in _active_streams:
            live_status = _active_streams[cam_id].get_status()
            status.update({
                "is_connected": live_status["is_connected"],
                "is_running": live_status["is_running"],
                "error": live_status["error"],
                "last_frame_age": live_status["last_frame_age"],
            })
        else:
            status["is_running"] = False
        status["detection_active"] = _detection_running.get(cam_id, False)
        result.append(status)
    return result


def get_camera_stream(camera_id: str) -> Optional[CameraStream]:
    """Get an active camera stream, connecting if necessary."""
    if camera_id in _active_streams:
        return _active_streams[camera_id]

    cameras = _load_cameras()
    if camera_id not in cameras:
        return None

    cam_data = cameras[camera_id]
    stream = CameraStream(camera_id, cam_data["url"], cam_data.get("name", ""))
    if stream.connect():
        stream.start_capture()
        _active_streams[camera_id] = stream
        return stream
    return None


def get_snapshot(camera_id: str) -> Optional[bytes]:
    """Get a JPEG snapshot from a camera."""
    stream = get_camera_stream(camera_id)
    if stream:
        return stream.get_snapshot_jpeg()
    return None


# ─── LAN Camera Discovery ──────────────────────────────────────────────

def _get_local_ip() -> str:
    """Get the local machine's IP address."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "192.168.1.1"


def _get_subnet_prefix(ip: str) -> str:
    """Get the /24 subnet prefix from an IP."""
    parts = ip.split(".")
    return ".".join(parts[:3])


def _scan_port(ip: str, port: int, timeout: float = 1.0) -> bool:
    """Check if a port is open on an IP address."""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((ip, port))
        sock.close()
        return result == 0
    except Exception:
        return False


def _try_rtsp_connection(url: str, timeout: float = 3.0) -> dict | None:
    """Try to connect to an RTSP URL and get stream info."""
    try:
        cap = cv2.VideoCapture(url)
        cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, int(timeout * 1000))

        if not cap.isOpened():
            cap.release()
            return None

        ok, frame = cap.read()
        if not ok:
            cap.release()
            return None

        info = {
            "url": url,
            "width": int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
            "height": int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
            "fps": cap.get(cv2.CAP_PROP_FPS) or 25.0,
        }
        cap.release()
        return info
    except Exception:
        return None


def discover_cameras(
    subnet: str | None = None,
    scan_range: tuple[int, int] = (1, 255),
    timeout: float = 0.5,
    credentials: list[tuple[str, str]] | None = None,
) -> list[dict[str, Any]]:
    """
    Discover IP cameras on the local network.
    
    Strategy:
    1. Scan common RTSP/HTTP ports on the local subnet(s)
    2. Try common manufacturer URLs with default credentials
    3. Return list of discovered cameras with connection details
    """
    subnets_to_scan = []
    if subnet is not None:
        subnets_to_scan = [subnet.strip()]
    else:
        # Detect all local interfaces
        try:
            host_ips = socket.gethostbyname_ex(socket.gethostname())[2]
            for ip in host_ips:
                if not ip.startswith("127.") and not ip.startswith("169.254."):
                    subnets_to_scan.append(_get_subnet_prefix(ip))
        except Exception:
            pass
        if not subnets_to_scan:
            subnets_to_scan = [_get_subnet_prefix(_get_local_ip())]

    if credentials is None:
        credentials = [
            ("admin", "admin"),
            ("admin", ""),
            ("admin", "12345"),
            ("admin", "password"),
            ("root", "root"),
        ]

    discovered = []
    
    for sub in subnets_to_scan:
        print(f"[camera_discovery] Scanning subnet {sub}.0/24...")
        open_hosts: dict[str, list[int]] = {}

        def scan_host(host_num: int):
            ip = f"{sub}.{host_num}"
            open_ports = []
            for port in RTSP_PORTS:
                if _scan_port(ip, port, timeout):
                    open_ports.append(port)
            return ip, open_ports

        with ThreadPoolExecutor(max_workers=50) as executor:
            futures = {
                executor.submit(scan_host, i): i
                for i in range(scan_range[0], scan_range[1] + 1)
            }
            for future in as_completed(futures):
                try:
                    ip, ports = future.result()
                    if ports:
                        open_hosts[ip] = ports
                        print(f"[camera_discovery] Found open ports on {ip}: {ports}")
                except Exception:
                    pass

        # Phase 2: Try RTSP connections on discovered hosts
        for ip, ports in open_hosts.items():
            for port in ports:
                for username, password in credentials:
                    # Try various URL patterns
                    test_urls = [
                        f"rtsp://{username}:{password}@{ip}:{port}/stream1",
                        f"rtsp://{username}:{password}@{ip}:{port}/",
                        f"rtsp://{username}:{password}@{ip}:{port}/Streaming/Channels/101",
                        f"rtsp://{username}:{password}@{ip}:{port}/cam/realmonitor?channel=1&subtype=0",
                        f"rtsp://{username}:{password}@{ip}:{port}/h264Preview_01_main",
                    ]

                    if port in HTTP_PORTS:
                        test_urls.append(f"http://{ip}:{port}/video")

                    for url in test_urls:
                        info = _try_rtsp_connection(url, timeout=2.0)
                        if info:
                            # Determine likely brand
                            brand = "generic"
                            if "Streaming/Channels" in url:
                                brand = "hikvision"
                            elif "realmonitor" in url:
                                brand = "dahua"
                            elif "h264Preview" in url:
                                brand = "reolink"

                            discovered.append({
                                "ip": ip,
                                "port": port,
                                "url": url,
                                "brand": brand,
                                "width": info["width"],
                                "height": info["height"],
                                "fps": info["fps"],
                                "credentials_used": f"{username}:{'*' * len(password)}",
                            })
                            break  # Found working URL for this port
                    if any(d["ip"] == ip and d["port"] == port for d in discovered):
                        break  # Found working credentials

    print(f"[camera_discovery] Discovery complete. Found {len(discovered)} camera(s).")
    return discovered


# ─── Live Detection ─────────────────────────────────────────────────────

def start_live_detection(
    camera_id: str,
    detection_type: str = "face",
    reference_ids: list[str] | None = None,
    target_classes: list[str] | None = None,
    interval_seconds: float = 2.0,
) -> bool:
    """
    Start running AI detection on a live camera feed.
    Results are pushed to _detection_alerts for SSE streaming.
    """
    if camera_id in _detection_running and _detection_running[camera_id]:
        return True  # Already running

    stream = get_camera_stream(camera_id)
    if not stream:
        return False

    _detection_running[camera_id] = True
    _detection_alerts[camera_id] = []

    def detection_loop():
        from ai_pipeline.frame_extractor import format_timestamp, draw_premium_hud_overlay
        from database import DB_PATH
        import sqlite3
        import hashlib

        detection_loop._motion_prev_gray = None

        # Pre-load face references if face mode
        db_tensor = None
        db_labels = []
        if detection_type == "face":
            try:
                from ai_pipeline.face_recognition import build_reference_embeddings
                ref_paths = []
                if reference_ids:
                    from routers.search import _resolve_reference
                    ref_paths = [_resolve_reference(rid) for rid in reference_ids]
                else:
                    ref_paths = list((STORAGE_DIR / "references").glob("*.jpg"))
                if ref_paths:
                    db_tensor, db_labels = build_reference_embeddings(ref_paths)
            except Exception as e:
                print(f"[live_detection] Face reference setup: {e}")

        while _detection_running.get(camera_id, False):
            frame = stream.get_frame()
            if frame is None:
                time.sleep(0.5)
                continue

            # Motion Check
            gray_for_motion = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            gray_for_motion = cv2.GaussianBlur(gray_for_motion, (15, 15), 0)
            
            if detection_loop._motion_prev_gray is None:
                detection_loop._motion_prev_gray = gray_for_motion
                
            diff_m = cv2.absdiff(detection_loop._motion_prev_gray, gray_for_motion)
            _, thresh_m = cv2.threshold(diff_m, 20, 255, cv2.THRESH_BINARY)
            motion_ratio = float(np.sum(thresh_m > 0)) / thresh_m.size
            detection_loop._motion_prev_gray = gray_for_motion

            if motion_ratio < 0.003 and detection_type not in ("motion", "crowd"):
                time.sleep(interval_seconds)
                continue

            detections = []
            timestamp_str = time.strftime("%H:%M:%S")

            try:
                if detection_type == "face":
                    from ai_pipeline.face_recognition import detect_faces, _embed_face_crop, _TORCH_AVAILABLE as FACE_TORCH
                    faces = detect_faces(frame, min_size=(25, 25))
                    
                    for (x, y, w, h) in faces:
                        matched_label = "Unidentified Person"
                        matched_conf = 0.72

                        if FACE_TORCH and db_tensor is not None:
                            try:
                                import torch
                                from ai_pipeline.face_recognition import _get_device
                                pad_x, pad_y = int(w * 0.1), int(h * 0.1)
                                y1, y2 = max(0, y - pad_y), min(frame.shape[0], y + h + pad_y)
                                x1, x2 = max(0, x - pad_x), min(frame.shape[1], x + w + pad_x)
                                crop = frame[y1:y2, x1:x2]
                                if crop.size > 0:
                                    emb_np = _embed_face_crop(crop)
                                    emb = torch.from_numpy(emb_np).to(_get_device())
                                    sims = torch.nn.functional.cosine_similarity(db_tensor, emb.expand_as(db_tensor), dim=1)
                                    max_idx = int(torch.argmax(sims).item())
                                    max_sim = float(sims[max_idx].item())
                                    if max_sim >= 0.45:
                                        matched_label = db_labels[max_idx]
                                        matched_conf = max_sim
                            except Exception:
                                pass

                        detections.append({
                            "type": "face",
                            "label": matched_label,
                            "confidence": round(matched_conf, 3),
                            "box": {"x1": int(x), "y1": int(y), "x2": int(x+w), "y2": int(y+h)},
                        })

                elif detection_type in ("hazard", "hazard_suite", "fall", "fire", "smoke", "weapon", "blood"):
                    try:
                        from ai_pipeline.hazard_engine import get_hazard_engine
                        h_engine = get_hazard_engine()
                        active_mods = ["fire", "smoke", "fall", "crowd", "weapon", "face"] if detection_type in ("hazard", "hazard_suite") else [detection_type]
                        h_res = h_engine.process_frame(
                            frame=frame,
                            frame_idx=int(time.time()),
                            timestamp_sec=time.time(),
                            enabled_modules=active_mods,
                            confidence_threshold=0.30,
                        )
                        for inc in h_res.get("incidents", []):
                            detections.append({
                                "type": inc.get("incident_type", "hazard"),
                                "label": inc.get("label", "Hazard Alert"),
                                "confidence": inc.get("confidence", 0.85),
                                "box": inc.get("box", {"x1": 10, "y1": 10, "x2": 100, "y2": 100}),
                                "severity": inc.get("severity", "P1"),
                            })
                        if h_res.get("people_count", 0) > 0:
                            detections.append({
                                "type": "people_count",
                                "label": f"Live People Present: {h_res['people_count']}",
                                "confidence": 0.95,
                                "box": {"x1": 10, "y1": 10, "x2": 240, "y2": 45},
                            })
                    except Exception as e:
                        print(f"[live_detection] Hazard error on {camera_id}: {e}")

                elif detection_type in ("object", "crowd"):
                    try:
                        from ai_pipeline.hazard_engine import get_hazard_engine
                        h_engine = get_hazard_engine()
                        h_res = h_engine.process_frame(
                            frame=frame,
                            frame_idx=int(time.time()),
                            timestamp_sec=time.time(),
                            enabled_modules=["crowd"],
                            confidence_threshold=0.35,
                        )
                        for p in h_res.get("tracked_people", []):
                            bx = p["box"]
                            detections.append({
                                "type": "person",
                                "label": f"Person #{p['id']}",
                                "confidence": round(p["conf"], 3),
                                "box": bx,
                            })
                        p_count = h_res.get("people_count", 0)
                        if detection_type == "crowd" and p_count >= 3:
                            detections.insert(0, {
                                "type": "crowd",
                                "label": f"Crowd Gathering ({p_count} Persons)",
                                "confidence": min(1.0, 0.5 + p_count * 0.1),
                                "box": {"x1": 20, "y1": 20, "x2": frame.shape[1] - 20, "y2": frame.shape[0] - 20},
                            })
                    except Exception as e:
                        print(f"[live_detection] Object detection error: {e}")

                elif detection_type == "motion":
                    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                    gray = cv2.GaussianBlur(gray, (21, 21), 0)
                    if hasattr(detection_loop, '_prev_gray') and detection_loop._prev_gray is not None:
                        diff = cv2.absdiff(detection_loop._prev_gray, gray)
                        _, thresh = cv2.threshold(diff, 25, 255, cv2.THRESH_BINARY)
                        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                        for c in contours:
                            if cv2.contourArea(c) > 1200:
                                x, y, w, h = cv2.boundingRect(c)
                                detections.append({
                                    "type": "motion",
                                    "label": "Motion Activity",
                                    "confidence": min(1.0, cv2.contourArea(c) / 10000),
                                    "box": {"x1": int(x), "y1": int(y), "x2": int(x+w), "y2": int(y+h)},
                                })
                    detection_loop._prev_gray = gray

            except Exception as e:
                print(f"[live_detection] Error on {camera_id}: {e}")

            # Zone Filtering
            zones_list = []
            try:
                conn = sqlite3.connect(str(DB_PATH))
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT points, name, zone_type FROM zones WHERE camera_id = ?;", (camera_id,))
                zones_list = [dict(row) for row in cursor.fetchall()]
                conn.close()
            except Exception:
                pass

            if zones_list and detections:
                filtered_detections = []
                for det in detections:
                    box = det["box"]
                    cx = int((box["x1"] + box["x2"]) / 2)
                    cy = int((box["y1"] + box["y2"]) / 2)
                    inside_zone = False
                    for zone in zones_list:
                        try:
                            points = json.loads(zone["points"])
                            if not points:
                                continue
                            poly_np = np.array(points, dtype=np.int32).reshape((-1, 1, 2))
                            dist = cv2.pointPolygonTest(poly_np, (cx, cy), False)
                            if dist >= 0:
                                inside_zone = True
                                det["label"] = f"{det['label']} [{zone['name']}]"
                                break
                        except Exception:
                            pass
                    if inside_zone:
                        filtered_detections.append(det)
                detections = filtered_detections

            # Save Alert & HUD drawing
            if detections:
                # Update stream active overlay boxes for live MJPEG burning
                overlay_boxes = []
                for det in detections:
                    if "box" in det:
                        col = (246, 130, 59)
                        if det["type"] == "face" and det["label"] != "Unidentified Person":
                            col = (60, 60, 245) # Crimson for target suspect
                        elif det["type"] == "fall":
                            col = (50, 50, 245) # Alert Crimson for fall
                        elif det["type"] == "hazard":
                            col = (40, 180, 255)
                        elif det["type"] == "crowd":
                            col = (60, 180, 255)
                        elif "gun" in det["label"] or "knife" in det["label"] or "weapon" in det["label"]:
                            col = (30, 30, 245)

                        overlay_boxes.append({
                            "x1": det["box"]["x1"],
                            "y1": det["box"]["y1"],
                            "x2": det["box"]["x2"],
                            "y2": det["box"]["y2"],
                            "label": det["label"],
                            "confidence": det["confidence"],
                            "color_bgr": col
                        })
                stream.active_overlay_boxes = overlay_boxes

                snapshot_dir = CAMERAS_DIR / camera_id
                snapshot_dir.mkdir(parents=True, exist_ok=True)
                snapshot_filename = f"det_{int(time.time())}_{uuid.uuid4().hex[:4]}.jpg"
                snapshot_path = snapshot_dir / snapshot_filename

                annotated = frame.copy()
                for det in detections:
                    box = det.get("box")
                    if box:
                        col = (246, 130, 59)
                        if det["type"] == "face" and det["label"] != "Unidentified Person":
                            col = (60, 60, 245)
                        elif det["type"] == "fall":
                            col = (50, 50, 245)
                        elif det["type"] == "crowd":
                            col = (60, 180, 255)
                        annotated = draw_premium_hud_overlay(annotated, {
                            "x1": box["x1"], "y1": box["y1"], "x2": box["x2"], "y2": box["y2"],
                            "label": det["label"], "confidence": det["confidence"]
                        }, color_bgr=col)

                cv2.imwrite(str(snapshot_path), annotated, [cv2.IMWRITE_JPEG_QUALITY, 85])
                snapshot_url = f"/storage/cameras/{camera_id}/{snapshot_filename}"

                alert = {
                    "id": str(uuid.uuid4())[:8],
                    "camera_id": camera_id,
                    "camera_name": stream.name,
                    "timestamp": time.time(),
                    "timestamp_str": timestamp_str,
                    "detections": detections,
                    "snapshot_url": snapshot_url,
                }

                _detection_alerts[camera_id].append(alert)
                _detection_alerts[camera_id] = _detection_alerts[camera_id][-100:]

                # SQLite DB Ingestion
                try:
                    conn = sqlite3.connect(str(DB_PATH))
                    conn.row_factory = sqlite3.Row
                    cursor = conn.cursor()
                    frame_hash = hashlib.sha256(open(snapshot_path, "rb").read()).hexdigest()
                    
                    cursor.execute("SELECT case_id FROM cases WHERE status = 'open' LIMIT 1;")
                    case_row = cursor.fetchone()
                    case_id = case_row["case_id"] if case_row else 1
                    
                    for det in detections:
                        cursor.execute(
                            """INSERT INTO detection_events 
                               (case_id, camera_id, module, object_type, object_label, severity, summary, searchable, detected_at, frame_hash, frame_path)
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);""",
                            (
                                case_id,
                                camera_id,
                                f"live_{detection_type}",
                                det["type"],
                                det["label"],
                                "high" if det["type"] == "face" and det["label"] != "Unidentified Person" else "medium",
                                f"Live sighting: {det['label']} on {stream.name}",
                                det["label"].lower(),
                                time.time(),
                                frame_hash,
                                f"/storage/cameras/{camera_id}/{snapshot_filename}"
                            )
                        )
                        event_id = cursor.lastrowid
                        cursor.execute(
                            """INSERT INTO chain_of_custody (media_id, event_id, action, user_id, hash_value, notes, created_at)
                               VALUES (?, ?, ?, ?, ?, ?, ?);""",
                            (None, event_id, "ingested", 1, frame_hash, f"Live sighting: {det['label']}", time.time())
                        )
                    conn.commit()
                    conn.close()
                except Exception as db_err:
                    print(f"[live_detection] DB insert error: {db_err}")

            time.sleep(interval_seconds)

    detection_loop._prev_gray = None
    thread = threading.Thread(target=detection_loop, daemon=True)
    thread.start()
    _detection_threads[camera_id] = thread
    return True


def stop_live_detection(camera_id: str):
    """Stop live detection on a camera."""
    _detection_running[camera_id] = False


def get_detection_alerts(camera_id: str, since: float = 0) -> list[dict]:
    """Get detection alerts for a camera, optionally filtered by timestamp."""
    alerts = _detection_alerts.get(camera_id, [])
    if since > 0:
        alerts = [a for a in alerts if a["timestamp"] > since]
    return alerts


def get_all_alerts(since: float = 0) -> list[dict]:
    """Get all detection alerts across all cameras."""
    all_alerts = []
    for alerts in _detection_alerts.values():
        for a in alerts:
            if a["timestamp"] > since:
                all_alerts.append(a)
    all_alerts.sort(key=lambda a: a["timestamp"], reverse=True)
    return all_alerts[:50]
