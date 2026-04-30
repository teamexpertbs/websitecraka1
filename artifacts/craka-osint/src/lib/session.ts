const SESSION_KEY = "craka_session_id";

export function getOrCreateSession(): string {
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = "sess_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export async function ensureUserInitialized(): Promise<void> {
  const sessionId = getOrCreateSession();
  const ref = new URLSearchParams(window.location.search).get("ref") ?? undefined;
  try {
    await fetch(`${API_BASE}/api/user/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ref ? { sessionId, referralCode: ref } : { sessionId }),
    });
  } catch {
  }
}
