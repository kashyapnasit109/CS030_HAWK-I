"use client";

import { useState } from "react";
import { MatchResult, submitModelFeedback } from "@/lib/api";
import { showToast } from "@/components/ToastProvider";
import { CloseIcon, SparklesIcon, CheckIcon, AlertIcon } from "@/components/Icons";

interface FeedbackModalProps {
  match: MatchResult;
  searchType?: string;
  initialRating?: "good" | "bad";
  onClose: () => void;
  onSuccess?: (rating: "good" | "bad", correction?: string) => void;
}

export default function FeedbackModal({
  match,
  searchType = "face_recognition",
  initialRating = "bad",
  onClose,
  onSuccess,
}: FeedbackModalProps) {
  const [rating, setRating] = useState<"good" | "bad">(initialRating);
  const [correctionLabel, setCorrectionLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const box = match.box || (match.boxes && match.boxes[0]);
      await submitModelFeedback({
        reference_label: match.label,
        predicted_label: match.label,
        rating,
        search_type: searchType,
        correction_label: correctionLabel.trim() || undefined,
        frame_url: match.frame_url || undefined,
        frame_hash: match.frame_hash || undefined,
        camera_id: match.camera_id || undefined,
        timestamp_val: match.timestamp,
        timestamp_str: match.timestamp_str,
        box: box ? { x1: box.x1, y1: box.y1, x2: box.x2, y2: box.y2 } : undefined,
        notes: notes.trim() || undefined,
      });

      if (rating === "bad") {
        showToast(
          `AI Active Learning: Hard negative rule created. '${match.label}' false positive will be suppressed in future scans.`,
          "success"
        );
      } else {
        showToast(
          `AI Active Learning: Verified positive exemplar added for '${match.label}'. Multi-view prototype gallery updated.`,
          "success"
        );
      }

      if (onSuccess) {
        onSuccess(rating, correctionLabel.trim() || undefined);
      }
      onClose();
    } catch (err: any) {
      showToast(err.message || "Failed to submit feedback", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        zIndex: 1400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#0F172A",
          border: "1px solid rgba(59,130,246,0.4)",
          borderRadius: 14,
          maxWidth: 520,
          width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.9), 0 0 30px rgba(59,130,246,0.2)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            background: "rgba(255,255,255,0.03)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "rgba(59,130,246,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#60A5FA",
              }}
            >
              <SparklesIcon size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: "0.98rem", fontWeight: 800, margin: 0, color: "#FFFFFF" }}>
                AI Active Learning & Model Feedback
              </h3>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                Teach the neural network to prevent false matches & improve accuracy
              </div>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm">
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: "20px" }}>
          {/* Target Detection Banner */}
          <div
            style={{
              background: "rgba(0,0,0,0.4)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 8,
              padding: "12px 14px",
              marginBottom: 18,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                Candidate Detection
              </div>
              <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#60A5FA" }}>
                {match.label} <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>({(match.confidence * 100).toFixed(1)}% match)</span>
              </div>
              <div style={{ fontSize: "0.72rem", color: "#94A3B8" }}>
                Camera: {match.camera_id} · Time: {match.timestamp_str}
              </div>
            </div>
            <span className="badge badge-blue">512-D VECTOR</span>
          </div>

          {/* Rating Selection */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#E2E8F0", marginBottom: 8 }}>
              How should the model evaluate this detection?
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button
                type="button"
                onClick={() => setRating("good")}
                style={{
                  padding: "12px",
                  borderRadius: 8,
                  border: `2px solid ${rating === "good" ? "#10B981" : "rgba(255,255,255,0.1)"}`,
                  background: rating === "good" ? "rgba(16,185,129,0.15)" : "rgba(0,0,0,0.3)",
                  color: rating === "good" ? "#34D399" : "var(--text-secondary)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ fontSize: "1.2rem" }}>👍</span>
                <span>Correct Match</span>
                <span style={{ fontSize: "0.65rem", fontWeight: 400, color: "var(--text-muted)" }}>
                  Add as positive exemplar
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRating("bad")}
                style={{
                  padding: "12px",
                  borderRadius: 8,
                  border: `2px solid ${rating === "bad" ? "#EF4444" : "rgba(255,255,255,0.1)"}`,
                  background: rating === "bad" ? "rgba(239,68,68,0.15)" : "rgba(0,0,0,0.3)",
                  color: rating === "bad" ? "#F87171" : "var(--text-secondary)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ fontSize: "1.2rem" }}>👎</span>
                <span>Incorrect (False Positive)</span>
                <span style={{ fontSize: "0.65rem", fontWeight: 400, color: "var(--text-muted)" }}>
                  Suppress in future scans
                </span>
              </button>
            </div>
          </div>

          {/* Optional Correction Target */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#94A3B8", marginBottom: 6 }}>
              Correct Identity (Optional - if this is actually someone else)
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. John Doe, Suspect #2, Bystander"
              value={correctionLabel}
              onChange={(e) => setCorrectionLabel(e.target.value)}
              style={{ width: "100%", fontSize: "0.82rem" }}
            />
          </div>

          {/* Operator Notes */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#94A3B8", marginBottom: 6 }}>
              Operator Suggestion / Context Notes (Optional)
            </label>
            <textarea
              className="input-field"
              rows={2}
              placeholder="e.g. Lighting reflection caused false eye detection; wrong jawline"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: "100%", fontSize: "0.8rem", resize: "none" }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm" disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={submitting}
              style={{
                background: rating === "bad" ? "#EF4444" : "#10B981",
                borderColor: rating === "bad" ? "#EF4444" : "#10B981",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontWeight: 800,
              }}
            >
              <SparklesIcon size={14} />
              {submitting ? "Updating Model..." : rating === "bad" ? "Learn & Suppress False Positive" : "Learn & Add Positive Prototype"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
