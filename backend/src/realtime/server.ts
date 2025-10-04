import { WebSocketServer, WebSocket, type RawData } from "ws";
import { randomUUID } from "crypto";
import type { Comment, Notification, Task } from "@shared/types";

export type RealtimeEvent =
  | {
      type: "tasks.reordered";
      project_id: string;
      stage_id: string;
      task_ids: string[];
      origin?: string | null;
    }
  | {
      type: "tasks.created";
      project_id: string;
      stage_id: string;
      task: Task;
      origin?: string | null;
    }
  | {
      type: "tasks.deleted";
      project_id: string;
      stage_id: string;
      task_id: string;
      origin?: string | null;
    }
  | {
      type: "tasks.updated";
      project_id: string;
      stage_id: string;
      task: Task;
      origin?: string | null;
    }
  | {
      type: "notifications.created";
      recipient_id: string;
      notification: Notification;
    }
  | {
      type: "comments.created";
      project_id: string;
      stage_id: string;
      task_id: string;
      comment: Comment;
      origin?: string | null;
    }
  | {
      type: "comments.updated";
      project_id: string;
      stage_id: string;
      task_id: string;
      comment: Comment;
      origin?: string | null;
    }
  | {
      type: "comments.deleted";
      project_id: string;
      stage_id: string;
      task_id: string;
      comment_id: string;
      origin?: string | null;
    };

type SubscriptionClient = {
  ws: WebSocket;
  topics: Set<string>;
  clientId: string;
};

const clients = new Set<SubscriptionClient>();

function serialize(event: RealtimeEvent): string {
  return JSON.stringify(event);
}

type SubscribeMessage = {
  type: "subscribe" | "unsubscribe";
  topic?: string;
  project_id?: string;
  user_id?: string;
  topics?: string[];
  client_id?: string;
};

function toTopics(message: SubscribeMessage): string[] {
  const topics: string[] = [];

  if (Array.isArray(message.topics)) {
    for (const candidate of message.topics) {
      if (typeof candidate === "string" && candidate.length > 0) {
        topics.push(candidate);
      }
    }
  }

  if (typeof message.topic === "string" && message.topic.length > 0) {
    topics.push(message.topic);
  }

  if (typeof message.project_id === "string" && message.project_id.length > 0) {
    topics.push(`project:${message.project_id}`);
  }

  if (typeof message.user_id === "string" && message.user_id.length > 0) {
    topics.push(`user:${message.user_id}`);
  }

  return topics;
}

function getTopicsForEvent(event: RealtimeEvent): string[] {
  switch (event.type) {
    case "tasks.reordered":
      return [`project:${event.project_id}`];
    case "tasks.created":
      return [`project:${event.project_id}`];
    case "tasks.deleted":
      return [`project:${event.project_id}`];
    case "tasks.updated":
      return [`project:${event.project_id}`];
    case "notifications.created":
      return [`user:${event.recipient_id}`];
    case "comments.created":
    case "comments.updated":
    case "comments.deleted":
      return [`project:${event.project_id}`];
    default:
      return [];
  }
}

export function initRealtimeServer(): void {
  const port = Number(process.env.REALTIME_PORT ?? process.env.WEBSOCKET_PORT ?? 4001);
  const wss = new WebSocketServer({ port });

  wss.on("connection", (ws: WebSocket) => {
    const client: SubscriptionClient = {
      ws,
      topics: new Set<string>(),
      clientId: randomUUID(),
    };

    clients.add(client);

    ws.on("message", (raw: RawData) => {
      try {
        const message = JSON.parse(raw.toString());
        if (typeof message !== "object" || message === null) return;

        if (message.type === "subscribe" || message.type === "unsubscribe") {
          const topics = toTopics(message as SubscribeMessage);
          for (const topic of topics) {
            if (message.type === "subscribe") {
              client.topics.add(topic);
            } else {
              client.topics.delete(topic);
            }
          }
          if (typeof message.client_id === "string" && message.client_id.length > 0) {
            client.clientId = message.client_id;
          }
        } else if (message.type === "identify" && typeof message.client_id === "string") {
          client.clientId = message.client_id;
        }
      } catch (error) {
        // Ignore malformed payloads
      }
    });

    ws.on("close", () => {
      clients.delete(client);
    });

    ws.on("error", () => {
      clients.delete(client);
    });
  });

  wss.on("listening", () => {
    console.log(`🔌 Realtime websocket server listening on port ${port}`);
  });

  wss.on("error", (error: Error) => {
    console.error("Realtime server error", error);
  });
}

export function broadcast(event: RealtimeEvent) {
  const payload = serialize(event);
  const eventTopics = getTopicsForEvent(event);
  if (eventTopics.length === 0) return;
  for (const client of clients) {
    let matches = false;
    for (const topic of eventTopics) {
      if (client.topics.has(topic)) {
        matches = true;
        break;
      }
    }
    if (!matches) continue;
    if (client.ws.readyState !== WebSocket.OPEN) continue;
    try {
      client.ws.send(payload);
    } catch (error) {
      client.ws.terminate();
      clients.delete(client);
    }
  }
}
