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

// Realtime websocket configuration removed.
