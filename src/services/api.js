// src/services/api.js
import axios from "axios";

/**
 * Axios instance + helpers with multi-tenant support.
 *
 * Highlights:
 * - Base URL:
 *     - If VITE_API_URL is set → `${VITE_API_URL}/api`
 *     - Else (default) → `/api`  ← works great with Vite proxy in dev
 * - Cookie auth toggle via VITE_USE_COOKIES (default: true)
 * - Bearer token from localStorage key "auth.token"
 * - Org header "X-Org-Id" from localStorage key "auth.orgId"
 * - Unwraps { items: [] } for common list endpoints
 * - 401 handling: clears token (if present) and surfaces normalized Error
 */

const RAW_API = (import.meta?.env?.VITE_API_URL ?? "").trim();
const API_ROOT = RAW_API ? RAW_API.replace(/\/$/, "") : "";
const BASE_URL = `${API_ROOT || ""}/api`; // → '/api' if no env var (use Vite proxy)

export const USE_COOKIES =
  String(import.meta?.env?.VITE_USE_COOKIES ?? "true").toLowerCase() !== "false";

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: USE_COOKIES,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  timeout: 25_000,
});

// ---------- tiny utils ----------
const getToken = () => localStorage.getItem("auth.token");
const getOrgId = () => localStorage.getItem("auth.orgId");

const buildQuery = (params = {}) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) v.forEach((vv) => q.append(k, String(vv)));
    else q.append(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
};

const toItems = (data) => (Array.isArray(data) ? data : data?.items ?? []);

const getPathname = (cfg) => {
  try {
    const base = cfg.baseURL ?? api.defaults.baseURL ?? (typeof window !== "undefined" ? window.location.origin : "http://localhost");
    const u = new URL(cfg.url, base);
    // Normalize like '/leads', '/deals/123'
    return u.pathname.replace(/^\/api\//, "/");
  } catch {
    return String(cfg.url || "");
  }
};

// Common REST plural resources we unwrap
const resourceListRegex =
  /^\/?(leads|contacts|products|deals|quotes|invoices|salesorders|tasks|meetings|calls|documents|campaigns|activities|forecasts)(?:[/?#]|$)/i;

// ---------- interceptors ----------
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token && !config.headers?.Authorization) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  const orgId = getOrgId();
  if (orgId && !config.headers?.["X-Org-Id"]) {
    config.headers = config.headers ?? {};
    config.headers["X-Org-Id"] = orgId;
  }
  return config;
});

api.interceptors.response.use(
  (res) => {
    try {
      const method = (res?.config?.method || "get").toLowerCase();
      if (method === "get") {
        const path = getPathname(res.config);
        const looksLikeList = resourceListRegex.test(path);
        if (
          looksLikeList &&
          res?.data &&
          !Array.isArray(res.data) &&
          Array.isArray(res.data.items)
        ) {
          // unwrap { items: [...] }
          res.data = res.data.items;
        }
      }
    } catch {
      // no-op
    }
    return res;
  },
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      // Clear only if we actually had a token
      if (getToken()) localStorage.removeItem("auth.token");
      // Optional: broadcast an app-wide event you can listen for if desired
      try {
        window.dispatchEvent(new CustomEvent("zura:auth:unauthorized"));
      } catch {}
    }
    const server = err?.response?.data ?? {};
    const message = server.message || server.error || err?.message || "Request failed";
    const norm = Object.assign(new Error(message), { status, server, raw: err });
    return Promise.reject(norm);
  }
);

// ---------- session helpers ----------
export function setAuthSession({ token, orgId } = {}) {
  if (token) localStorage.setItem("auth.token", token);
  else localStorage.removeItem("auth.token");

  if (orgId) localStorage.setItem("auth.orgId", orgId);
  else localStorage.removeItem("auth.orgId");
}
export function clearAuthSession() {
  setAuthSession({ token: null, orgId: null });
}

// PATCH with graceful PUT fallback (handles 405/404 servers)
async function updateWithFallback(resource, id, data) {
  try {
    const r = await api.patch(`/${resource}/${id}`, data);
    return r.data;
  } catch (e) {
    if (e.status === 405 || e.status === 404) {
      const r2 = await api.put(`/${resource}/${id}`, data);
      return r2.data;
    }
    throw e;
  }
}

// Generic CRUD builder
const crud = (resource) => ({
  listRaw: (params) => api.get(`/${resource}${buildQuery(params)}`).then((r) => r.data),
  list: (params) => api.get(`/${resource}${buildQuery(params)}`).then((r) => toItems(r.data)),
  get: (id) => api.get(`/${resource}/${id}`).then((r) => r.data),
  create: (data) => api.post(`/${resource}`, data).then((r) => r.data),
  update: (id, data) => updateWithFallback(resource, id, data),
  remove: (id) => api.delete(`/${resource}/${id}`).then((r) => r.data),
});

// First existing endpoint that works (signin/login, signup/register, etc.)
async function postFirst(paths, payload = {}) {
  let lastErr;
  for (const p of paths) {
    try {
      const r = await api.post(p, payload);
      return r.data;
    } catch (e) {
      lastErr = e;
      if (e.status !== 404 && e.status !== 405) throw e;
    }
  }
  throw lastErr;
}

// ---------- Auth ----------
export const AuthAPI = {
  me: async () => {
    // If you're cookie-auth only, we can still call /auth/me.
    // If you're token-auth and no token exists, skip the network noise.
    const t = getToken();
    if (!USE_COOKIES && !t) return null;

    try {
      const r = await api.get("/auth/me");
      return r.data; // { user, org, ... }
    } catch (e) {
      if (e.status === 401) return null;
      throw e;
    }
  },
  signin: (data) => postFirst(["/auth/signin", "/auth/login"], data),
  signup: (data) => postFirst(["/auth/signup", "/auth/register"], data),
  signout: () => postFirst(["/auth/signout", "/auth/logout"], {}),
};

// ---------- Core resources ----------
export const LeadsAPI = crud("leads");
export const ContactsAPI = crud("contacts");

export const DealsAPI = {
  ...crud("deals"),
  stages: () => api.get("/deals/stages").then((r) => r.data),
  byKanban: (params) =>
    api.get(`/deals${buildQuery({ view: "kanban", ...(params || {}) })}`).then((r) => r.data),
};

export const TasksAPI = crud("tasks");
export const MeetingsAPI = crud("meetings");
export const CallsAPI = crud("calls");

export const ProductsAPI = crud("products");
export const QuotesAPI = crud("quotes");
export const SalesOrdersAPI = crud("salesorders");
export const InvoicesAPI = crud("invoices");

export const CampaignsAPI = crud("campaigns");

// Documents (upload/download helpers)
export const DocumentsAPI = {
  ...crud("documents"),
  upload: async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    const r = await api.post("/documents", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return r.data;
  },
  download: async (id) => {
    const r = await api.get(`/documents/${id}/download`, { responseType: "blob" });
    return r.data; // Blob
  },
};

// Forecasts & Stats
export const ForecastsAPI = {
  summary: () => api.get("/forecasts/summary").then((r) => r.data),
};

export const StatsAPI = {
  leads: () => api.get("/leads/stats").then((r) => r.data),
  deals: () => api.get("/deals/stats").then((r) => r.data),
  activities: () => api.get("/activities/stats").then((r) => r.data),
};

export default api;
