"use client";

import { useState } from "react";
import Link from "next/link";
import ToastProvider, { showToast } from "@/components/ToastProvider";
import { ShieldIcon, FileTextIcon } from "@/components/Icons";

interface VerificationSuccess {
  verified: true;
  hash: string;
  report_id: number;
  case_number: string;
  case_title: string;
  generated_by: string;
  generated_at_str: string;
}

interface VerificationFailure {
  verified: false;
  hash: string;
  message: string;
}

type VerificationResult = VerificationSuccess | VerificationFailure;

export default function VerifyPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      setResult(null);
    }
  };

  const handleVerify = async () => {
    if (!file) return;
    setLoading(true);
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/api/export/verify", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Verification server returned an error");
      }

      const data = await res.json();
      setResult(data);
      if (data.verified) {
        showToast("Forensic certificate verified successfully!", "success");
      } else {
        showToast("Signature mismatch! Document may be tampered.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to connect to verification server", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToastProvider>
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          background: "#0B0F14",
          fontFamily: "Inter, sans-serif",
          padding: "20px",
          color: "var(--text-primary)"
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "600px",
            background: "rgba(18, 24, 33, 0.8)",
            backdropFilter: "blur(12px)",
            border: "1.5px solid rgba(45, 212, 191, 0.2)",
            borderRadius: "20px",
            padding: "40px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.6), 0 0 25px rgba(45, 212, 191, 0.08)",
            display: "flex",
            flexDirection: "column",
            gap: "24px"
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "60px",
                height: "60px",
                background: "linear-gradient(135deg, var(--cyan), #60A5FA)",
                borderRadius: "16px",
                marginBottom: "16px",
                boxShadow: "0 0 20px rgba(45, 212, 191, 0.3)"
              }}
            >
              <ShieldIcon size={30} style={{ color: "#0B0F14" }} />
            </div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 900, marginBottom: "8px" }}>
              Forensic Report Verification
            </h1>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Upload or drag-and-drop a SentinelVision case PDF to verify its admissibility and cryptographic signature matching the central registry.
            </p>
          </div>

          {/* Upload Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: isDragOver ? "2px dashed var(--cyan)" : "2px dashed rgba(255,255,255,0.15)",
              background: isDragOver ? "rgba(45,212,191,0.04)" : "rgba(255,255,255,0.01)",
              borderRadius: "12px",
              padding: "30px 20px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.15s ease-in-out",
              position: "relative"
            }}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".pdf"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
              <FileTextIcon size={32} style={{ color: file ? "var(--cyan)" : "var(--text-muted)" }} />
            </div>
            <div style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "4px" }}>
              {file ? file.name : "Select case report PDF file"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {file ? `${(file.size / 1024).toFixed(1)} KB` : "Drag and drop PDF report anywhere here"}
            </div>
          </div>

          {/* Verify Action Button */}
          {file && !result && (
            <button
              onClick={handleVerify}
              disabled={loading}
              style={{
                width: "100%",
                background: "linear-gradient(135deg, #3B82F6, #1D4ED8)",
                color: "#0B0F14",
                border: "none",
                borderRadius: "8px",
                padding: "12px",
                fontSize: "0.95rem",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(45, 212, 191, 0.25)"
              }}
            >
              {loading ? "Calculating Document Signatures..." : "Verify Certificate Authenticity"}
            </button>
          )}

          {/* Results Display */}
          {result && (
            <div
              style={{
                border: `1.5px solid ${result.verified ? "var(--green)" : "rgba(239, 68, 68, 0.4)"}`,
                background: result.verified ? "rgba(16, 185, 129, 0.03)" : "rgba(239, 68, 68, 0.03)",
                borderRadius: "12px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "14px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: result.verified ? "var(--green)" : "#ef4444",
                    color: "#0B0F14",
                    fontWeight: "bold",
                    fontSize: "0.9rem"
                  }}
                >
                  {result.verified ? "✓" : "✕"}
                </span>
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: "1.05rem",
                    color: result.verified ? "var(--green)" : "#ef4444"
                  }}
                >
                  {result.verified ? "VERIFIED ADMISSIBLE EVIDENCE" : "SIGNATURE VERIFICATION FAILED"}
                </span>
              </div>

              {result.verified ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.85rem" }}>
                  <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "6px" }}>
                    <span style={{ color: "var(--text-muted)", width: "120px", flexShrink: 0 }}>Case Reference:</span>
                    <span style={{ fontWeight: 700 }}>{result.case_number}</span>
                  </div>
                  <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "6px" }}>
                    <span style={{ color: "var(--text-muted)", width: "120px", flexShrink: 0 }}>Case Name:</span>
                    <span>{result.case_title}</span>
                  </div>
                  <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "6px" }}>
                    <span style={{ color: "var(--text-muted)", width: "120px", flexShrink: 0 }}>Generating Officer:</span>
                    <span>{result.generated_by}</span>
                  </div>
                  <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "6px" }}>
                    <span style={{ color: "var(--text-muted)", width: "120px", flexShrink: 0 }}>Date Certified:</span>
                    <span className="mono">{result.generated_at_str}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ color: "var(--text-muted)" }}>Cryptographic SHA-256 Signature:</span>
                    <span className="mono" style={{ fontSize: "0.75rem", wordBreak: "break-all", background: "rgba(0,0,0,0.2)", padding: "6px", borderRadius: "4px", color: "var(--cyan)", border: "1px solid rgba(59,130,246,0.1)" }}>
                      {result.hash}
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.85rem" }}>
                  <p style={{ color: "var(--text-secondary)" }}>
                    {result.message}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ color: "var(--text-muted)" }}>Uploaded Document SHA-256 Hash:</span>
                    <span className="mono" style={{ fontSize: "0.75rem", wordBreak: "break-all", background: "rgba(0,0,0,0.2)", padding: "6px", borderRadius: "4px", color: "#ef4444" }}>
                      {result.hash}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action links */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "18px" }}>
            <Link href="/" style={{ fontSize: "0.85rem", color: "var(--cyan)", fontWeight: 600 }}>
              ← Return to Dashboard
            </Link>
            <button
              onClick={() => { setFile(null); setResult(null); }}
              style={{ background: "transparent", color: "var(--text-muted)", fontSize: "0.8rem", cursor: "pointer" }}
            >
              Clear Upload
            </button>
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}
