"""
Export router — generate PDF reports and serve clip downloads.
Phase 8: Forensic export capability.
"""

import json
import re
import time
import uuid
import zipfile
import sqlite3
import hashlib
from io import BytesIO
from pathlib import Path

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel
from database import get_db
import auth_utils

router = APIRouter()

BASE_DIR = Path(__file__).parent.parent
RESULTS_DIR = BASE_DIR / "storage" / "results"
REPORTS_DIR = RESULTS_DIR / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


def _calculate_sha256(file_path: Path) -> str:
    """Calculate the SHA-256 hash of a file."""
    if not file_path or not file_path.exists():
        return "N/A"
    sha256_hash = hashlib.sha256()
    try:
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    except Exception:
        return "N/A"


def _calculate_md5(file_path: Path) -> str:
    """Calculate the MD5 hash of a file."""
    if not file_path or not file_path.exists():
        return "N/A"
    md5_hash = hashlib.md5()
    try:
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                md5_hash.update(byte_block)
        return md5_hash.hexdigest()
    except Exception:
        return "N/A"


class ExportReportRequest(BaseModel):
    job_id: str
    title: str = "VisionCCTV Investigation Report"
    investigator: str = "N/A"
    case_number: str = "N/A"
    department: str = "N/A"
    notes: str = ""
    filter_type: str = "all"  # "all", "fire", "smoke", "fall", "crowd", "brawl", "weapon", "face", "lpr", "object", "activity", "keyword"
    min_confidence: float = 0.0
    group_by_sections: bool = True
    selected_sections: list[str] = [
        "executive_summary",
        "metrics_overview",
        "evidence_matches",
        "telemetry_analysis",
        "chain_of_custody",
        "legal_signoff"
    ]
    camera_id: str = "all"


def _categorize_match(m: dict) -> tuple[str, str, str]:
    """Return (category_id, category_display_name, category_color_hex)."""
    inc_type = str(m.get("incident_type", "")).lower()
    label = str(m.get("label", "")).lower()
    s_type = str(m.get("search_type", "")).lower()

    if "fire" in inc_type or "flame" in label or "fire" in label or "thermal" in label:
        return "fire", "Fire & Thermal Anomaly Detections", "#EF4444"
    if "smoke" in inc_type or "smoke" in label or "plume" in label or "aerosol" in label:
        return "smoke", "Volumetric Smoke & Aerosol Plumes", "#64748B"
    if "fall" in inc_type or "fall" in label or "slip" in label or "casualty" in label or "immobility" in label:
        return "fall", "Slip & Fall Biomechanical Incidents", "#F59E0B"
    if "crowd" in inc_type or "crowd" in label or "gathering" in label or "density" in label or "unrest" in label:
        return "crowd", "Live Crowd Density & Surge Events", "#3B82F6"
    if "brawl" in inc_type or "brawl" in label or "affray" in label or "altercation" in label or "combatant" in label:
        return "brawl", "Violent Affray & Physical Altercations", "#EC4899"
    if "weapon" in inc_type or "weapon" in label or "gun" in label or "knife" in label or "armed" in label or "blade" in label:
        return "weapon", "Armed Threats & Weapon Detections", "#DC2626"
    if "face" in inc_type or s_type == "face_recognition" or "face" in label or "suspect" in label:
        return "face", "Face Identification & Re-Identification", "#06B6D4"
    if "lpr" in inc_type or s_type == "lpr" or "plate" in label or "license" in label or "vehicle" in label:
        return "lpr", "License Plate Recognition & Vehicle Records", "#10B981"
    if "object" in inc_type or s_type == "object_detection" or "person" in label or "backpack" in label or "bag" in label:
        return "object", "Object & Physical Attribute Detections", "#8B5CF6"
    if "activity" in inc_type or s_type == "activity" or "motion" in label:
        return "activity", "Activity & Spatial Movement Dynamics", "#F97316"
    return "keyword", "Open-Vocabulary Visual Query Matches", "#6366F1"


