import time
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(150), nullable=False)
    role_ext = Column(String(50), default="operator")  # admin, supervisor, investigator, operator, auditor
    mfa_enabled = Column(Boolean, default=False)
    totp_secret = Column(String(64), nullable=True)

class Camera(Base):
    __tablename__ = "cameras"

    camera_id = Column(String(50), primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    url = Column(String(255), nullable=False)
    brand = Column(String(100), default="generic")
    is_connected = Column(Boolean, default=False)
    is_running = Column(Boolean, default=False)
    detection_active = Column(Boolean, default=False)
    width = Column(Integer, default=1920)
    height = Column(Integer, default=1080)
    fps = Column(Float, default=25.0)
    error = Column(String(255), nullable=True)
    added_at = Column(Float, default=time.time)
    continuous_recording = Column(Boolean, default=False)
    ptz_capable = Column(Boolean, default=False)

class Zone(Base):
    __tablename__ = "zones"

    zone_id = Column(String(50), primary_key=True, index=True)
    camera_id = Column(String(50), ForeignKey("cameras.camera_id", ondelete="CASCADE"), nullable=False)
    name = Column(String(150), nullable=False)
    zone_type = Column(String(50), default="general")  # restricted, general, etc.
    points = Column(Text, nullable=False)  # JSON serialized coordinate pairs
    active_from = Column(String(5), default="00:00")
    active_to = Column(String(5), default="23:59")

class Case(Base):
    __tablename__ = "cases"

    case_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    case_number = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    investigating_officer_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    status = Column(String(50), default="open")  # open, under_review, closed
    created_at = Column(Float, default=time.time)
    closed_at = Column(Float, nullable=True)

class CaseMedia(Base):
    __tablename__ = "case_media"

    media_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    case_id = Column(Integer, ForeignKey("cases.case_id", ondelete="CASCADE"), nullable=False)
    source_label = Column(String(150), nullable=True)
    original_filename = Column(String(255), nullable=True)
    file_path = Column(String(255), nullable=False)
    sha256_hash = Column(String(64), nullable=False)
    duration_seconds = Column(Float, nullable=True)
    resolution = Column(String(50), nullable=True)
    uploaded_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    uploaded_at = Column(Float, default=time.time)
    processing_status = Column(String(50), default="queued")  # queued, processing, done, failed

class ReferenceImage(Base):
    __tablename__ = "reference_images"

    ref_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    case_id = Column(Integer, ForeignKey("cases.case_id", ondelete="SET NULL"), nullable=True)
    uploaded_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    image_path = Column(String(255), nullable=False)
    subject_type = Column(String(50), nullable=False)  # person, vehicle
    label = Column(String(150), nullable=True)
    embedding = Column(Text, nullable=True)  # JSON serialized vector embedding
    created_at = Column(Float, default=time.time)

class DetectionEvent(Base):
    __tablename__ = "detection_events"

    event_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    case_id = Column(Integer, ForeignKey("cases.case_id", ondelete="SET NULL"), nullable=True)
    camera_id = Column(String(50), ForeignKey("cameras.camera_id"), nullable=False)
    module = Column(String(50), nullable=False)  # ANPR, VELOCITY, INTRUSION, etc.
    object_type = Column(String(50), nullable=False)  # person, vehicle, etc.
    object_label = Column(String(50), nullable=False)
    severity = Column(String(20), default="low")  # low, medium, high
    summary = Column(Text, nullable=False)
    searchable = Column(Text, nullable=False)
    plate = Column(String(50), nullable=True)
    detected_at = Column(Float, default=time.time)
    reviewed = Column(Boolean, default=False)
    false_positive = Column(Boolean, default=False)
    heuristic = Column(Boolean, default=True)
    frame_hash = Column(String(64), nullable=True)
    frame_path = Column(String(255), nullable=True)
    track_id = Column(String(50), nullable=True)

class ReidMatch(Base):
    __tablename__ = "reid_matches"

    match_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ref_id = Column(Integer, ForeignKey("reference_images.ref_id", ondelete="CASCADE"), nullable=False)
    event_id = Column(Integer, ForeignKey("detection_events.event_id", ondelete="CASCADE"), nullable=False)
    similarity_score = Column(Float, nullable=False)
    reviewed = Column(Boolean, default=False)
    matched_at = Column(Float, default=time.time)

class PersonAttribute(Base):
    __tablename__ = "person_attributes"

    attribute_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    event_id = Column(Integer, ForeignKey("detection_events.event_id", ondelete="CASCADE"), nullable=False)
    top_color = Column(String(30), nullable=True)
    bottom_color = Column(String(30), nullable=True)
    headgear = Column(String(30), nullable=True)  # helmet, cap, none
    bag_present = Column(Boolean, default=False)
    pose_state = Column(String(30), nullable=True)  # standing, running, crouching
    confidence = Column(Float, default=1.0)

class Watchlist(Base):
    __tablename__ = "watchlists"

    watchlist_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(150), nullable=False)
    type = Column(String(50), nullable=False)  # face, plate
    created_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    created_at = Column(Float, default=time.time)

class WatchlistEntry(Base):
    __tablename__ = "watchlist_entries"

    entry_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    watchlist_id = Column(Integer, ForeignKey("watchlists.watchlist_id", ondelete="CASCADE"), nullable=False)
    reference_image_id = Column(Integer, ForeignKey("reference_images.ref_id", ondelete="CASCADE"), nullable=True)
    plate_number = Column(String(50), nullable=True)
    alert_severity = Column(String(20), default="high")  # low, medium, high
    added_at = Column(Float, default=time.time)

class ChainOfCustody(Base):
    __tablename__ = "chain_of_custody"

    custody_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    media_id = Column(Integer, ForeignKey("case_media.media_id", ondelete="SET NULL"), nullable=True)
    event_id = Column(Integer, ForeignKey("detection_events.event_id", ondelete="SET NULL"), nullable=True)
    action = Column(String(50), nullable=False)  # ingested, hashed, viewed, exported, annotated
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    hash_value = Column(String(64), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(Float, default=time.time)

class ExportReport(Base):
    __tablename__ = "export_reports"

    report_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    case_id = Column(Integer, ForeignKey("cases.case_id", ondelete="CASCADE"), nullable=False)
    generated_by = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    file_path = Column(String(255), nullable=False)
    sha256_hash = Column(String(64), nullable=False)
    generated_at = Column(Float, default=time.time)

class Recording(Base):
    __tablename__ = "recordings"

    recording_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    camera_id = Column(String(50), ForeignKey("cameras.camera_id", ondelete="CASCADE"), nullable=False)
    file_path = Column(String(255), nullable=False)
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    sha256_hash = Column(String(64), nullable=True)
    storage_tier = Column(String(50), default="hot")  # hot, archive

class PtzPreset(Base):
    __tablename__ = "ptz_presets"

    preset_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    camera_id = Column(String(50), ForeignKey("cameras.camera_id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    pan = Column(Float, default=0.0)
    tilt = Column(Float, default=0.0)
    zoom = Column(Float, default=1.0)

class AuditLog(Base):
    __tablename__ = "audit_log"

    audit_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ts = Column(Float, default=time.time)
    user = Column(String(100), nullable=False)
    action = Column(String(150), nullable=False)
    detail = Column(Text, nullable=False)
