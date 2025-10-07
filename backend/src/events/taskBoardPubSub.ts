import { EventEmitter } from "node:events";
import { createClient } from "redis";
import { TASK_BOARD_ALL_PROJECTS } from "../../../shared/types.js";

export type TaskBoardEventAction =
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "TASK_DELETED"
  | "TASK_MOVED"
  | "TASKS_REORDERED"
  | "STAGE_CREATED"
  | "STAGE_UPDATED"
  | "STAGE_DELETED"
  | "STAGES_REORDERED";

export interface TaskBoardEvent {
  action: TaskBoardEventAction;
  project_id: string;
  workflow_id?: string | null;
  stage_id?: string | null;
  previous_stage_id?: string | null;
  task_id?: string | null;
  task_ids?: string[] | null;
  stage_ids?: string[] | null;
  origin?: string | null;
  timestamp?: string;
}

type EventHandler = (event: TaskBoardEvent) => void;

const CHANNEL = "tasks/board-events/v1";
const emitter = new EventEmitter();

export const ALL_PROJECTS_CHANNEL = TASK_BOARD_ALL_PROJECTS;

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
    console.error("[redis] Board pub/sub client error:", error);
  });
  await client.connect();
  return client;
}

async function getPublisher(): Promise<RedisClient | null> {
  if (!redisUrl) return null;
  if (!publisherPromise) {
    publisherPromise = createRedisClient().catch((error) => {
      publisherPromise = null;
      console.error("[redis] Failed to initialise board publisher:", error);
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
      console.error("[redis] Failed to initialise board subscriber:", error);
      throw error;
    });
  }

  try {
    const subscriber = await subscriberPromise;
    await subscriber.subscribe(CHANNEL, (message) => {
      try {
        const parsed = JSON.parse(message) as TaskBoardEvent;
        emitLocal(parsed);
      } catch (error) {
        console.error("[redis] Failed to parse board message:", error);
      }
    });
    subscriberReady = true;
  } catch (error) {
    console.error("[redis] Board subscription setup failed:", error);
  }
}

function emitLocal(event: TaskBoardEvent) {
  setImmediate(() => emitter.emit("event", event));
}

export async function publishTaskBoardEvent(event: TaskBoardEvent): Promise<void> {
  emitLocal(event);

  const publisher = await getPublisher();
  if (!publisher) {
    return;
  }

  try {
    await publisher.publish(CHANNEL, JSON.stringify(event));
  } catch (error) {
    console.error("[redis] Failed to publish board event:", error);
  }
}

export function subscribeToTaskBoardEvents(handler: EventHandler): () => void {
  emitter.on("event", handler);
  void ensureSubscriber();
  return () => {
    emitter.off("event", handler);
  };
}

function shouldForwardEvent(event: TaskBoardEvent, subscriberProjectId: string): boolean {
  if (!event.project_id) {
    return false;
  }
  if (subscriberProjectId === ALL_PROJECTS_CHANNEL) {
    return true;
  }
  return event.project_id === subscriberProjectId;
}

export function createTaskBoardEventStream(
  projectId: string
): AsyncIterableIterator<TaskBoardEvent> {
  const buffer: TaskBoardEvent[] = [];
  const pending: Array<(value: IteratorResult<TaskBoardEvent>) => void> = [];
  let listening = true;

  const forward = (event: TaskBoardEvent) => {
    if (!shouldForwardEvent(event, projectId)) {
      return;
    }

    if (pending.length > 0) {
      pending.shift()?.({ value: event, done: false });
    } else {
      buffer.push(event);
    }
  };

  const unsubscribe = subscribeToTaskBoardEvents(forward);

  const iterator: AsyncIterableIterator<TaskBoardEvent> = {
    async next(): Promise<IteratorResult<TaskBoardEvent>> {
      if (!listening && buffer.length === 0) {
        return { value: undefined, done: true } as IteratorResult<TaskBoardEvent>;
      }
      if (buffer.length > 0) {
        const value = buffer.shift()!;
        return { value, done: false };
      }
      return await new Promise<IteratorResult<TaskBoardEvent>>((resolve) => {
        pending.push(resolve);
      });
    },
    async return(): Promise<IteratorResult<TaskBoardEvent>> {
      listening = false;
      unsubscribe();
      while (pending.length > 0) {
        pending.shift()?.({ value: undefined, done: true } as IteratorResult<TaskBoardEvent>);
      }
      return { value: undefined, done: true } as IteratorResult<TaskBoardEvent>;
    },
    async throw(error): Promise<IteratorResult<TaskBoardEvent>> {
      listening = false;
      unsubscribe();
      while (pending.length > 0) {
        pending.shift()?.({ value: undefined, done: true } as IteratorResult<TaskBoardEvent>);
      }
      return Promise.reject(error);
    },
    [Symbol.asyncIterator]() {
      return iterator;
    },
  };

  return iterator;
}
