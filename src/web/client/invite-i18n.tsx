"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  DATE_LOCALE,
  isLocale,
  pickLocalised,
  translate,
  type Locale,
  type StringKey,
} from "./invite-strings";

export type { Locale } from "./invite-strings";

const STORAGE_KEY = "wims.invite.locale";

type I18n = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
  pick: (base: string, french: string | null | undefined) => string;
  dateLocale: string;
};

const I18nContext = createContext<I18n | null>(null);

export function InviteI18nProvider({ children }: { children: React.ReactNode }) {
  // Always start at "en" so the server-rendered markup and the first client
  // render agree; a stored preference is applied right after mount.
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) {
      setLocaleState(stored);
      return;
    }
    if (window.navigator.language?.toLowerCase().startsWith("fr")) setLocaleState("fr");
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private browsing can refuse storage; the choice just won't persist.
    }
  }, []);

  const value = useMemo<I18n>(
    () => ({
      locale,
      setLocale,
      t: (key, vars) => translate(locale, key, vars),
      pick: (base, french) => pickLocalised(locale, base, french),
      dateLocale: DATE_LOCALE[locale],
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useInviteI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useInviteI18n must be used inside InviteI18nProvider");
  return ctx;
}
