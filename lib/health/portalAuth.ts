import { getApiBaseUrl } from "@/constants/oauth";

const PORTAL_TOKEN_KEY = "rural-health-access.portal-token";

/**
 * Doctor portal session storage.
 *
 * The main app relies on cookie-based auth on web (getSessionToken returns
 * null on web by design), but the portal talks to JSON/SSE endpoints behind
 * JwtAuthGuard. We therefore keep a portal-scoped bearer token in localStorage
 * and attach it explicitly to portal requests.
 */

export function getPortalToken(): string | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(PORTAL_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setPortalToken(token: string): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PORTAL_TOKEN_KEY, token);
  } catch {
    /* noop */
  }
}

export function clearPortalToken(): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(PORTAL_TOKEN_KEY);
  } catch {
    /* noop */
  }
}

export type PortalProfile = {
  openId: string;
  name: string;
  role: string;
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    if (typeof atob !== "function") return null;
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Decodes the stored portal token into a lightweight profile for UI display. */
export function getPortalProfile(): PortalProfile | null {
  const token = getPortalToken();
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.openId !== "string" || !payload.openId) return null;
  return {
    openId: payload.openId,
    name: typeof payload.name === "string" && payload.name ? payload.name : payload.openId,
    role: typeof payload.role === "string" ? payload.role : "user",
  };
}

const headers = () => {
  const token = getPortalToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

/** Exchanges an Open ID (staff id) for a JWT access token. */
export async function portalLogin(openId: string): Promise<string> {
  const res = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ openId }),
  });
  if (!res.ok) {
    throw new Error(`Login failed (${res.status})`);
  }
  const data = (await res.json()) as { accessToken: string; user: unknown };
  setPortalToken(data.accessToken);
  return data.accessToken;
}

/** Generic authed JSON request used by the portal. */
export async function portalFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: { ...headers(), ...(init.headers ?? {}) },
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}
