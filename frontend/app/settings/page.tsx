"use client";

import { useState, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import ToastProvider, { showToast } from "@/components/ToastProvider";

export default function SettingsPage() {
  // MFA States
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaEnrollUrl, setMfaEnrollUrl] = useState("");
  const [enrolling, setEnrolling] = useState(false);

  // Verification States
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEnrollMfa = async () => {
    setEnrolling(true);
    setMfaSecret("");
    setMfaEnrollUrl("");

    try {
      const token = localStorage.getItem("visioncctv_token");
      const res = await fetch("http://localhost:8000/api/auth/mfa/enroll", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to enroll in MFA");
      }

      const data = await res.json();
      setMfaSecret(data.secret);
      setMfaEnrollUrl(data.otpauth_url);
      showToast("MFA Enrollment initiated. Scan QR or copy key.", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setEnrolling(false);
    }
  };

  const handleVerifyUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleVerifyFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVerifying(true);
    setVerifyResult(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/api/export/verify", {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to verify report");
      }

      const data = await res.json();
      setVerifyResult(data);
      if (data.verified) {
        showToast("Report signature verified successfully!", "success");
      } else {
        showToast("Report signature invalid or untrusted!", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to process PDF verification", "error");
    } finally {
      setVerifying(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <ToastProvider>
      <AppLayout>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ color: "var(--text-primary)", fontSize: "1.75rem", fontWeight: 700, margin: 0 }}>System Settings &amp; Security</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "4px" }}>Configure Multi-Factor Authentication and audit PDF report signatures.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "flex-start" }}>
          {/* Left Column: MFA Enrollment */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "24px" }}>
            <h2 style={{ color: "var(--text-primary)", fontSize: "1.2rem", fontWeight: 700, margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🔐</span> Multi-Factor Authentication (MFA)
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.5, marginBottom: "20px" }}>
              Enforce time-based one-time password (TOTP) codes on login. This prevents unauthorized access to forensic databases even if passwords are leaked.
            </p>

            {!mfaSecret ? (
              <button
                onClick={handleEnrollMfa}
                disabled={enrolling}
                style={{ background: "var(--accent)", color: "#0B0F14", border: "none", borderRadius: "8px", padding: "12px 24px", fontWeight: "bold", fontSize: "0.9rem", cursor: "pointer" }}
              >
                {enrolling ? "Enrolling..." : "Enroll in MFA / TOTP"}
              </button>
            ) : (
              <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "8px", padding: "16px" }}>
                <span style={{ display: "block", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "bold", marginBottom: "8px" }}>
                  MFA Secret Key
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                  <code style={{ background: "#0B0F14", border: "1px solid var(--border)", padding: "8px 12px", borderRadius: "4px", color: "var(--accent)", fontSize: "1.1rem", fontWeight: "bold", letterSpacing: "1px", flex: 1 }}>
                    {mfaSecret}
                  </code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(mfaSecret); showToast("Secret key copied!", "success"); }}
                    style={{ background: "transparent", color: "var(--text-muted)", border: "none", cursor: "pointer", fontSize: "1.2rem" }}
                    title="Copy key"
                  >
                    📋
                  </button>
                </div>

                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  <p style={{ margin: "0 0 8px 0" }}><strong>Setup Steps:</strong></p>
                  <ol style={{ paddingLeft: "16px", margin: 0 }}>
                    <li>Open <strong>Google Authenticator</strong> or any TOTP client.</li>
                    <li>Add an account manually and enter the secret key above.</li>
                    <li>Verify the codes generated match the SentinelVision login prompts.</li>
                  </ol>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Report Verification */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "24px" }}>
            <h2 style={{ color: "var(--text-primary)", fontSize: "1.2rem", fontWeight: 700, margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🛡️</span> Forensic PDF Verification
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.5, marginBottom: "20px" }}>
              Upload any SentinelVision-generated PDF report to compute its SHA-256 hash and verify its integrity against the VMS signing catalog.
            </p>

            <div 
              onClick={handleVerifyUploadClick}
              style={{ border: "2px dashed var(--border)", borderRadius: "8px", padding: "32px 20px", textAlign: "center", cursor: "pointer", background: "var(--bg-elevated)", transition: "var(--transition)" }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--accent)"}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border)"}
            >
              <span style={{ fontSize: "2rem", display: "block", marginBottom: "8px" }}>📄</span>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                {verifying ? "Hashing & Verifying..." : "Click or drag PDF report to verify"}
              </span>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginTop: "4px" }}>
                Accepts only signed forensic PDFs
              </span>
            </div>
            <input 
              type="file" 
              ref={fileInputRef}
              accept="application/pdf" 
              onChange={handleVerifyFileChange}
              style={{ display: "none" }}
            />

            {verifyResult && (
              <div 
                style={{ 
                  marginTop: "20px", 
                  padding: "16px", 
                  borderRadius: "8px", 
                  border: `1px solid ${verifyResult.verified ? "rgba(74,222,128,0.3)" : "rgba(239,68,68,0.3)"}`, 
                  background: verifyResult.verified ? "rgba(74,222,128,0.05)" : "rgba(239,68,68,0.05)" 
                }}
              >
                {verifyResult.verified ? (
                  <div>
                    <h3 style={{ color: "var(--green)", fontSize: "0.95rem", margin: "0 0 12px 0" }}>✅ Report Signature Verified</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      <div>Case Number: <strong style={{ color: "var(--text-primary)" }}>{verifyResult.case_number}</strong></div>
                      <div>Case Title: <strong style={{ color: "var(--text-primary)" }}>{verifyResult.case_title}</strong></div>
                      <div>Authorized By: <strong style={{ color: "var(--text-primary)" }}>{verifyResult.generated_by}</strong></div>
                      <div>Generated On: <strong style={{ color: "var(--text-primary)" }}>{verifyResult.generated_at_str}</strong></div>
                      <div style={{ wordBreak: "break-all", fontSize: "0.7rem", color: "var(--text-muted)" }}>Hash: {verifyResult.hash}</div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 style={{ color: "#EF4444", fontSize: "0.95rem", margin: "0 0 6px 0" }}>❌ Verification Failed</h3>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", margin: "0 0 8px 0" }}>{verifyResult.message}</p>
                    <div style={{ wordBreak: "break-all", fontSize: "0.7rem", color: "var(--text-muted)" }}>Computed Hash: {verifyResult.hash}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </AppLayout>
    </ToastProvider>
  );
}
