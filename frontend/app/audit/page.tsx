"use client";

import { useEffect, useState, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import ToastProvider, { showToast } from "@/components/ToastProvider";
import { ShieldIcon, ActivityIcon } from "@/components/Icons";

interface AuditLog {
  audit_id: number;
  ts: number;
  user: string;
  action: string;
  detail: string;
}

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAuditLogs = useCallback(async () => {
    try {
      const token = localStorage.getItem("visioncctv_token");
      const res = await fetch("http://localhost:8000/api/audit/list", {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Access Denied: Admin or Auditor role required.");
        }
        throw new Error("Failed to load system audit trail");
      }

      const data = await res.json();
      setLogs(data.logs);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  return (
    <ToastProvider>
      <AppLayout>
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ color: "var(--text-primary)", fontSize: "1.75rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <ShieldIcon size={28} style={{ color: "var(--accent)" }} /> System Audit Trail
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "4px" }}>
            Review historical access logs, search queries, and forensic exports cataloged by user accounts.
          </p>
        </div>

        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem", fontWeight: "bold" }}>Catalog Records ({logs.length})</span>
            <button 
              onClick={loadAuditLogs}
              style={{ background: "transparent", color: "var(--accent)", border: "1px solid var(--border)", borderRadius: "6px", padding: "6px 12px", fontSize: "0.8rem", cursor: "pointer" }}
            >
              <ActivityIcon size={14} /> Refresh Logs
            </button>
          </div>

          {loading ? (
            <div style={{ color: "var(--text-secondary)", textAlign: "center", padding: "40px" }}>Loading audit trail...</div>
          ) : logs.length === 0 ? (
            <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "40px" }}>No system audit entries cataloged yet.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>
                    <th style={{ padding: "12px", width: "80px" }}>ID</th>
                    <th style={{ padding: "12px", width: "180px" }}>Timestamp</th>
                    <th style={{ padding: "12px", width: "120px" }}>User</th>
                    <th style={{ padding: "12px", width: "150px" }}>Action</th>
                    <th style={{ padding: "12px" }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr 
                      key={log.audit_id} 
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", color: "var(--text-secondary)" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.01)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "12px", fontFamily: "monospace" }}>#{log.audit_id}</td>
                      <td style={{ padding: "12px" }}>{new Date(log.ts * 1000).toLocaleString()}</td>
                      <td style={{ padding: "12px", fontWeight: "bold", color: "var(--text-primary)" }}>{log.user}</td>
                      <td style={{ padding: "12px" }}>
                        <span 
                          style={{ 
                            fontSize: "0.7rem", 
                            fontWeight: "bold", 
                            textTransform: "uppercase", 
                            padding: "2px 6px", 
                            borderRadius: "4px", 
                            background: log.action.includes("login") ? "rgba(45,212,191,0.15)" : log.action.includes("enroll") ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.05)",
                            color: log.action.includes("login") ? "var(--accent)" : log.action.includes("enroll") ? "var(--yellow)" : "var(--text-primary)"
                          }}
                        >
                          {log.action.replace("_", " ")}
                        </span>
                      </td>
                      <td style={{ padding: "12px" }}>{log.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AppLayout>
    </ToastProvider>
  );
}


