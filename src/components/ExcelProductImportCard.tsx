"use client";

import { useRef, useState } from "react";

interface ImportResult {
  totalRows: number;
  imported: number;
  imagesUploaded: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

export default function ExcelProductImportCard({
  onImported,
}: {
  onImported?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/admin/products/excel-import", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "שגיאה בייבוא");
        return;
      }

      setResult({
        totalRows: data.totalRows,
        imported: data.imported,
        imagesUploaded: data.imagesUploaded,
        skipped: data.skipped,
        errors: data.errors ?? [],
      });
      onImported?.();
    } catch {
      setError("שגיאת רשת");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-gray-900">ייבוא תמונות מאקסל</h2>
      <p className="mt-2 text-sm text-gray-600">
        העלה קובץ Excel עם העמודות: A מס׳ מוצר בריווחית, B תמונה, C שם, D מקט,
        E מחיר. המערכת תתאים לפי מספר מוצר (או מקט) ותעלה תמונות לקטלוג.
      </p>

      <div className="mt-4 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/40 p-4">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={handleUpload}
          disabled={loading}
          className="block w-full text-sm text-gray-700 file:me-4 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-700"
        />
        {loading && (
          <p className="mt-3 text-sm font-medium text-emerald-800">
            מייבא... זה יכול לקחת דקה או שתיים לקובץ גדול
          </p>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-4 space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 text-sm">
          <p className="font-semibold text-emerald-900">סיכום ייבוא</p>
          <ul className="space-y-1 text-gray-700">
            <li>שורות בקובץ: {result.totalRows}</li>
            <li>עודכנו בהצלחה: {result.imported}</li>
            <li>תמונות שהועלו: {result.imagesUploaded}</li>
            <li>דולגו: {result.skipped}</li>
          </ul>

          {result.errors.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-lg bg-white p-3">
              <p className="mb-2 font-medium text-amber-900">
                שגיאות / שורות שלא נמצאו ({result.errors.length})
              </p>
              <ul className="space-y-1 text-xs text-gray-600">
                {result.errors.slice(0, 50).map((item) => (
                  <li key={`${item.row}-${item.message}`}>
                    שורה {item.row}: {item.message}
                  </li>
                ))}
                {result.errors.length > 50 && (
                  <li>...ועוד {result.errors.length - 50}</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
