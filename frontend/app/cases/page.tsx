"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import ToastProvider, { showToast } from "@/components/ToastProvider";
import { PlusIcon, FolderIcon, UploadIcon, FileTextIcon, CloseIcon, ChevronRightIcon } from "@/components/Icons";

interface Case {
  case_id: number;
  case_number: string;
  title: string;
  description: string | null;
  status: string;
  created_at: number;
  officer_name: string | null;
}

interface CaseMedia {
  media_id: number;
  source_label: string | null;
  original_filename: string | null;
  file_path: string;
  sha256_hash: string;
  duration_seconds: number | null;
  resolution: string | null;
  processing_status: string;
  uploaded_at: number;
}

interface CaseEvent {
  event_id: number;
  camera_id: string;
  module: string;
  object_label: string;
  severity: string;
  summary: string;
  detected_at: number;
}

export default function CasesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCaseId, setActiveCaseId] = useState<number | null>(null);
  
  // Active Case Detail States
  const [caseDetail, setCaseDetail] = useState<Case | null>(null);
  const [mediaList, setMediaList] = useState<CaseMedia[]>([]);
  const [eventList, setEventList] = useState<CaseEvent[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // New Case Modal Form States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [caseNumber, setCaseNumber] = useState("");
  const [caseTitle, setCaseTitle] = useState("");
  const [caseDesc, setCaseDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Ingestion File Upload States
  const [uploading, setUploading] = useState(false);
  const [sourceLabel, setSourceLabel] = useState("Shop CCTV");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Cases list
  const loadCases = useCallback(async () => {
    try {
      const token = localStorage.getItem("visioncctv_token");
      const res = await fetch("http://localhost:8000/api/cases/list", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load cases");
      const data = await res.json();
      setCases(data.cases);
    } catch (err: any) {
      showToast(err.message || "Failed to retrieve case logs", "error");
    } finally {
      setLoading(false);
    }
  }, []);



  // Fetch Case Details
  const loadCaseDetail = useCallback(async (caseId: number) => {
    setDetailLoading(true);
    try {
      const token = localStorage.getItem("visioncctv_token");
      const res = await fetch(`http://localhost:8000/api/cases/${caseId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load case folder");
      const data = await res.json();
      setCaseDetail(data.case);
      setMediaList(data.media);
      setEventList(data.events);
    } catch (err: any) {
      showToast(err.message || "Failed to load case folder detail", "error");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      await loadCases();
      
      const savedActiveCaseId = localStorage.getItem("visioncctv_active_case_id");
      if (savedActiveCaseId) {
        const id = Number(savedActiveCaseId);
        setActiveCaseId(id);
        loadCaseDetail(id);
      }
    }
    init();
  }, [loadCases, loadCaseDetail]);

  // Listen to activeCaseChanged from other components (like topbar Case selector)
  useEffect(() => {
    const handleActiveCaseChanged = () => {
      const savedActiveCaseId = localStorage.getItem("visioncctv_active_case_id");
      if (savedActiveCaseId) {
        const id = Number(savedActiveCaseId);
        setActiveCaseId(id);
        loadCaseDetail(id);
      } else {
        setActiveCaseId(null);
        setCaseDetail(null);
      }
    };

    window.addEventListener("activeCaseChanged", handleActiveCaseChanged);
    return () => window.removeEventListener("activeCaseChanged", handleActiveCaseChanged);
  }, [loadCaseDetail]);

  const handleCaseClick = (caseId: number) => {
    setActiveCaseId(caseId);
    localStorage.setItem("visioncctv_active_case_id", String(caseId));
    const caseObj = cases.find(c => c.case_id === caseId);
    if (caseObj) {
      localStorage.setItem("visioncctv_active_case_number", caseObj.case_number);
    }
    window.dispatchEvent(new Event("activeCaseChanged"));
    loadCaseDetail(caseId);
  };

  const handleCreateCaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseNumber.trim() || !caseTitle.trim()) {
      showToast("Case reference number and title are required", "error");
      return;
    }
    setSubmitting(true);

    try {
      const token = localStorage.getItem("visioncctv_token");
      const res = await fetch("http://localhost:8000/api/cases/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          case_number: caseNumber,
          title: caseTitle,
          description: caseDesc
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to create case");
      }

      showToast("Case folder created successfully", "success");
      setShowCreateModal(false);
      setCaseNumber("");
      setCaseTitle("");
      setCaseDesc("");
      loadCases();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeCaseId) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("source_label", sourceLabel);

    try {
      const token = localStorage.getItem("visioncctv_token");
      const res = await fetch(`http://localhost:8000/api/cases/${activeCaseId}/upload_media`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to upload file");
      }

      showToast(`Ingested ${file.name} successfully`, "success");
      loadCaseDetail(activeCaseId);
    } catch (err: any) {
      showToast(err.message || "Failed to upload video clip", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <ToastProvider>
      <AppLayout>
        {activeCaseId === null ? (
          // Cases Directory Grid
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
              <div>
                <h1 style={{ color: "var(--text-primary)", fontSize: "1.75rem", fontWeight: 700, margin: 0 }}>Case Intelligence Folders</h1>
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "4px" }}>Organize files, references, and forensic alerts by investigation index.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                style={{ background: "var(--accent)", color: "#000000", border: "none", borderRadius: "8px", padding: "10px 20px", fontWeight: "bold", fontSize: "0.9rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
              >
                <PlusIcon size={16} /> Create Case Folder
              </button>
            </div>

            {loading ? (
              <div style={{ color: "var(--text-secondary)", textAlign: "center", padding: "40px" }}>Loading case folders...</div>
            ) : cases.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "48px", textAlign: "center" }}>
                <FolderIcon size={36} style={{ color: "var(--text-muted)", marginBottom: "16px" }} />
                <h3 style={{ color: "var(--text-primary)", fontSize: "1.25rem", margin: 0 }}>No active cases found</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "8px", maxWidth: "320px" }}>Create your first case folder to start grouping evidence and CCTV footage.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
                {cases.map((c) => (
                  <div
                    key={c.case_id}
                    onClick={() => handleCaseClick(c.case_id)}
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", cursor: "pointer", transition: "var(--transition)" }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--accent)"}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border)"}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                      <span style={{ fontFamily: "monospace", color: "var(--accent)", fontSize: "0.8rem", background: "var(--accent-dim)", padding: "2px 8px", borderRadius: "4px", fontWeight: "bold" }}>
                        {c.case_number}
                      </span>
                      <span style={{ color: c.status === "open" ? "var(--green)" : "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "bold" }}>
                        ● {c.status.replace("_", " ")}
                      </span>
                    </div>
                    <h3 style={{ color: "var(--text-primary)", fontSize: "1.1rem", fontWeight: 600, margin: "0 0 8px 0" }}>{c.title}</h3>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: "0 0 16px 0", height: "40px", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.description || "No description provided."}
                    </p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: "12px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      <span>Officer: {c.officer_name || "Unassigned"}</span>
                      <span>{new Date(c.created_at * 1000).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Case Detailed View Folder
          <div>
            <div style={{ marginBottom: "24px" }}>
              <button
                onClick={() => {
                  setActiveCaseId(null);
                  setCaseDetail(null);
                  localStorage.removeItem("visioncctv_active_case_id");
                  localStorage.removeItem("visioncctv_active_case_number");
                  window.dispatchEvent(new Event("activeCaseChanged"));
                }}
                style={{ background: "transparent", color: "var(--accent)", border: "none", outline: "none", cursor: "pointer", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "6px", padding: 0 }}
              >
                <ChevronRightIcon size={16} style={{ transform: "rotate(180deg)" }} /> Back to Cases
              </button>
            </div>

            {detailLoading || !caseDetail ? (
              <div style={{ color: "var(--text-secondary)", textAlign: "center", padding: "40px" }}>Loading folder details...</div>
            ) : (
              <div>
                {/* Case Folder Title banner */}
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "24px", marginBottom: "32px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontFamily: "monospace", color: "var(--accent)", fontSize: "0.85rem", background: "var(--accent-dim)", padding: "4px 10px", borderRadius: "4px", fontWeight: "bold" }}>
                        {caseDetail.case_number}
                      </span>
                      <h1 style={{ color: "var(--text-primary)", fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>{caseDetail.title}</h1>
                    </div>
                    <span style={{ fontSize: "0.85rem", color: caseDetail.status === "open" ? "var(--green)" : "var(--text-muted)", fontWeight: "bold", textTransform: "uppercase" }}>
                      ● Status: {caseDetail.status.replace("_", " ")}
                    </span>
                  </div>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: 0 }}>{caseDetail.description || "No description provided."}</p>
                  
                  <div style={{ display: "flex", gap: "24px", marginTop: "20px", borderTop: "1px solid var(--border)", paddingTop: "16px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    <div>Investigating Officer: <strong style={{ color: "var(--text-primary)" }}>{caseDetail.officer_name}</strong></div>
                    <div>Created On: <strong style={{ color: "var(--text-primary)" }}>{new Date(caseDetail.created_at * 1000).toLocaleString()}</strong></div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px", alignItems: "flex-start" }}>
                  {/* Left Column: Media Registry */}
                  <div>
                    <h2 style={{ color: "var(--text-primary)", fontSize: "1.2rem", fontWeight: 700, margin: "0 0 16px 0" }}>Evidence Media Clips</h2>
                    
                    {mediaList.length === 0 ? (
                      <div style={{ background: "var(--bg-card)", border: "1px dashed var(--border)", borderRadius: "12px", padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                        No video clips attached to this case. Use the panel on the right to upload cctv files.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {mediaList.map((m) => (
                          <div key={m.media_id} style={{ display: "flex", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
                            <div style={{ width: "120px", height: "80px", background: "#000", position: "relative", flexShrink: 0 }}>
                              <img 
                                src={`http://localhost:8000/storage/thumbnails/case_${caseDetail.case_id}_${m.file_path.split("_").pop()?.split(".")[0]}.jpg`}
                                alt="thumbnail" 
                                onError={(e) => { e.currentTarget.src = "/storage/thumbnails/subway.jpg" }}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            </div>
                            <div style={{ padding: "12px 16px", flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                <strong style={{ color: "var(--text-primary)", fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.original_filename}</strong>
                                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{m.source_label}</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                                <span>Duration: {m.duration_seconds ? `${m.duration_seconds.toFixed(1)}s` : "Unknown"}</span>
                                <span>Uploaded: {new Date(m.uploaded_at * 1000).toLocaleDateString()}</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: "monospace", fontSize: "0.7rem", color: "var(--accent)" }}>
                                <span>SHA-256:</span>
                                <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", width: "180px" }}>{m.sha256_hash}</span>
                                <button 
                                  onClick={() => { navigator.clipboard.writeText(m.sha256_hash); showToast("Hash copied!", "success"); }}
                                  style={{ background: "transparent", color: "var(--text-muted)", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
                                >
                                  <FileTextIcon size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Upload panel / Quick Action */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
                      <h3 style={{ color: "var(--text-primary)", fontSize: "1rem", fontWeight: 700, margin: "0 0 16px 0" }}>Ingest New Footage</h3>
                      
                      <div style={{ marginBottom: "16px" }}>
                        <label style={{ display: "block", color: "#94a3b8", fontSize: "0.75rem", fontWeight: 600, marginBottom: "8px", textTransform: "uppercase" }}>Camera Source Label</label>
                        <input 
                          type="text" 
                          value={sourceLabel}
                          onChange={(e) => setSourceLabel(e.target.value)}
                          placeholder="e.g. Shop CCTV, MG Road"
                          style={{ width: "100%", boxSizing: "border-box", background: "#000000", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "6px", padding: "10px", color: "#E6EDF3", fontSize: "0.85rem", outline: "none" }}
                        />
                      </div>

                      <div 
                        onClick={handleUploadClick}
                        style={{ border: "2px dashed var(--border)", borderRadius: "8px", padding: "24px", textAlign: "center", cursor: "pointer", background: "var(--bg-elevated)", transition: "var(--transition)" }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--accent)"}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border)"}
                      >
                        <UploadIcon size={28} style={{ color: "var(--text-muted)", display: "block", margin: "0 auto 8px" }} />
                        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                          {uploading ? "Ingesting & Hashing..." : "Drag & drop or click to ingest video"}
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginTop: "4px" }}>
                          MP4, AVI, MOV up to 100MB
                        </span>
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        accept="video/*" 
                        onChange={handleFileChange}
                        style={{ display: "none" }}
                      />
                    </div>

                    {/* Matched Case Events summary */}
                    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
                      <h3 style={{ color: "var(--text-primary)", fontSize: "1rem", fontWeight: 700, margin: "0 0 16px 0" }}>Case Forensic Alerts ({eventList.length})</h3>
                      
                      {eventList.length === 0 ? (
                        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center", padding: "20px 0" }}>
                          No matches generated yet.
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {eventList.slice(0, 5).map((ev) => (
                            <div 
                              key={ev.event_id} 
                              style={{ padding: "10px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer" }}
                              onClick={() => router.push(`/results#${ev.event_id}`)}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", margin: "0 0 4px 0" }}>
                                <strong style={{ color: "var(--text-primary)" }}>{ev.module}</strong>
                                <span style={{ color: ev.severity === "high" ? "var(--accent)" : "var(--yellow)" }}>{ev.severity.toUpperCase()}</span>
                              </div>
                              <div style={{ color: "var(--text-secondary)", marginBottom: "4px" }}>{ev.summary}</div>
                              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{new Date(ev.detected_at * 1000).toLocaleString()}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create Case Folder Modal */}
        {showCreateModal && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
            <div style={{ width: "100%", maxWidth: "440px", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "28px", boxShadow: "var(--shadow-card)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ color: "var(--text-primary)", fontSize: "1.25rem", margin: 0 }}>Create Investigation Case</h2>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  style={{ background: "transparent", color: "var(--text-muted)", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
                >
                  <CloseIcon size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateCaseSubmit}>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", color: "#94a3b8", fontSize: "0.75rem", fontWeight: 600, marginBottom: "8px", textTransform: "uppercase" }}>Case Number / Reference ID</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. FIR/2026/104"
                    value={caseNumber}
                    onChange={(e) => setCaseNumber(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", background: "#000000", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px", padding: "10px", color: "#E6EDF3", fontSize: "0.9rem", outline: "none" }}
                  />
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", color: "#94a3b8", fontSize: "0.75rem", fontWeight: 600, marginBottom: "8px", textTransform: "uppercase" }}>Case Title</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. MG Road Diamond Theft"
                    value={caseTitle}
                    onChange={(e) => setCaseTitle(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", background: "#000000", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px", padding: "10px", color: "#E6EDF3", fontSize: "0.9rem", outline: "none" }}
                  />
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", color: "#94a3b8", fontSize: "0.75rem", fontWeight: 600, marginBottom: "8px", textTransform: "uppercase" }}>Brief Description / Context</label>
                  <textarea 
                    rows={4}
                    placeholder="Enter case summary details or investigative notes..."
                    value={caseDesc}
                    onChange={(e) => setCaseDesc(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", background: "#000000", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px", padding: "10px", color: "#E6EDF3", fontSize: "0.9rem", outline: "none", resize: "none" }}
                  />
                </div>

                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                  <button 
                    type="button" 
                    onClick={() => setShowCreateModal(false)}
                    style={{ background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: "8px", padding: "10px 16px", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    style={{ background: "var(--accent)", color: "#000000", border: "none", borderRadius: "8px", padding: "10px 20px", fontWeight: "bold", cursor: "pointer" }}
                  >
                    {submitting ? "Creating Folder..." : "Create Folder"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AppLayout>
    </ToastProvider>
  );
}
