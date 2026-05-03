"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Tone = "success" | "error";
type ToastItem = { id: number; message: string; tone: Tone };
type Ctx = { show: (message: string, tone?: Tone) => void };

const ToastContext = createContext<Ctx | null>(null);

const DURATION_MS = 3000;
let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, tone: Tone = "success") => {
    counter += 1;
    const id = counter;
    setToasts((prev) => [...prev, { id, message, tone }]);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <ToastView
            key={t.id}
            toast={t}
            onDone={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onDone }: { toast: ToastItem; onDone: () => void }) {
  useEffect(() => {
    const handle = setTimeout(onDone, DURATION_MS);
    return () => clearTimeout(handle);
  }, [onDone]);

  const tone = toast.tone === "error" ? "bg-red-600 text-white" : "bg-avocado-700 text-white";

  return (
    <output className={`pointer-events-auto rounded-md px-4 py-2 text-sm shadow-lg ${tone}`}>
      {toast.message}
    </output>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
