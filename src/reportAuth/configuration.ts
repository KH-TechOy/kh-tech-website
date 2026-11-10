// Pure public configuration: safe for privacy copy without initializing Firebase on public pages.
export const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "";
export const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || "";
export const appId = import.meta.env.VITE_FIREBASE_APP_ID || "";
export const reportApi = (import.meta.env.VITE_REPORT_API_URL || "").replace(
  /\/$/,
  "",
);
export const localEmulators =
  import.meta.env.DEV && import.meta.env.VITE_REPORT_EMULATORS === "1";
export const reportConfigured =
  !!projectId &&
  !!apiKey &&
  !!appId &&
  (/^https:\/\/[^/@?#]+$/.test(reportApi) ||
    (localEmulators && reportApi === "http://127.0.0.1:8788"));
