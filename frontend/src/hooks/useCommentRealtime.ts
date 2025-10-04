import { useEffect, useRef } from "react";
import { addRealtimeListener, subscribeToProject } from "../realtime/connection";
import type {
  CommentCreatedEvent,
  CommentDeletedEvent,
  CommentUpdatedEvent,
} from "../realtime/types";
import { getClientId } from "../utils/clientId";

export type CommentRealtimeHandlers = {
  onCreated?: (event: CommentCreatedEvent) => void;
  onUpdated?: (event: CommentUpdatedEvent) => void;
  onDeleted?: (event: CommentDeletedEvent) => void;
};

export function useCommentRealtime(
  projectId: string | null,
  handlers: CommentRealtimeHandlers
): void {
  const handlersRef = useRef<CommentRealtimeHandlers>(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const wantsCreated = Boolean(handlers.onCreated);
  const wantsUpdated = Boolean(handlers.onUpdated);
  const wantsDeleted = Boolean(handlers.onDeleted);

  useEffect(() => {
    if (!projectId) {
      return;
    }
    if (!wantsCreated && !wantsUpdated && !wantsDeleted) {
      return;
    }

    const clientId = getClientId();
    const unsubscribeTopic = subscribeToProject(projectId);
    const cleanups: Array<() => void> = [];

    if (wantsCreated) {
      const remove = addRealtimeListener("comments.created", (event) => {
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

    if (wantsUpdated) {
      const remove = addRealtimeListener("comments.updated", (event) => {
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

    if (wantsDeleted) {
      const remove = addRealtimeListener("comments.deleted", (event) => {
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

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      unsubscribeTopic();
    };
  }, [projectId, wantsCreated, wantsUpdated, wantsDeleted]);
}
