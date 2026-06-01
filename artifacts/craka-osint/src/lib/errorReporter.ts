const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const ENDPOINT = `${API_BASE}/api/admin/logs/browser-error`;

function send(msg: string, extra?: { url?: string; stack?: string; type?: string }) {
  try {
    navigator.sendBeacon(
      ENDPOINT,
      new Blob(
        [JSON.stringify({ msg: String(msg).slice(0, 500), userAgent: navigator.userAgent, ...extra })],
        { type: "application/json" }
      )
    );
  } catch {
    // If sendBeacon fails, try fetch silently
    try {
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ msg: String(msg).slice(0, 500), userAgent: navigator.userAgent, ...extra }),
        keepalive: true,
      }).catch(() => {});
    } catch {}
  }
}

let installed = false;

export function installErrorReporter() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  // Uncaught JS errors
  window.onerror = (message, source, lineno, colno, error) => {
    const msg = `[JS Error] ${message}`;
    send(msg, {
      url: source ? `${source}:${lineno}:${colno}` : window.location.href,
      stack: error?.stack?.slice(0, 800),
      type: "js_error",
    });
    return false;
  };

  // Unhandled promise rejections
  window.onunhandledrejection = (event) => {
    const reason = event.reason;
    const msg = `[Unhandled Promise] ${reason instanceof Error ? reason.message : String(reason)}`;
    send(msg, {
      url: window.location.href,
      stack: reason instanceof Error ? reason.stack?.slice(0, 800) : undefined,
      type: "unhandled_rejection",
    });
  };

  // Network / resource errors (404, 401, etc.) via fetch intercept
  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const url = typeof args[0] === "string" ? args[0] : (args[0] instanceof Request ? args[0].url : String(args[0]));
    try {
      const resp = await origFetch(...args);
      // Report API errors (4xx/5xx) but not the error-reporter endpoint itself
      if (!resp.ok && !url.includes("/api/admin/logs/browser-error")) {
        send(`[Network ${resp.status}] ${resp.statusText || "Error"} — ${url}`, {
          url,
          type: `http_${resp.status}`,
        });
      }
      return resp;
    } catch (err: any) {
      if (!url.includes("/api/admin/logs/browser-error")) {
        send(`[Fetch Failed] ${err?.message || "Network error"} — ${url}`, {
          url,
          stack: err?.stack?.slice(0, 400),
          type: "fetch_error",
        });
      }
      throw err;
    }
  };
}
