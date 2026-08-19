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
) -> bytes:
    """Generate a forensic PDF report from match results with dual signatures and CoC log integration."""
    from reportlab.lib import colors  # noqa: PLC0415
    from reportlab.lib.pagesizes import A4  # noqa: PLC0415
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle  # noqa: PLC0415
    from reportlab.lib.units import cm  # noqa: PLC0415
    from reportlab.platypus import (  # noqa: PLC0415
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image as RLImage
    )

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=2.0 * cm,
        bottomMargin=2.0 * cm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "title",
        parent=styles["Title"],
        fontSize=20,
        spaceAfter=6,
        textColor=colors.HexColor("#1a1a2e"),
    )
    heading_style = ParagraphStyle(
        "heading",
        parent=styles["Heading2"],
        fontSize=12,
        textColor=colors.HexColor("#16213e"),
        spaceBefore=10,
        spaceAfter=6,
    )
    normal_style = styles["Normal"]

    story = []

    # Header
    story.append(Paragraph(title, title_style))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#e94560")))
    story.append(Spacer(1, 0.3 * cm))

    # Metadata table
    meta_data = [
        ["Report Generated", time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())],
        ["Investigator", investigator],
        ["Department / Agency", department],
        ["Case Number", case_number],
        ["Job ID", job_id],
        ["Total Matches Found", str(len(matches))],
    ]
    meta_table = Table(meta_data, colWidths=[5 * cm, 13 * cm])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#16213e")),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.white),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (1, 0), (1, -1), [colors.HexColor("#f8f9fa"), colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#dee2e6")),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 0.5 * cm))

    # Executive Summary (AI-generated when a gateway is configured, else deterministic)
    if narrative:
        story.append(Paragraph("Executive Summary", heading_style))
        story.append(Paragraph(narrative, ParagraphStyle(
            "narrative", parent=normal_style, fontSize=9, leading=13,
            textColor=colors.HexColor("#1a1a2e"), spaceAfter=6,
        )))
        story.append(Spacer(1, 0.4 * cm))

    # Matches
    story.append(Paragraph(f"Evidence Frames ({len(matches)} matches)", heading_style))
    story.append(Spacer(1, 0.2 * cm))

    for i, match in enumerate(matches, 1):
        story.append(Paragraph(f"Evidence Match #{i}", ParagraphStyle(
            "match_title", parent=styles["Heading3"], textColor=colors.HexColor("#e94560"), fontSize=10, spaceBefore=4, spaceAfter=2
        )))

        # Resolve hashes (Dual SHA-256 + MD5 signature checking)
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
            ["Camera ID", match.get("camera_id", "N/A")],
            ["Timestamp", match.get("timestamp_str", "N/A")],
            ["Label / Query", match.get("label", "N/A")],
            ["Confidence Score", f"{match.get('confidence', 0):.2%}"],
            ["Search Type", match.get("search_type", "N/A")],
            ["Frame SHA-256", frame_sha256],
            ["Frame MD5", frame_md5],
            ["Clip SHA-256", clip_sha256],
            ["Clip MD5", clip_md5],
        ]
        t = Table(match_data, colWidths=[5 * cm, 13 * cm])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#0f3460")),
            ("TEXTCOLOR", (0, 0), (0, -1), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#dee2e6")),
            ("PADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(t)

        # Embed frame image if it exists
        if frame_url:
            frame_local = RESULTS_DIR / Path(frame_url.replace("/storage/results/", ""))
            if frame_local.exists():
                try:
                    img = RLImage(str(frame_local), width=8 * cm, height=4.5 * cm, kind="proportional")
                    story.append(Spacer(1, 0.2 * cm))
                    story.append(img)
                except Exception:
                    pass

        story.append(Spacer(1, 0.4 * cm))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#dee2e6")))
        story.append(Spacer(1, 0.3 * cm))

    # Forensic Chain of Custody Audit Trail Ingestion
    story.append(Paragraph("Forensic Audit Trail (Chain of Custody)", heading_style))
    story.append(Spacer(1, 0.2 * cm))
    if coc_logs:
        coc_table_data = [["Time (UTC)", "Action", "User / Officer", "Hash Value", "Notes"]]
        for log in coc_logs:
            log_time = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime(log["created_at"]))
            coc_table_data.append([
                log_time,
                log["action"].upper(),
                log.get("username", "System"),
                log["hash_value"][:16] + "...",
                log.get("notes", "")
            ])
        coc_log_table = Table(coc_table_data, colWidths=[3.5 * cm, 2.5 * cm, 3.0 * cm, 3.5 * cm, 5.5 * cm])
        coc_log_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#16213e")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 7),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f8f9fa"), colors.white]),
            ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#dee2e6")),
            ("PADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(coc_log_table)
    else:
        story.append(Paragraph("No forensic chain of custody entries recorded for these evidence files.", ParagraphStyle("no_coc", parent=normal_style, fontSize=8, textColor=colors.grey)))
    story.append(Spacer(1, 0.5 * cm))

    # Forensic Verification Sign-Off
    story.append(Paragraph("Case Verification Sign-Off", heading_style))
    story.append(Spacer(1, 0.2 * cm))
    coc_data = [
        ["Released By (AI System)", "VisionCCTV Analysis Engine"],
        ["Released Date/Time (UTC)", time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime())],
        ["Case Notes / Description", notes if notes else "No additional notes provided."],
        ["Auditor Signature", "_____________________________________"],
        ["Auditor Rank / Department", "_____________________________________"],
        ["Verification Date", "__________________"],
    ]
    coc_table = Table(coc_data, colWidths=[5 * cm, 13 * cm])
    coc_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#16213e")),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#dee2e6")),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(coc_table)

    # Footer note
    story.append(Spacer(1, 0.6 * cm))
    story.append(Paragraph(
        "NOTICE: This report is generated by VisionCCTV AI Analysis Tool. "
        "All evidence should be verified by a qualified forensic analyst before use in legal proceedings.",
        ParagraphStyle("disclaimer", parent=normal_style, fontSize=7, textColor=colors.grey)
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
            manifest = json.loads(manifest_file.read_text())
            all_matches.extend(manifest.get("matches", []))

    if not all_matches:
        raise HTTPException(
            status_code=404,
            detail=f"No results found for job '{request.job_id}'. Run a search first.",
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
        all_matches,
        request.title,
        request.investigator,
        request.job_id,
        case_number=request.case_number,
        department=request.department,
        notes=request.notes,
        coc_logs=coc_logs,
        narrative=narrative,
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