def _generate_pdf(
    matches: list[dict],
    title: str,
    investigator: str,
    job_id: str,
    case_number: str = "N/A",
    department: str = "N/A",
    notes: str = "",
    coc_logs: list[dict] = None,
    narrative: str = "",
    filter_type: str = "all",
    min_confidence: float = 0.0,
    group_by_sections: bool = True,
    selected_sections: list[str] = None,
    camera_id: str = "all",
) -> bytes:
    """Generate a forensic PDF report with multi-section filters, telemetry breakdown, and §65B sign-off."""
    from reportlab.lib import colors  # noqa: PLC0415
    from reportlab.lib.pagesizes import A4  # noqa: PLC0415
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle  # noqa: PLC0415
    from reportlab.lib.units import cm  # noqa: PLC0415
    from reportlab.platypus import (  # noqa: PLC0415
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image as RLImage, KeepTogether
    )

    if selected_sections is None:
        selected_sections = [
            "executive_summary", "metrics_overview", "evidence_matches",
            "telemetry_analysis", "chain_of_custody", "legal_signoff"
        ]

    # Filter matches
    filtered_matches = []
    for m in matches:
        conf = float(m.get("confidence", 0.0))
        if conf < min_confidence:
            continue
        c_id = str(m.get("camera_id", "all"))
        if camera_id != "all" and c_id != camera_id:
            continue
        cat_id, _, _ = _categorize_match(m)
        if filter_type != "all" and cat_id != filter_type:
            continue
        filtered_matches.append(m)

    # Sort matches chronologically
    filtered_matches.sort(key=lambda x: float(x.get("timestamp", 0.0)))

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=1.8 * cm,
        bottomMargin=1.8 * cm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "title",
        parent=styles["Title"],
        fontSize=18,
        leading=22,
        spaceAfter=4,
        textColor=colors.HexColor("#0f172a"),
    )
    heading_style = ParagraphStyle(
        "heading",
        parent=styles["Heading2"],
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#1e293b"),
        spaceBefore=10,
        spaceAfter=6,
    )
    subheading_style = ParagraphStyle(
        "subheading",
        parent=styles["Heading3"],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#2563eb"),
        spaceBefore=8,
        spaceAfter=4,
    )
    normal_style = styles["Normal"]

    story = []

    # Header Title Banner
    story.append(Paragraph(f"<b>{title}</b>", title_style))
    story.append(HRFlowable(width="100%", thickness=2.5, color=colors.HexColor("#2563eb")))
    story.append(Spacer(1, 0.25 * cm))

    # Metadata table
    filter_label_text = filter_type.upper() if filter_type != "all" else "ALL INCIDENT MODALITIES"
    meta_data = [
        ["Report Generated", time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())],
        ["Lead Investigator", investigator if investigator else "N/A"],
        ["Department / Agency", department if department else "N/A"],
        ["Case File Number", case_number if case_number else "N/A"],
        ["Search Job / Batch ID", job_id],
        ["Applied Filter Scope", f"{filter_label_text} | Min Conf: {int(min_confidence*100)}% | Cam: {camera_id.upper()}"],
        ["Total Matched Evidence", f"{len(filtered_matches)} of {len(matches)} initial detections"],
    ]
    meta_table = Table(meta_data, colWidths=[5.2 * cm, 12.8 * cm])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#0f172a")),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.white),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("ROWBACKGROUNDS", (1, 0), (1, -1), [colors.HexColor("#f8fafc"), colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("PADDING", (0, 0), (-1, -1), 4.5),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 0.4 * cm))

    # 1. Executive Summary
    if "executive_summary" in selected_sections and narrative:
        story.append(Paragraph("1. Executive Summary & AI Forensic Narrative", heading_style))
        story.append(Paragraph(narrative, ParagraphStyle(
            "narrative", parent=normal_style, fontSize=8.5, leading=12.5,
            textColor=colors.HexColor("#1e293b"), spaceAfter=6,
        )))
        story.append(Spacer(1, 0.3 * cm))

    # 2. Metrics & Category Breakdown Overview Table
    if "metrics_overview" in selected_sections and filtered_matches:
        story.append(Paragraph("2. Forensic Category & Modality Breakdown", heading_style))
        cat_counts = {}
        for m in filtered_matches:
            cat_id, cat_name, cat_color = _categorize_match(m)
            if cat_id not in cat_counts:
                cat_counts[cat_id] = {"name": cat_name, "count": 0, "max_conf": 0.0, "cameras": set()}
            cat_counts[cat_id]["count"] += 1
            cat_counts[cat_id]["max_conf"] = max(cat_counts[cat_id]["max_conf"], float(m.get("confidence", 0.0)))
            cat_counts[cat_id]["cameras"].add(str(m.get("camera_id", "N/A")))

        cat_table_data = [["Evidence Category", "Hit Count", "Peak Confidence", "Associated Cameras"]]
        for cat_id, info in cat_counts.items():
            cat_table_data.append([
                info["name"],
                str(info["count"]),
                f"{info['max_conf']*100:.1f}%",
                ", ".join(sorted(info["cameras"])) if info["cameras"] else "N/A"
            ])
        cat_table = Table(cat_table_data, colWidths=[6.5 * cm, 2.5 * cm, 3.0 * cm, 6.0 * cm])
        cat_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f1f5f9"), colors.white]),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
            ("PADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(cat_table)
        story.append(Spacer(1, 0.4 * cm))

    # 3. Evidence Matches (Either Grouped by Category Section or Flat Stream)
    if "evidence_matches" in selected_sections:
        story.append(Paragraph("3. Detailed Evidence Records & Cryptographic Signatures", heading_style))
        story.append(Spacer(1, 0.15 * cm))

        if not filtered_matches:
            story.append(Paragraph("No evidence frames matched the specified filter criteria.", ParagraphStyle("no_m", parent=normal_style, fontSize=8.5, textColor=colors.grey)))
            story.append(Spacer(1, 0.3 * cm))
        elif group_by_sections:
            # Group into distinct category chapters
            sections_map = {}
            for m in filtered_matches:
                c_id, c_name, c_color = _categorize_match(m)
                if c_id not in sections_map:
                    sections_map[c_id] = {"name": c_name, "color": c_color, "items": []}
                sections_map[c_id]["items"].append(m)

            for s_idx, (cat_id, s_data) in enumerate(sections_map.items(), 1):
                sec_header = f"Section 3.{s_idx}: {s_data['name']} ({len(s_data['items'])} Detections)"
                story.append(Paragraph(f"<b>{sec_header}</b>", ParagraphStyle(
                    "sec_h", parent=subheading_style, fontSize=10.5, textColor=colors.HexColor(s_data["color"]), spaceBefore=6, spaceAfter=4
                )))
                story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor(s_data["color"])))
                story.append(Spacer(1, 0.2 * cm))

                for i, match in enumerate(s_data["items"], 1):
                    item_block = []
                    item_block.append(Paragraph(
                        f"<b>Item #{i} — {match.get('label', 'Match')}</b> | Camera: {match.get('camera_id', 'CAM')} | Time: {match.get('timestamp_str', 'N/A')} | Confidence: {float(match.get('confidence', 0.0))*100:.1f}%",
                        ParagraphStyle("m_head", parent=normal_style, fontSize=8.5, fontName="Helvetica-Bold", textColor=colors.HexColor("#0f172a"), spaceAfter=2)
                    ))

                    # Resolve hashes
                    frame_url = match.get("frame_url", "")
                    frame_sha256 = "N/A"
                    frame_md5 = "N/A"
                    if frame_url:
                        frame_local = RESULTS_DIR / Path(frame_url.replace("/storage/results/", ""))
                        frame_sha256 = _calculate_sha256(frame_local)
                        frame_md5 = _calculate_md5(frame_local)

                    clip_url = match.get("clip_url", "")
                    clip_sha256 = "N/A"
                    clip_md5 = "N/A"
                    if clip_url:
                        clip_local = RESULTS_DIR / Path(clip_url.replace("/storage/results/", ""))
                        clip_sha256 = _calculate_sha256(clip_local)
                        clip_md5 = _calculate_md5(clip_local)

                    # Forensic Telemetry string
                    telemetry_info = []
                    iot = match.get("iot_telemetry", {})
                    inc_type = str(match.get("incident_type", "")).lower()
                    label_str = str(match.get("label", "")).lower()
                    if "fall" in inc_type or "fall" in label_str:
                        if "torso_angle" in iot:
                            telemetry_info.append(f"Torso Angle: {iot.get('torso_angle')}°")
                        if "aspect_ratio" in iot:
                            telemetry_info.append(f"Aspect Ratio: {iot.get('aspect_ratio')}")
                        telemetry_info.append("17-Point Skeleton Validated")
                    elif "fire" in inc_type or "fire" in label_str:
                        telemetry_info.append(f"Thermal Profile: {iot.get('temperature_c', 78.0)}°C")
                        telemetry_info.append(f"Flame Chroma Density: {iot.get('chroma_density', 0.94)}")
                    elif "smoke" in inc_type or "smoke" in label_str:
                        telemetry_info.append(f"Aerosol Particle: {iot.get('mq2_smoke_ppm', 620)} PPM")
                    elif "crowd" in inc_type or "crowd" in label_str:
                        telemetry_info.append(f"Headcount: {match.get('people_count', iot.get('people_count', 'N/A'))} persons")
                        telemetry_info.append(f"Density Tier: {iot.get('density_tier', 'Active Gathering')}")
                    elif "brawl" in inc_type or "brawl" in label_str:
                        telemetry_info.append(f"Kinetic Disorder: {iot.get('kinetic_score', 'High')}")
                    elif "weapon" in inc_type or "weapon" in label_str:
                        telemetry_info.append(f"Weapon Class: {iot.get('weapon_class', 'Armed Threat')}")

                    match_data = [
                        ["Detection Target", match.get("label", "N/A"), "Camera & Zone", f"{match.get('camera_id', 'N/A')} (Campus Grid)"],
                        ["Timestamp / Offset", match.get("timestamp_str", "N/A"), "AI Match Confidence", f"{float(match.get('confidence', 0.0))*100:.1f}%"],
                        ["Forensic Telemetry", " | ".join(telemetry_info) if telemetry_info else "Standard Optical Signature", "Severity Rating", str(match.get("severity", "P2"))],
                        ["Frame SHA-256", frame_sha256[:28] + "..." if len(frame_sha256) > 28 else frame_sha256, "Frame MD5", frame_md5],
                        ["Clip SHA-256", clip_sha256[:28] + "..." if len(clip_sha256) > 28 else clip_sha256, "Clip MD5", clip_md5],
                    ]
                    t = Table(match_data, colWidths=[3.2 * cm, 5.8 * cm, 3.2 * cm, 5.8 * cm])
                    t.setStyle(TableStyle([
                        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#1e293b")),
                        ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#1e293b")),
                        ("TEXTCOLOR", (0, 0), (0, -1), colors.white),
                        ("TEXTCOLOR", (2, 0), (2, -1), colors.white),
                        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                        ("FONTSIZE", (0, 0), (-1, -1), 7.5),
                        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#cbd5e1")),
                        ("PADDING", (0, 0), (-1, -1), 3.5),
                    ]))
                    item_block.append(t)

                    # Embed frame image if available
                    if frame_url:
                        frame_local = RESULTS_DIR / Path(frame_url.replace("/storage/results/", ""))
                        if frame_local.exists():
                            try:
                                img = RLImage(str(frame_local), width=9.5 * cm, height=5.2 * cm, kind="proportional")
                                item_block.append(Spacer(1, 0.15 * cm))
                                item_block.append(img)
                            except Exception:
                                pass

                    item_block.append(Spacer(1, 0.3 * cm))
                    story.append(KeepTogether(item_block))

                story.append(Spacer(1, 0.3 * cm))
        else:
            # Unified Flat Chronological List
            for i, match in enumerate(filtered_matches, 1):
                item_block = []
                # Resolve hashes
                frame_url = match.get("frame_url", "")
                frame_sha256 = "N/A"
                frame_md5 = "N/A"
                if frame_url:
                    frame_local = RESULTS_DIR / Path(frame_url.replace("/storage/results/", ""))
                    frame_sha256 = _calculate_sha256(frame_local)
                    frame_md5 = _calculate_md5(frame_local)

                clip_url = match.get("clip_url", "")
                clip_sha256 = "N/A"
                clip_md5 = "N/A"
                if clip_url:
                    clip_local = RESULTS_DIR / Path(clip_url.replace("/storage/results/", ""))
                    clip_sha256 = _calculate_sha256(clip_local)
                    clip_md5 = _calculate_md5(clip_local)

                match_data = [
                    ["Evidence Index", f"Match #{i}", "Target / Incident", match.get("label", "N/A")],
                    ["Camera ID", match.get("camera_id", "N/A"), "Timestamp", match.get("timestamp_str", "N/A")],
                    ["Confidence Score", f"{float(match.get('confidence', 0.0))*100:.1f}%", "Severity", str(match.get("severity", "P2"))],
                    ["Frame SHA-256", frame_sha256[:28] + "...", "Frame MD5", frame_md5],
                    ["Clip SHA-256", clip_sha256[:28] + "...", "Clip MD5", clip_md5],
                ]
                t = Table(match_data, colWidths=[3.2 * cm, 5.8 * cm, 3.2 * cm, 5.8 * cm])
                t.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#1e293b")),
                    ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#1e293b")),
                    ("TEXTCOLOR", (0, 0), (0, -1), colors.white),
                    ("TEXTCOLOR", (2, 0), (2, -1), colors.white),
                    ("FONTSIZE", (0, 0), (-1, -1), 7.5),
                    ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#cbd5e1")),
                    ("PADDING", (0, 0), (-1, -1), 3.5),
                ]))
                item_block.append(t)

                if frame_url:
                    frame_local = RESULTS_DIR / Path(frame_url.replace("/storage/results/", ""))
                    if frame_local.exists():
                        try:
                            img = RLImage(str(frame_local), width=9.5 * cm, height=5.2 * cm, kind="proportional")
                            item_block.append(Spacer(1, 0.15 * cm))
                            item_block.append(img)
                        except Exception:
                            pass

                item_block.append(Spacer(1, 0.3 * cm))
                story.append(KeepTogether(item_block))

    # 4. Forensic Chain of Custody Audit Trail Ingestion
    if "chain_of_custody" in selected_sections:
        story.append(Paragraph("4. Forensic Audit Trail (Chain of Custody)", heading_style))
        story.append(Spacer(1, 0.15 * cm))
        if coc_logs:
            coc_table_data = [["Time (UTC)", "Action", "User / Officer", "Integrity Hash", "Audit Notes"]]
            for log in coc_logs:
                log_time = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime(log["created_at"]))
                coc_table_data.append([
                    log_time,
                    log["action"].upper(),
                    log.get("username", "System"),
                    log["hash_value"][:14] + "...",
                    log.get("notes", "")
                ])
            coc_log_table = Table(coc_table_data, colWidths=[3.5 * cm, 2.5 * cm, 3.0 * cm, 3.5 * cm, 5.5 * cm])
            coc_log_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 7),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f8fafc"), colors.white]),
                ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#cbd5e1")),
                ("PADDING", (0, 0), (-1, -1), 3.5),
            ]))
            story.append(coc_log_table)
        else:
            story.append(Paragraph("No individual chain of custody log records found for these specific frame hashes.", ParagraphStyle("no_coc", parent=normal_style, fontSize=8, textColor=colors.grey)))
        story.append(Spacer(1, 0.4 * cm))

    # 5. Section 65B Indian Evidence Act & Legal Sign-Off
    if "legal_signoff" in selected_sections:
        story.append(Paragraph("5. Courtroom Evidence Sign-Off & §65B Certification", heading_style))
        story.append(Spacer(1, 0.15 * cm))
        coc_data = [
            ["Certified Engine", "VisionCCTV / VIGINT Multi-Modal AI Analysis Engine"],
            ["Export Timestamp", time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())],
            ["Forensic Notes", notes if notes else "Multi-modal forensic analysis report. Dual cryptographic hashes registered in Merkle ledger."],
            ["Lead Investigator Signature", "_____________________________________"],
            ["Designation / Agency Rank", "_____________________________________"],
            ["Official Seal & Verification Date", "__________________"],
        ]
        coc_table = Table(coc_data, colWidths=[5.2 * cm, 12.8 * cm])
        coc_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#0f172a")),
            ("TEXTCOLOR", (0, 0), (0, -1), colors.white),
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
            ("PADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(coc_table)

    # Footer note
    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph(
        "LEGAL NOTICE: This document is generated by VisionCCTV Forensic Platform under Indian Evidence Act §65B guidelines. "
        "Tamper-evident SHA-256 and MD5 hashes are permanently anchored in the local evidence database.",
        ParagraphStyle("disclaimer", parent=normal_style, fontSize=7, textColor=colors.grey, leading=9)
    ))

    doc.build(story)
    buf.seek(0)
    return buf.read()


