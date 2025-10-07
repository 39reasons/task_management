import { EventEmitter } from "node:events";
import { createClient } from "redis";
import type { Notification } from "@shared/types";

type NotificationCreatedOrUpdatedEvent = {
  type: "created" | "updated";
  notification: Notification;
};

type NotificationDeletedEvent = {
  type: "deleted";
  notificationId: string;
  recipientId: string | null;
};

export type NotificationPubSubEvent =
  | NotificationCreatedOrUpdatedEvent
  | NotificationDeletedEvent;

type EventHandler = (event: NotificationPubSubEvent) => void;

const CHANNEL = "notifications/events/v1";
const emitter = new EventEmitter();

const redisUrl = process.env.REDIS_URL ?? null;

type RedisClient = ReturnType<typeof createClient>;

let publisherPromise: Promise<RedisClient> | null = null;
let subscriberPromise: Promise<RedisClient> | null = null;
let subscriberReady = false;

async function createRedisClient(): Promise<RedisClient> {
  if (!redisUrl) {
    throw new Error("Redis URL is not configured");
  }
  const client = createClient({ url: redisUrl });
  client.on("error", (error) => {
    console.error("[redis] Notification pub/sub client error:", error);
  });
  await client.connect();
  return client;
}

async function getPublisher(): Promise<RedisClient | null> {
  if (!redisUrl) return null;
  if (!publisherPromise) {
    publisherPromise = createRedisClient().catch((error) => {
      publisherPromise = null;
      console.error("[redis] Failed to initialise publisher:", error);
      throw error;
    });
  }
  try {
    return await publisherPromise;
  } catch {
    return null;
  }
}

async function ensureSubscriber(): Promise<void> {
  if (!redisUrl || subscriberReady) {
    return;
  }

  if (!subscriberPromise) {
    subscriberPromise = createRedisClient().catch((error) => {
      subscriberPromise = null;
      console.error("[redis] Failed to initialise subscriber:", error);
      throw error;
    });
  }

  try {
    const subscriber = await subscriberPromise;
    await subscriber.subscribe(CHANNEL, (message) => {
      try {
        const parsed = JSON.parse(message) as NotificationPubSubEvent;
        emitLocal(parsed);
      } catch (error) {
        console.error("[redis] Failed to parse notification message:", error);
      }
    });
    subscriberReady = true;
  } catch (error) {
    console.error("[redis] Subscription setup failed:", error);
  }
}

function emitLocal(event: NotificationPubSubEvent) {
  setImmediate(() => emitter.emit("event", event));
}

export async function publishNotificationEvent(
  event: NotificationPubSubEvent
): Promise<void> {
  emitLocal(event);

  const publisher = await getPublisher();
  if (!publisher) {
    return;
  }

  try {
    await publisher.publish(CHANNEL, JSON.stringify(event));
  } catch (error) {
    console.error("[redis] Failed to publish notification event:", error);
  }
}

export function subscribeToNotificationEvents(handler: EventHandler): () => void {
  emitter.on("event", handler);
  void ensureSubscriber();
  return () => {
    emitter.off("event", handler);
  };
}

function resolveRecipientId(event: NotificationPubSubEvent): string | null {
  if (event.type === "deleted") {
    return event.recipientId;
  }
  return event.notification.recipient_id ?? null;
}

export function createNotificationEventStream(
  recipientId: string
): AsyncIterableIterator<NotificationPubSubEvent> {
  const buffer: NotificationPubSubEvent[] = [];
  const pending: Array<(value: IteratorResult<NotificationPubSubEvent>) => void> = [];
  let listening = true;

  const forward = (event: NotificationPubSubEvent) => {
    const targetId = resolveRecipientId(event);
    if (!targetId || targetId !== recipientId) {
      return;
    }

    if (pending.length > 0) {
      pending.shift()?.({ value: event, done: false });
    } else {
      buffer.push(event);
    }
  };

  const unsubscribe = subscribeToNotificationEvents(forward);

  const iterator: AsyncIterableIterator<NotificationPubSubEvent> = {
    async next(): Promise<IteratorResult<NotificationPubSubEvent>> {
      if (!listening && buffer.length === 0) {
        return { value: undefined, done: true } as IteratorResult<NotificationPubSubEvent>;
      }
      if (buffer.length > 0) {
        const value = buffer.shift()!;
        return { value, done: false };
      }
      return await new Promise<IteratorResult<NotificationPubSubEvent>>((resolve) => {
        pending.push(resolve);
      });
    },
    async return(): Promise<IteratorResult<NotificationPubSubEvent>> {
      listening = false;
      unsubscribe();
      while (pending.length > 0) {
        pending.shift()?.({ value: undefined, done: true } as IteratorResult<NotificationPubSubEvent>);
      }
      return { value: undefined, done: true } as IteratorResult<NotificationPubSubEvent>;
    },
    async throw(error): Promise<IteratorResult<NotificationPubSubEvent>> {
      listening = false;
      unsubscribe();
      while (pending.length > 0) {
        pending.shift()?.({ value: undefined, done: true } as IteratorResult<NotificationPubSubEvent>);
      }
      return Promise.reject(error);
    },
    [Symbol.asyncIterator]() {
      return iterator;
    },
  };

  return iterator;
}
