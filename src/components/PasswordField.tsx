"use client";

import { useState } from "react";

export default function PasswordField({
  value,
  onChange,
  placeholder,
  className = "w-full rounded-xl border border-gray-300 px-4 py-3",
  required = false,
  minLength,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${className} pl-12`}
        required={required}
        minLength={minLength}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500"
        aria-label={visible ? "הסתר סיסמה" : "הצג סיסמה"}
      >
        {visible ? "הסתר" : "הצג"}
      </button>
    </div>
  );
}
