import { useEffect, useRef } from "react";
import { addRealtimeListener, subscribeToProject } from "../realtime/connection";
import type {
  TaskCreatedEvent,
  TaskDeletedEvent,
  TaskReorderedEvent,
  TaskUpdatedEvent,
} from "../realtime/types";
import { getClientId } from "../utils/clientId";

type TaskRealtimeHandlers = {
  onReordered?: (event: TaskReorderedEvent) => void;
  onCreated?: (event: TaskCreatedEvent) => void;
  onDeleted?: (event: TaskDeletedEvent) => void;
  onUpdated?: (event: TaskUpdatedEvent) => void;
};

export function useTaskRealtime(projectId: string | null, handlers: TaskRealtimeHandlers): void {
  const handlersRef = useRef<TaskRealtimeHandlers>(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const wantsReordered = Boolean(handlers.onReordered);
  const wantsCreated = Boolean(handlers.onCreated);
  const wantsDeleted = Boolean(handlers.onDeleted);
  const wantsUpdated = Boolean(handlers.onUpdated);

  useEffect(() => {
    if (!projectId) {
      return;
    }
    if (!wantsReordered && !wantsCreated && !wantsDeleted && !wantsUpdated) {
      return;
    }

    const clientId = getClientId();
    const unsubscribeTopic = subscribeToProject(projectId);
    const cleanups: Array<() => void> = [];

    if (wantsReordered) {
      const remove = addRealtimeListener("tasks.reordered", (event) => {
        if (event.project_id !== projectId) {
          return;
        }
        if (event.origin && event.origin === clientId) {
          return;
        }
        handlersRef.current.onReordered?.(event);
      });
      cleanups.push(remove);
    }

    if (wantsCreated) {
      const remove = addRealtimeListener("tasks.created", (event) => {
        if (event.project_id !== projectId) {
          return;
        }
        if (event.origin && event.origin === clientId) {
          return;
        }
        handlersRef.current.onCreated?.(event);
      });
      cleanups.push(remove);
    }

    if (wantsDeleted) {
      const remove = addRealtimeListener("tasks.deleted", (event) => {
        if (event.project_id !== projectId) {
          return;
        }
        if (event.origin && event.origin === clientId) {
          return;
        }
        handlersRef.current.onDeleted?.(event);
      });
      cleanups.push(remove);
    }

    if (wantsUpdated) {
      const remove = addRealtimeListener("tasks.updated", (event) => {
        if (event.project_id !== projectId) {
          return;
        }
        if (event.origin && event.origin === clientId) {
          return;
        }
        handlersRef.current.onUpdated?.(event);
      });
      cleanups.push(remove);
    }

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      unsubscribeTopic();
    };
  }, [projectId, wantsReordered, wantsCreated, wantsDeleted, wantsUpdated]);
}
