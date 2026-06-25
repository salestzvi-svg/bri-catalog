"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getStoreLocale,
  STORE_LOCALE_KEY,
  type StoreLocale,
  type StoreUiStrings,
  storeUi,
} from "@/lib/i18n/store-ui";

export function useStoreLocale() {
  const [locale, setLocaleState] = useState<StoreLocale>("he");

  useEffect(() => {
    try {
      setLocaleState(getStoreLocale(localStorage.getItem(STORE_LOCALE_KEY)));
    } catch {
      // ignore
    }
  }, []);

  const setLocale = useCallback((next: StoreLocale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORE_LOCALE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "he" ? "en" : "he");
  }, [locale, setLocale]);

  const t: StoreUiStrings = storeUi[locale];

  return { locale, setLocale, toggleLocale, t, dir: t.dir };
}
