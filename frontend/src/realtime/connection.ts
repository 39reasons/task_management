import { resolveRealtimeUrl } from "../utils/apiConfig";
import { getClientId } from "../utils/clientId";
import type { EventPayload, EventType, RealtimeEvent } from "./types";

type Listener = (event: RealtimeEvent) => void;

const listeners = new Map<EventType, Set<Listener>>();
const topicCounts = new Map<string, number>();
const desiredTopics = new Set<string>();

let websocket: WebSocket | null = null;
let reconnectTimer: number | null = null;
let reconnectAttempt = 0;
let shouldReconnect = false;
let isConnecting = false;
let clientId: string | null = null;

function ensureClientId(): string {
  if (!clientId) {
    clientId = getClientId();
  }
  return clientId;
}

function clearReconnectTimer() {
  if (reconnectTimer !== null) {
    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function scheduleReconnect() {
  if (typeof window === "undefined") {
    return;
  }
  if (!shouldReconnect) {
    return;
  }
  if (reconnectTimer !== null) {
    return;
  }
  const backoff = Math.min(1000 * 2 ** Math.min(reconnectAttempt, 6), 8000);
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, backoff);
}

function teardownConnection(reason = "normal") {
  shouldReconnect = false;
  clearReconnectTimer();
  if (websocket) {
    try {
      websocket.close(1000, reason);
    } catch {
      websocket.close();
    }
  }
  websocket = null;
  isConnecting = false;
}

function handleMessage(data: string) {
  let payload: unknown;
  try {
    payload = JSON.parse(data);
  } catch {
    return;
  }

  if (!payload || typeof payload !== "object") {
    return;
  }

  const event = payload as RealtimeEvent;
  if (!("type" in event)) {
    return;
  }

  const targetListeners = listeners.get(event.type);
  if (!targetListeners || targetListeners.size === 0) {
    return;
  }

  for (const listener of Array.from(targetListeners)) {
    try {
      listener(event);
    } catch (error) {
      // Ignore listener errors to avoid breaking delivery to others
      console.error("Realtime listener error", error);
    }
  }
}

function send(message: Record<string, unknown>) {
  if (!websocket || websocket.readyState !== WebSocket.OPEN) {
    return;
  }

  try {
    websocket.send(JSON.stringify(message));
  } catch {
    // Ignore send errors; connection lifecycle will handle retries
  }
}

function resubscribeAll() {
  const id = ensureClientId();
  for (const topic of desiredTopics) {
    send({ type: "subscribe", topic, client_id: id });
  }
}

function connect() {
  if (typeof window === "undefined") {
    return;
  }

  if (isConnecting || websocket) {
    return;
  }

  isConnecting = true;
  shouldReconnect = true;
  reconnectAttempt += 1;
  clearReconnectTimer();

  const url = resolveRealtimeUrl();
  const ws = new WebSocket(url);
  websocket = ws;

  ws.addEventListener("open", () => {
    isConnecting = false;
    reconnectAttempt = 0;
    const id = ensureClientId();
    send({ type: "identify", client_id: id });
    resubscribeAll();
  });

  ws.addEventListener("message", (event) => {
    handleMessage(event.data);
  });

  ws.addEventListener("close", () => {
    websocket = null;
    isConnecting = false;
    if (!shouldReconnect || desiredTopics.size === 0) {
      return;
    }
    scheduleReconnect();
  });

  ws.addEventListener("error", () => {
    ws.close();
  });
}

function ensureConnection() {
  if (typeof window === "undefined") {
    return;
  }
  if (!websocket && !isConnecting && desiredTopics.size > 0) {
    connect();
  }
}

function subscribeTopic(topic: string): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const id = ensureClientId();
  const currentCount = topicCounts.get(topic) ?? 0;
  topicCounts.set(topic, currentCount + 1);
  desiredTopics.add(topic);

  if (currentCount === 0) {
    ensureConnection();
    send({ type: "subscribe", topic, client_id: id });
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
      connect();
    }
  } else {
    ensureConnection();
  }

  return () => {
    const existing = topicCounts.get(topic);
    if (!existing) {
      return;
    }

    if (existing <= 1) {
      topicCounts.delete(topic);
      desiredTopics.delete(topic);
      send({ type: "unsubscribe", topic, client_id: id });
      if (desiredTopics.size === 0) {
        teardownConnection("no-topics");
      }
    } else {
      topicCounts.set(topic, existing - 1);
    }
  };
}

export function subscribeToProject(projectId: string): () => void {
  return subscribeTopic(`project:${projectId}`);
}

export function subscribeToUser(userId: string): () => void {
  return subscribeTopic(`user:${userId}`);
}

export function addRealtimeListener<T extends EventType>(
  type: T,
  handler: (event: EventPayload<T>) => void
): () => void {
  const wrapped: Listener = (event) => {
    if (event.type === type) {
      handler(event as EventPayload<T>);
    }
  };

  const entry = listeners.get(type);
  if (entry) {
    entry.add(wrapped);
  } else {
    listeners.set(type, new Set([wrapped]));
  }

  return () => {
    const current = listeners.get(type);
    if (!current) {
      return;
    }
    current.delete(wrapped);
    if (current.size === 0) {
      listeners.delete(type);
    }
  };
}
