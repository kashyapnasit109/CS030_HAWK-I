"use client";

import { useEffect, useCallback, ReactNode } from "react";

interface Toast {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
}

// Global toast state (simple pattern, avoids heavy state libraries)
type ToastHandler = (message: string, type?: Toast["type"]) => void;

let _showToast: ToastHandler = () => {};

export function showToast(message: string, type: Toast["type"] = "info") {
  _showToast(message, type);
}

import { useState } from "react";

import { CheckIcon, CloseIcon, WarningIcon } from "./Icons";

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast: ToastHandler = useCallback((message, type = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    _showToast = addToast;
  }, [addToast]);

  const renderIcon = (type: Toast["type"]) => {
    switch (type) {
      case "success": return <CheckIcon size={16} />;
      case "error": return <CloseIcon size={16} />;
      default: return <WarningIcon size={16} />;
    }
  };

  return (
    <>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span style={{ display: "flex", alignItems: "center" }}>{renderIcon(t.type)}</span>
            {t.message}
          </div>
        ))}
      </div>
    </>
  );
}

