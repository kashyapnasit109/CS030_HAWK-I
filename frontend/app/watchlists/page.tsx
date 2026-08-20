"use client";

import { useEffect, useState, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import ToastProvider, { showToast } from "@/components/ToastProvider";
import { listReferences, ReferenceMeta, apiFetch } from "@/lib/api";
import { PlusIcon, TargetIcon, UserIcon, TrashIcon, CloseIcon } from "@/components/Icons";

interface WatchlistEntry {
  entry_id: number;
  reference_image_id: number | null;
  plate_number: string | null;
  alert_severity: string;
  added_at: number;
}

interface Watchlist {
  watchlist_id: number;
  name: string;
  type: string; // face, plate
  created_at: number;
  entries: WatchlistEntry[];
}

export default function WatchlistsPage() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [references, setReferences] = useState<ReferenceMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeListId, setActiveListId] = useState<number | null>(null);

  // New Watchlist Form States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [listName, setListName] = useState("");
  const [listType, setListType] = useState("plate"); // face, plate
  const [submitting, setSubmitting] = useState(false);

  // New Entry Form States
  const [plateNumber, setPlateNumber] = useState("");
  const [selectedRefId, setSelectedRefId] = useState<string>("");
  const [alertSeverity, setAlertSeverity] = useState("high"); // low, medium, high
  const [addingEntry, setAddingEntry] = useState(false);

  // Fetch Watchlists list
  const loadWatchlists = useCallback(async () => {
    try {
      const data = await apiFetch<{ watchlists: Watchlist[]; count: number }>("/api/watchlists/list");
      setWatchlists(data.watchlists || []);
      if (data.watchlists && data.watchlists.length > 0 && !activeListId) {
        setActiveListId(data.watchlists[0].watchlist_id);
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [activeListId]);

  // Fetch Reference images for Face Watchlists
  const loadReferences = useCallback(async () => {
    try {
      const data = await listReferences();
      setReferences(data.references || []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadWatchlists();
    loadReferences();
  }, [loadWatchlists, loadReferences]);

  const handleCreateWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listName.trim()) return;
    setSubmitting(true);

    try {
      const data = await apiFetch<{ success: boolean; watchlist_id: number }>("/api/watchlists/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: listName, type: listType })
      });

      showToast("Watchlist created", "success");
      setListName("");
      setShowCreateModal(false);
      await loadWatchlists();
      setActiveListId(data.watchlist_id);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeListId) return;
    setAddingEntry(true);

    try {
      const activeList = watchlists.find(w => w.watchlist_id === activeListId);

      if (activeList?.type === "plate") {
        if (!plateNumber.trim()) throw new Error("Plate number is required");
        await apiFetch(`/api/watchlists/${activeListId}/add_plate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plate_number: plateNumber.trim().toUpperCase(), alert_severity: alertSeverity })
        });
      } else {
        if (!selectedRefId) throw new Error("Please select a suspect reference photo");
        await apiFetch(`/api/watchlists/${activeListId}/add_face?reference_image_id=${selectedRefId}&alert_severity=${alertSeverity}`, {
          method: "POST"
        });
      }

      showToast("Target added to watchlist", "success");
      setPlateNumber("");
      setSelectedRefId("");
      loadWatchlists();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setAddingEntry(false);
    }
  };

  const handleRemoveEntry = async (entryId: number) => {
    if (!activeListId) return;

    try {
      await apiFetch(`/api/watchlists/${activeListId}/entries/${entryId}`, {
        method: "DELETE"
      });

      showToast("Target removed from watchlist", "success");
      loadWatchlists();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const activeList = watchlists.find(w => w.watchlist_id === activeListId);

  return (
    <ToastProvider>
      <AppLayout>
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "24px", alignItems: "flex-start" }}>
          {/* Left Column: Watchlists list */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}>
              <strong style={{ color: "var(--text-primary)", fontSize: "0.95rem" }}>Watchlists</strong>
              <button 
                onClick={() => setShowCreateModal(true)}
                style={{ background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid rgba(45,212,191,0.2)", borderRadius: "4px", padding: "4px 10px", fontSize: "0.75rem", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", gap: 4 }}
              >
                <PlusIcon size={12} /> Add
              </button>
            </div>

            {loading ? (
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "20px 0" }}>Loading...</div>
            ) : watchlists.length === 0 ? (
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "20px 0" }}>No watchlists.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {watchlists.map((w) => (
                  <div
                    key={w.watchlist_id}
                    onClick={() => setActiveListId(w.watchlist_id)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: "8px", cursor: "pointer", background: activeListId === w.watchlist_id ? "var(--accent-dim)" : "transparent", color: activeListId === w.watchlist_id ? "var(--accent)" : "var(--text-secondary)", transition: "var(--transition)" }}
                  >
                    <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>{w.name}</span>
                    <span style={{ fontSize: "0.7rem", fontFamily: "monospace", opacity: 0.7, textTransform: "uppercase" }}>{w.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Watchlist detail & targets list */}
          <div>
            {!activeList ? (
              <div style={{ display: "flex", flexDirection: "column", height: "300px", alignItems: "center", justifyContent: "center", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", textAlign: "center", padding: "20px" }}>
                <TargetIcon size={44} style={{ color: "var(--accent)", marginBottom: "12px" }} />
                <h3 style={{ color: "var(--text-primary)", fontSize: "1.1rem", margin: 0 }}>No Watchlist Selected</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "8px" }}>Select a watchlist from the side panel to view entries and add search targets.</p>
              </div>
            ) : (
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "16px", marginBottom: "24px" }}>
                  <div>
                    <h2 style={{ color: "var(--text-primary)", fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>{activeList.name}</h2>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "4px" }}>
                      Target Type: <strong style={{ color: "var(--accent)", textTransform: "uppercase" }}>{activeList.type}</strong>
                    </p>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "24px", alignItems: "flex-start" }}>
                  {/* Add target form */}
                  <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "8px", padding: "16px" }}>
                    <h4 style={{ color: "var(--text-primary)", fontSize: "0.9rem", margin: "0 0 16px 0" }}>Add Target Entry</h4>
                    
                    <form onSubmit={handleAddEntry}>
                      {activeList.type === "plate" ? (
                        <div style={{ marginBottom: "16px" }}>
                          <label style={{ display: "block", color: "#94a3b8", fontSize: "0.75rem", fontWeight: 600, marginBottom: "6px", textTransform: "uppercase" }}>License Plate</label>
                          <input 
                            type="text" 
                            placeholder="e.g. MH12AB1234"
                            value={plateNumber}
                            onChange={(e) => setPlateNumber(e.target.value)}
                            style={{ width: "100%", boxSizing: "border-box", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "6px", padding: "8px 10px", color: "var(--text-primary)", fontSize: "0.9rem", outline: "none" }}
                          />
                        </div>
                      ) : (
                        <div style={{ marginBottom: "16px" }}>
                          <label style={{ display: "block", color: "#94a3b8", fontSize: "0.75rem", fontWeight: 600, marginBottom: "6px", textTransform: "uppercase" }}>Suspect Reference</label>
                          <select 
                            value={selectedRefId}
                            onChange={(e) => setSelectedRefId(e.target.value)}
                            style={{ width: "100%", boxSizing: "border-box", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "6px", padding: "8px 10px", color: "var(--text-primary)", fontSize: "0.85rem", outline: "none" }}
                          >
                            <option value="">Select Reference Photo...</option>
                            {references.map((r) => (
                              <option key={r.id} value={r.id}>{r.label}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div style={{ marginBottom: "20px" }}>
                        <label style={{ display: "block", color: "#94a3b8", fontSize: "0.75rem", fontWeight: 600, marginBottom: "6px", textTransform: "uppercase" }}>Alert Severity</label>
                        <select 
                          value={alertSeverity}
                          onChange={(e) => setAlertSeverity(e.target.value)}
                          style={{ width: "100%", boxSizing: "border-box", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "6px", padding: "8px 10px", color: "var(--text-primary)", fontSize: "0.85rem", outline: "none" }}
                        >
                          <option value="high">HIGH (Critical Red Alert)</option>
                          <option value="medium">MEDIUM (Warning Yellow)</option>
                          <option value="low">LOW (Informational Blue)</option>
                        </select>
                      </div>

                      <button 
                        type="submit" 
                        disabled={addingEntry}
                        style={{ width: "100%", background: "var(--accent)", color: "#000000", border: "none", borderRadius: "6px", padding: "10px", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer" }}
                      >
                        {addingEntry ? "Adding..." : "Add to Watchlist"}
                      </button>
                    </form>
                  </div>

                  {/* Targets List */}
                  <div>
                    <h4 style={{ color: "var(--text-primary)", fontSize: "0.9rem", margin: "0 0 16px 0" }}>Current Watchlist Entries ({activeList.entries.length})</h4>
                    
                    {activeList.entries.length === 0 ? (
                      <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", padding: "32px", textAlign: "center", background: "var(--bg-elevated)", border: "1px dashed var(--border)", borderRadius: "8px" }}>
                        No target entries added to this watchlist yet.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {activeList.entries.map((entry) => {
                          const refImage = references.find(r => r.id === String(entry.reference_image_id));
                          return (
                            <div 
                              key={entry.entry_id} 
                              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "8px" }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                {activeList.type === "face" ? (
                                  <>
                                    <div style={{ width: "36px", height: "36px", borderRadius: "4px", background: "#000", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                      {refImage?.image_url ? (
                                        <img src={`http://localhost:8000${refImage.image_url}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                      ) : (
                                        <UserIcon size={18} style={{ color: "var(--text-muted)" }} />
                                      )}
                                    </div>
                                    <div>
                                      <strong style={{ color: "var(--text-primary)", fontSize: "0.9rem" }}>{refImage?.label || `Profile #${entry.reference_image_id}`}</strong>
                                      <span style={{ display: "block", fontSize: "0.7rem", color: "var(--text-muted)" }}>Registered Face Embedding</span>
                                    </div>
                                  </>
                                ) : (
                                  <div>
                                    <strong style={{ color: "var(--text-primary)", fontSize: "1rem", fontFamily: "monospace", background: "var(--bg-card)", padding: "4px 10px", borderRadius: "4px", border: "1px solid var(--border)" }}>
                                      {entry.plate_number}
                                    </strong>
                                    <span style={{ display: "block", fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "4px" }}>Plate Watchlist Matcher</span>
                                  </div>
                                )}
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                <span style={{ color: entry.alert_severity === "high" ? "#EF4444" : entry.alert_severity === "medium" ? "#F59E0B" : "#64748B", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "bold" }}>
                                  {entry.alert_severity} severity
                                </span>
                                <button
                                  onClick={() => handleRemoveEntry(entry.entry_id)}
                                  style={{ background: "transparent", border: "none", color: "#ef4444", fontSize: "1rem", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
                                  title="Delete target"
                                >
                                  <TrashIcon size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Create Watchlist Modal */}
        {showCreateModal && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
            <div style={{ width: "100%", maxWidth: "400px", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "28px", boxShadow: "var(--shadow-card)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ color: "var(--text-primary)", fontSize: "1.2rem", margin: 0 }}>Create Watchlist Folder</h2>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  style={{ background: "transparent", color: "var(--text-muted)", border: "none", cursor: "pointer", fontSize: "1.2rem", display: "flex", alignItems: "center" }}
                >
                  <CloseIcon size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateWatchlist}>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", color: "#94a3b8", fontSize: "0.75rem", fontWeight: 600, marginBottom: "8px", textTransform: "uppercase" }}>Watchlist Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Red Corner Notices"
                    value={listName}
                    onChange={(e) => setListName(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", background: "#000000", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px", padding: "10px", color: "#E6EDF3", fontSize: "0.9rem", outline: "none" }}
                  />
                </div>

                <div style={{ marginBottom: "24px" }}>
                  <label style={{ display: "block", color: "#94a3b8", fontSize: "0.75rem", fontWeight: 600, marginBottom: "8px", textTransform: "uppercase" }}>Target Mode</label>
                  <select 
                    value={listType}
                    onChange={(e) => setListType(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", background: "#000000", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px", padding: "10px", color: "#E6EDF3", fontSize: "0.9rem", outline: "none" }}
                  >
                    <option value="plate">Automated License Plate Recognition (ANPR)</option>
                    <option value="face">Face Recognition & Re-Identification</option>
                  </select>
                </div>
                <button 
                  type="submit" 
                  disabled={submitting}
                  style={{ width: "100%", background: "var(--accent)", color: "#000000", border: "none", borderRadius: "8px", padding: "12px", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer" }}
                >
                  {submitting ? "Creating..." : "Create Watchlist"}
                </button>
              </form>
            </div>
          </div>
        )}
      </AppLayout>
    </ToastProvider>
  );
}