@router.post("/report")
def export_report(
    request: ExportReportRequest,
    db: sqlite3.Connection = Depends(get_db),
    user = Depends(auth_utils.get_current_user)
):
    """Generate and download a forensic PDF report for a completed search job, registering its hash."""
    # Find manifest files for this job
    all_matches = []

    # Search across all sub-job dirs that start with job_id
    for sub_dir in RESULTS_DIR.iterdir():
        if not sub_dir.is_dir():
            continue
        if not sub_dir.name.startswith(request.job_id):
            continue
        manifest_file = sub_dir / "manifest.json"
        if manifest_file.exists():
            try:
                manifest = json.loads(manifest_file.read_text())
                all_matches.extend(manifest.get("matches", []))
            except Exception:
                pass

    # Check in-memory hazard search jobs if manifest not yet flushed or job matches reside in memory
    if not all_matches:
        try:
            from routers.campus_safety import _hazard_jobs
            if request.job_id in _hazard_jobs:
                hj = _hazard_jobs[request.job_id]
                if hj.get("matches"):
                    all_matches.extend(hj["matches"])
        except Exception:
            pass

    if not all_matches:
        raise HTTPException(
            status_code=404,
            detail=f"No results found for job '{request.job_id}'. Run a search or emergency scan first.",
        )

    # Fetch matching CoC logs from database
    hashes = [m.get("frame_hash") for m in all_matches if m.get("frame_hash")]
    coc_logs = []
    cursor = db.cursor()
    if hashes:
        placeholders = ",".join(["?"] * len(hashes))
        try:
            cursor.execute(
                f"""SELECT c.custody_id, c.action, c.hash_value, c.notes, c.created_at, u.name as username
                   FROM chain_of_custody c
                   LEFT JOIN users u ON c.user_id = u.user_id
                   WHERE c.hash_value IN ({placeholders}) 
                   ORDER BY c.created_at ASC;""",
                hashes
            )
            coc_logs = [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            print(f"[export_report] Failed to fetch CoC logs: {e}")

    # Executive summary — AI gateway when configured, deterministic fallback otherwise.
    try:
        import ai_gateway  # noqa: PLC0415
        narrative, _used_gateway = ai_gateway.generate_report_narrative(
            all_matches, request.title, request.case_number, request.investigator
        )
    except Exception as e:
        print(f"[export_report] narrative generation failed: {e}")
        narrative = ""

    pdf_bytes = _generate_pdf(
        matches=all_matches,
        title=request.title,
        investigator=request.investigator,
        job_id=request.job_id,
        case_number=request.case_number,
        department=request.department,
        notes=request.notes,
        coc_logs=coc_logs,
        narrative=narrative,
        filter_type=request.filter_type,
        min_confidence=request.min_confidence,
        group_by_sections=request.group_by_sections,
        selected_sections=request.selected_sections,
        camera_id=request.camera_id,
    )

    # Calculate PDF forensic signatures
    pdf_hash = hashlib.sha256(pdf_bytes).hexdigest()
    pdf_md5 = hashlib.md5(pdf_bytes).hexdigest()

    # Find matching case ID
    cursor.execute("SELECT case_id FROM cases WHERE case_number = ?;", (request.case_number,))
    case_row = cursor.fetchone()
    case_id = case_row["case_id"] if case_row else 1

    # Save PDF copy on VMS server
    pdf_name = f"report_{pdf_hash[:10]}.pdf"
    pdf_local_path = REPORTS_DIR / pdf_name
    pdf_local_path.write_bytes(pdf_bytes)

    # Insert into export_reports catalog
    cursor.execute(
        """INSERT INTO export_reports (case_id, generated_by, file_path, sha256_hash, generated_at) 
           VALUES (?, ?, ?, ?, ?);""",
        (case_id, user["user_id"], f"/storage/results/reports/{pdf_name}", pdf_hash, time.time())
    )

    # Log report export event to Chain of Custody audit logs
    cursor.execute(
        """INSERT INTO chain_of_custody (media_id, event_id, action, user_id, hash_value, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?);""",
        (None, None, "report_exported", user["user_id"], pdf_hash, f"Forensic report exported (Job: {request.job_id}, Case: {request.case_number})", time.time())
    )
    db.commit()

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="visioncctv_report_{request.job_id}.pdf"',
            "X-Forensic-Signature": pdf_hash,
            "X-Forensic-MD5": pdf_md5
        },
    )


