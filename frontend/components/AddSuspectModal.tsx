"use client";

import { useState, useEffect, useRef } from "react";
import { uploadReference, addReferenceFromUrl, ReferenceMeta, resolveStorageUrl } from "@/lib/api";
import { showToast } from "./ToastProvider";
import {
  CloseIcon,
  UploadIcon,
  UserIcon,
  CarIcon,
  TargetIcon,
  CheckIcon,
  ImageIcon,
  SparklesIcon,
} from "./Icons";

interface AddSuspectModalProps {
  initialImageUrl?: string;
  initialLabel?: string;
  onClose: () => void;
  onSuccess?: (ref: ReferenceMeta) => void;
}

export default function AddSuspectModal({
  initialImageUrl,
  initialLabel = "",
  onClose,
  onSuccess,
}: AddSuspectModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(initialImageUrl ? resolveStorageUrl(initialImageUrl) : "");
  const [label, setLabel] = useState<string>(initialLabel);
  const [subjectType, setSubjectType] = useState<"person" | "vehicle" | "object">("person");
  const [loading, setLoading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clipboard paste event listener for screenshot pasting (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const pastedFile = items[i].getAsFile();
          if (pastedFile) {
            setFile(pastedFile);
            setPreviewUrl(URL.createObjectURL(pastedFile));
            showToast("Screenshot pasted from clipboard!", "success");
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  const handleSave = async () => {
    if (!label.trim()) {
      showToast("Please enter a label for the suspect image", "error");
      return;
    }
    if (!file && !previewUrl && !initialImageUrl) {
      showToast("Please select, paste, or provide an image", "error");
      return;
    }

    setLoading(true);
    try {
      let res: { success: boolean; reference: ReferenceMeta };
      if (file) {
        res = await uploadReference(file, label.trim());
      } else if (initialImageUrl || previewUrl) {
        const targetUrl = initialImageUrl || previewUrl;
        res = await addReferenceFromUrl(targetUrl, label.trim(), subjectType);
      } else {
        throw new Error("No image source available");
      }

      showToast(`Suspect image "${label.trim()}" saved successfully!`, "success");
      if (onSuccess) onSuccess(res.reference);
      onClose();
    } catch (err: any) {
      showToast(err.message || "Failed to save suspect image", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.85)",
        zIndex: 500,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          maxWidth: 620, width: "100%",
          boxShadow: "0 32px 80px rgba(0,0,0,0.9), 0 0 60px rgba(59,130,246,0.15)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 24px",
          background: "var(--bg-elevated)",
          borderBottom: "1px solid var(--border)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "var(--accent-dim)", color: "var(--accent)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <UserIcon size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text-primary)" }}>
                Add Suspect Image & Label
              </div>
              <div style={{ fontSize: "0.73rem", color: "var(--text-muted)" }}>
                Upload photo, paste screenshot (Ctrl+V), or tag evidence frame
              </div>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            style={{ color: "var(--text-muted)", padding: 6 }}
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Image Preview & Upload Dropzone */}
          <div>
            <label className="input-label" style={{ marginBottom: 8, display: "block" }}>
              1. Suspect Photo / Screenshot Preview
            </label>

            {previewUrl ? (
              <div style={{
                position: "relative", borderRadius: 10, overflow: "hidden",
                border: "1.5px solid var(--accent)", background: "#000",
                maxHeight: 240, display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <img
                  src={previewUrl}
                  alt="Suspect Preview"
                  style={{ width: "100%", maxHeight: 240, objectFit: "contain", display: "block" }}
                />
                <button
                  onClick={() => { setFile(null); setPreviewUrl(""); }}
                  className="btn btn-sm btn-ghost"
                  style={{
                    position: "absolute", top: 8, right: 8,
                    background: "rgba(0,0,0,0.75)", color: "white", borderRadius: "50%",
                    width: 28, height: 28, padding: 0, display: "flex", alignItems: "center", justifyContent: "center"
                  }}
                >
                  <CloseIcon size={14} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: "2px dashed var(--border)", borderRadius: 10,
                  padding: "32px 20px", textAlign: "center", cursor: "pointer",
                  background: "rgba(255,255,255,0.01)", transition: "all 0.2s"
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: "50%", background: "var(--accent-dim)",
                  color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 12px"
                }}>
                  <UploadIcon size={20} />
                </div>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)" }}>
                  Click to Browse Photo or Drag File Here
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
                  Tip: You can also press <strong style={{ color: "var(--accent)" }}>Ctrl + V</strong> to paste a screenshot directly!
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFileSelect}
            />
          </div>

          {/* Suspect Label Input */}
          <div>
            <label className="input-label" style={{ marginBottom: 6, display: "block" }}>
              2. Assign Suspect Name / Label *
            </label>
            <input
              className="input-field"
              placeholder="e.g. Suspect #1 - Red Jacket, John Doe, Plate GJ-01-AB-1234"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              style={{ fontSize: "0.85rem" }}
            />
            {/* Quick Tag Suggestions */}
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Quick tags:</span>
              {["Suspect #1", "Unidentified Person", "Vehicle Plate", "Person of Interest"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setLabel(tag)}
                  style={{
                    padding: "2px 8px", borderRadius: 100, fontSize: "0.68rem",
                    background: "var(--bg-elevated)", border: "1px solid var(--border)",
                    color: "var(--text-secondary)", cursor: "pointer"
                  }}
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Subject Classification */}
          <div>
            <label className="input-label" style={{ marginBottom: 6, display: "block" }}>
              3. Subject Category
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { id: "person", label: "Person / Suspect", icon: <UserIcon size={14} /> },
                { id: "vehicle", label: "Vehicle / Plate", icon: <CarIcon size={14} /> },
                { id: "object", label: "Object / Evidence", icon: <TargetIcon size={14} /> },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSubjectType(c.id as any)}
                  style={{
                    flex: 1, padding: "8px 10px", borderRadius: 6, cursor: "pointer",
                    background: subjectType === c.id ? "var(--accent-dim)" : "var(--bg-elevated)",
                    border: `1px solid ${subjectType === c.id ? "var(--accent)" : "var(--border)"}`,
                    fontSize: "0.75rem", fontWeight: 700,
                    color: subjectType === c.id ? "var(--accent)" : "var(--text-secondary)",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                  }}
                >
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={loading}
              style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              {loading ? (
                "Saving Suspect Image..."
              ) : (
                <><CheckIcon size={16} /> Save to Suspect Database</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

