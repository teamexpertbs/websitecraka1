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
  "nav.profile":      { en: "Profile",      hi: "प्रोफ़ाइल" },
  "nav.notifications":{ en: "Notifications",hi: "सूचनाएँ" },
  "nav.account":      { en: "Account",      hi: "अकाउंट" },

  // Token badge
  "tokens.label":     { en: "Tokens",       hi: "टोकन" },
  "tokens.unlimited": { en: "Unlimited",    hi: "असीमित" },
  "tokens.plan":      { en: "Plan",         hi: "प्लान" },
  "tokens.free":      { en: "Free",         hi: "मुफ़्त" },
  "tokens.credits":   { en: "Credits",      hi: "क्रेडिट" },

  // Common buttons
  "btn.search":       { en: "Search",       hi: "खोजें" },
  "btn.cancel":       { en: "Cancel",       hi: "रद्द करें" },
  "btn.refresh":      { en: "Refresh",      hi: "रीफ़्रेश" },
  "btn.delete":       { en: "Delete",       hi: "हटाएँ" },
  "btn.save":         { en: "Save",         hi: "सहेजें" },
  "btn.copy":         { en: "Copy",         hi: "कॉपी करें" },
  "btn.apply":        { en: "Apply",        hi: "लागू करें" },
  "btn.redeem":       { en: "Redeem",       hi: "रिडीम करें" },
  "btn.upgrade":      { en: "Upgrade Now",  hi: "अभी अपग्रेड करें" },
  "btn.signin":       { en: "Sign In",      hi: "लॉगिन करें" },
  "btn.signup":       { en: "Sign Up",      hi: "अकाउंट बनाएँ" },

  // Home / Search
  "home.title":       { en: "CraKa OSINT Terminal", hi: "CraKa OSINT टर्मिनल" },
  "home.subtitle":    { en: "Select a module and enter your query to begin", hi: "एक मॉड्यूल चुनें और खोज शुरू करें" },
  "home.searching":   { en: "Searching...", hi: "खोज रहे हैं..." },
  "home.no_results":  { en: "No results found", hi: "कोई परिणाम नहीं मिला" },
  "home.results":     { en: "Results",      hi: "परिणाम" },
  "home.bookmark":    { en: "Bookmark",     hi: "बुकमार्क" },
  "home.bookmarked":  { en: "Bookmarked",   hi: "बुकमार्क किया" },
  "home.export":      { en: "Export",       hi: "एक्सपोर्ट" },
  "home.share":       { en: "Share",        hi: "शेयर करें" },

  // Profile page
  "profile.title":    { en: "My Profile",   hi: "मेरी प्रोफ़ाइल" },
  "profile.subtitle": { en: "Manage your account, bookmarks, and rewards.", hi: "अपना अकाउंट, बुकमार्क और रिवार्ड्स प्रबंधित करें।" },
  "profile.referrals":{ en: "Referrals",    hi: "रेफरल" },
  "profile.bookmarks":{ en: "Bookmarks",    hi: "बुकमार्क" },
  "profile.saved":    { en: "Saved Lookups", hi: "सेव की गई खोज" },
  "profile.no_bookmarks": { en: "No bookmarks yet. Use the bookmark button on search results.", hi: "अभी कोई बुकमार्क नहीं। खोज परिणामों पर बुकमार्क बटन इस्तेमाल करें।" },
  "profile.coupon":   { en: "Redeem Coupon", hi: "कूपन रिडीम करें" },
  "profile.coupon_hint": { en: "Get coupon codes from admin or special promotions.", hi: "एडमिन या स्पेशल प्रमोशन से कूपन कोड प्राप्त करें।" },
  "profile.referral_apply": { en: "Apply Friend's Referral Code", hi: "दोस्त का रेफरल कोड लगाएँ" },
  "profile.referral_hint": { en: "Enter your friend's referral code — you'll get +5 tokens!", hi: "दोस्त का रेफरल कोड डालो — आपको +5 टोकन मिलेंगे!" },
  "profile.refer_earn": { en: "Refer & Earn", hi: "रेफर करें और कमाएँ" },
  "profile.invite_friends": { en: "Invite friends for credits", hi: "दोस्तों को बुलाएँ, क्रेडिट कमाएँ" },
  "profile.go_premium": { en: "Go Premium", hi: "प्रीमियम लें" },
  "profile.unlimited": { en: "Unlimited searches", hi: "असीमित खोज" },
  "profile.danger_zone": { en: "Danger Zone", hi: "खतरनाक ज़ोन" },
  "profile.delete_account": { en: "Delete My Account", hi: "अकाउंट हटाएँ" },
  "profile.delete_warning": { en: "Your account and all data will be permanently deleted. This action cannot be undone.", hi: "आपका अकाउंट और सारा डेटा स्थायी रूप से हटा दिया जाएगा। यह कार्य पूर्ववत नहीं हो सकता।" },
  "profile.delete_confirm": { en: "Are you sure you want to delete your account?", hi: "क्या आप सच में अपना अकाउंट हटाना चाहते हैं?" },
  "profile.delete_type": { en: "Type DELETE to confirm:", hi: "कन्फ़र्म करने के लिए DELETE टाइप करें:" },
  "profile.delete_permanently": { en: "Permanently Delete", hi: "स्थायी रूप से हटाएँ" },
  "profile.free_plan": { en: "Free Plan",   hi: "मुफ़्त प्लान" },

  // Premium page
  "premium.title":    { en: "Unlock the Full CraKa OSINT Power", hi: "CraKa OSINT की पूरी शक्ति खोलें" },
  "premium.subtitle": { en: "Get unlimited lookups, priority access, and exclusive tools.", hi: "असीमित खोज, प्राथमिक एक्सेस, और विशेष टूल्स पाएँ।" },
  "premium.user_id":  { en: "Your User ID", hi: "आपकी यूज़र ID" },
  "premium.how":      { en: "How to get Premium?", hi: "प्रीमियम कैसे लें?" },
  "premium.wa_dm":    { en: "DM on WhatsApp", hi: "WhatsApp पर DM करें" },
  "premium.tg_dm":    { en: "DM on Telegram", hi: "Telegram पर DM करें" },
  "premium.instant":  { en: "5 min activation", hi: "5 मिनट में एक्टिवेशन" },
  "premium.support":  { en: "24/7 support",  hi: "24/7 सहायता" },

  // Refer page
  "refer.title":      { en: "Refer & Earn",  hi: "रेफर करें और कमाएँ" },
  "refer.subtitle":   { en: "Share your referral code with friends and earn free tokens!", hi: "दोस्तों के साथ अपना रेफरल कोड शेयर करें और मुफ़्त टोकन कमाएँ!" },

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

  // Login page
  "login.title":      { en: "Sign In",      hi: "लॉगिन करें" },
  "login.subtitle":   { en: "Sign in with Google to access all OSINT tools", hi: "सभी OSINT टूल्स इस्तेमाल करने के लिए Google से लॉगिन करें" },
  "login.email":      { en: "Email Address", hi: "ईमेल पता" },
  "login.password":   { en: "Password",     hi: "पासवर्ड" },
  "login.name":       { en: "Full Name",    hi: "पूरा नाम" },
  "login.forgot":     { en: "Forgot password?", hi: "पासवर्ड भूल गए?" },
  "login.or":         { en: "or",           hi: "या" },
  "login.google":     { en: "Sign in with Google", hi: "Google से लॉगिन करें" },

  // Theme/lang toggles
  "ui.theme.dark":    { en: "Dark",         hi: "डार्क" },
  "ui.theme.light":   { en: "Light",        hi: "लाइट" },
  "ui.lang.toggle":   { en: "हिन्दी",       hi: "EN" },

  // Misc
  "misc.developed_by": { en: "Developed by", hi: "बनाया" },
  "misc.loading":     { en: "Loading...",    hi: "लोड हो रहा है..." },
  "misc.error":       { en: "Error",        hi: "त्रुटि" },
  "misc.success":     { en: "Success",      hi: "सफल" },
  "misc.anonymous":   { en: "Anonymous User", hi: "अज्ञात यूज़र" },
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
