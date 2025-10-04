const FALLBACK_GRAPHQL_PATH = "/graphql";

function stripTrailingSlash(input: string): string {
  return input.replace(/\/?$/, "");
}

function getBrowserOrigin(): string {
  if (typeof window === "undefined") {
    return "http://localhost:4000";
  }

  return window.location.origin;
}

export function resolveApiUrl(): string {
  const baseOrigin = getBrowserOrigin();
  const fallback = `${stripTrailingSlash(baseOrigin)}${FALLBACK_GRAPHQL_PATH}`;

  const rawEnv = import.meta.env.VITE_API_URL?.trim();
  if (!rawEnv) {
    return fallback;
  }

  try {
    const candidate = new URL(rawEnv, baseOrigin);
    const isInternalService = candidate.hostname.endsWith(".svc.cluster.local");
    const protocolMismatch =
      typeof window !== "undefined" &&
      window.location.protocol === "http:" &&
      candidate.protocol === "https:";

    if (isInternalService || protocolMismatch) {
      return fallback;
    }

    return stripTrailingSlash(candidate.toString());
  } catch (error) {
    return fallback;
  }
}

const REALTIME_ENV_KEYS = [
  "VITE_REALTIME_URL",
  "VITE_WEBSOCKET_URL",
  "VITE_REALTIME_WS",
] as const;

type EnvRecord = Record<string, string | undefined>;

function readRealtimeEnv(): string | null {
  const env = import.meta.env as EnvRecord;

  for (const key of REALTIME_ENV_KEYS) {
    const value = env[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

export function resolveRealtimeUrl(): string {
  const baseOrigin = getBrowserOrigin();
  const envValue = readRealtimeEnv();

  if (envValue) {
    try {
      const candidate = new URL(envValue, baseOrigin);
      if (candidate.protocol === "http:" || candidate.protocol === "https:") {
        candidate.protocol = candidate.protocol === "https:" ? "wss:" : "ws:";
      }
      return stripTrailingSlash(candidate.toString());
    } catch (error) {
      // Ignore malformed env URLs and fall back to derived values
    }
  }

  try {
    const apiUrl = new URL(resolveApiUrl());
    const candidate = new URL(apiUrl.toString());
    candidate.protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
    if (apiUrl.port) {
      const portNumber = Number(apiUrl.port);
      if (!Number.isNaN(portNumber)) {
        candidate.port = String(portNumber + 1);
      }
    }
    candidate.pathname = "/realtime";
    return stripTrailingSlash(candidate.toString());
  } catch (error) {
    // Ignore errors and fall back to browser origin
  }

  const fallback = new URL(baseOrigin);
  fallback.protocol = fallback.protocol === "https:" ? "wss:" : "ws:";
  fallback.pathname = "/realtime";
  return stripTrailingSlash(fallback.toString());
}
