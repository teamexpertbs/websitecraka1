import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "hi";

const STORAGE_KEY = "craka_lang";

const TRANSLATIONS: Record<string, { en: string; hi: string }> = {
  // Sidebar / nav
  "nav.terminal":     { en: "Terminal",     hi: "टर्मिनल" },
  "nav.logs":         { en: "Logs",         hi: "लॉग्स" },
  "nav.stats":        { en: "Stats",        hi: "आँकड़े" },
  "nav.tools":        { en: "Tools",        hi: "टूल्स" },
  "nav.transactions": { en: "Transactions", hi: "लेन-देन" },
  "nav.admin":        { en: "Admin Panel",  hi: "एडमिन पैनल" },
  "nav.premium":      { en: "Premium",      hi: "प्रीमियम" },
  "nav.refer":        { en: "Refer & Earn", hi: "रेफर और कमाएँ" },
  "nav.modules":      { en: "Modules",      hi: "मॉड्यूल" },
  "nav.membership":   { en: "Membership",   hi: "सदस्यता" },
  "nav.more":         { en: "More",         hi: "और" },
  "nav.logout":       { en: "Logout",       hi: "लॉगआउट" },

  // Token badge
  "tokens.label":     { en: "Tokens",       hi: "टोकन" },
  "tokens.unlimited": { en: "Unlimited",    hi: "असीमित" },
  "tokens.plan":      { en: "Plan",         hi: "प्लान" },
  "tokens.free":      { en: "Free",         hi: "मुफ़्त" },

  // Common buttons
  "btn.search":       { en: "Search",       hi: "खोजें" },
  "btn.cancel":       { en: "Cancel",       hi: "रद्द करें" },
  "btn.refresh":      { en: "Refresh",      hi: "रीफ़्रेश" },

  // Transactions page
  "txn.title":        { en: "Token Transactions",       hi: "टोकन लेन-देन" },
  "txn.subtitle":     { en: "Every credit you earned, spent or got refunded.", hi: "आपके कमाए, खर्च और रिफंड हुए सभी क्रेडिट।" },
  "txn.col.time":     { en: "Time",         hi: "समय" },
  "txn.col.type":     { en: "Type",         hi: "प्रकार" },
  "txn.col.amount":   { en: "Amount",       hi: "राशि" },
  "txn.col.reason":   { en: "Reason",       hi: "कारण" },
  "txn.col.balance":  { en: "Balance",      hi: "शेष" },
  "txn.empty":        { en: "No transactions yet. Start a search to see them here.", hi: "अभी कोई लेन-देन नहीं। एक खोज शुरू करें।" },
  "txn.loading":      { en: "Loading…",     hi: "लोड हो रहा है…" },
  "txn.type.spend":   { en: "Spend",        hi: "खर्च" },
  "txn.type.refund":  { en: "Refund",       hi: "रिफंड" },
  "txn.type.earn":    { en: "Earn",         hi: "कमाई" },
  "txn.type.grant":   { en: "Grant",        hi: "प्रीमियम" },
  "txn.type.bonus":   { en: "Bonus",        hi: "बोनस" },
  "txn.type.init":    { en: "Welcome",      hi: "स्वागत" },

  // Theme/lang toggles
  "ui.theme.dark":    { en: "Dark",         hi: "डार्क" },
  "ui.theme.light":   { en: "Light",        hi: "लाइट" },
  "ui.lang.toggle":   { en: "हिन्दी",       hi: "EN" },
};

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: (key: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function readInitialLang(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "hi") return stored;
  } catch {}
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readInitialLang);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.setAttribute("lang", lang);
    } catch {}
  }, [lang]);

  const setLang = (l: Lang) => setLangState(l);
  const toggle = () => setLangState((l) => (l === "en" ? "hi" : "en"));

  const t = (key: string, fallback?: string) => {
    const entry = TRANSLATIONS[key];
    if (!entry) return fallback ?? key;
    return entry[lang] ?? entry.en ?? fallback ?? key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, toggle, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      lang: "en",
      setLang: () => {},
      toggle: () => {},
      t: (_k, fallback) => fallback ?? _k,
    };
  }
  return ctx;
}
