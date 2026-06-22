"use client";

import { useEffect, useState } from "react";

export default function AnnouncementPopup() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [dismissKey, setDismissKey] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/announcement");
        const data = await response.json();
        if (!response.ok || !data.active) return;

        const key = `announcement_dismissed_${data.updatedAt}`;
        if (sessionStorage.getItem(key)) return;

        setMessage(data.message ?? "");
        setImageUrl(data.imageUrl ?? "");
        setDismissKey(key);
        setOpen(true);
      } catch {
        // ignore
      }
    }

    load();
  }, []);

  function dismiss() {
    if (dismissKey) {
      sessionStorage.setItem(dismissKey, "1");
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="relative max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-title"
      >
        <button
          type="button"
          onClick={dismiss}
          className="absolute left-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-lg text-gray-600"
          aria-label="סגור"
        >
          ×
        </button>

        <h2
          id="announcement-title"
          className="mb-3 pr-6 text-lg font-bold text-emerald-800"
        >
          הודעה מהחנות
        </h2>

        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt="מודעה"
            className="mb-3 w-full rounded-xl object-contain"
          />
        )}

        {message.trim() && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
            {message}
          </p>
        )}

        <button
          type="button"
          onClick={dismiss}
          className="mt-5 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white"
        >
          הבנתי
        </button>
      </div>
    </div>
  );
}