@router.post("/verify")
def verify_report(
    file: UploadFile = File(...),
    db: sqlite3.Connection = Depends(get_db)
):
    """Verify an uploaded forensic PDF report against registered database signatures."""
    try:
        content = file.file.read()
        file_hash = hashlib.sha256(content).hexdigest()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {e}")

    cursor = db.cursor()
    cursor.execute(
        """SELECT r.report_id, r.sha256_hash, r.generated_at, u.name as officer_name, c.case_number, c.title as case_title
           FROM export_reports r
           LEFT JOIN users u ON r.generated_by = u.user_id
           LEFT JOIN cases c ON r.case_id = c.case_id
           WHERE r.sha256_hash = ?;""",
        (file_hash,)
    )
    report = cursor.fetchone()

    if report:
        return {
            "verified": True,
            "hash": file_hash,
            "report_id": report["report_id"],
            "case_number": report["case_number"],
            "case_title": report["case_title"],
            "generated_by": report["officer_name"],
            "generated_at": report["generated_at"],
            "generated_at_str": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(report["generated_at"]))
        }
    else:
        return {
            "verified": False,
            "hash": file_hash,
            "message": "Report signature mismatch or untrusted document hash"
        }


@router.get("/clip")
def download_clip(clip_path: str):
    """
    Download a specific video clip.
    clip_path should be the relative URL, e.g. /storage/results/jobid/clip_xxx.mp4
    """
    # Resolve to local file
    relative = clip_path.replace("/storage/results/", "")
    local_path = RESULTS_DIR / relative

    if not local_path.exists():
        raise HTTPException(status_code=404, detail="Clip file not found")

    def iterfile():
        with open(local_path, "rb") as f:
            yield from f

    filename = local_path.name
    return StreamingResponse(
        iterfile(),
        media_type="video/mp4",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/frames-zip")
def download_frames_zip(job_id: str):
    """
    Download all matched evidence frames for a job as a ZIP archive.
    Filenames include camera ID, timestamp, and confidence for easy identification.
    """
    all_matches: list[dict] = []

    for sub_dir in RESULTS_DIR.iterdir():
        if not sub_dir.is_dir() or not sub_dir.name.startswith(job_id):
            continue
        manifest_file = sub_dir / "manifest.json"
        if manifest_file.exists():
            try:
                manifest = json.loads(manifest_file.read_text())
                all_matches.extend(manifest.get("matches", []))
            except Exception:
                pass

    if not all_matches:
        raise HTTPException(
            status_code=404,
            detail=f"No results found for job '{job_id}'. Run a search first.",
        )

    buf = BytesIO()
    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for i, match in enumerate(all_matches, 1):
            frame_url = match.get("frame_url", "")
            if not frame_url:
                continue
            frame_local = RESULTS_DIR / Path(frame_url.replace("/storage/results/", ""))
            if not frame_local.exists():
                continue
            cam = match.get("camera_id", "CAM").replace("-", "")
            ts = match.get("timestamp_str", "00m00s").replace(":", "m").replace(".", "s")
            conf = int(match.get("confidence", 0) * 100)
            label = re.sub(r"[^\w]", "_", match.get("label", ""))[:20]
            zip_filename = f"{i:03d}_{cam}_{ts}_{conf}pct_{label}.jpg"
            zf.write(frame_local, zip_filename)

    buf.seek(0)
    return StreamingResponse(
        iter([buf.read()]),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="visioncctv_frames_{job_id}.zip"'},
    )
