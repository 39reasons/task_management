import { useEffect, useRef } from "react";
import { addRealtimeListener, subscribeToUser } from "../realtime/connection";
import type { NotificationCreatedEvent } from "../realtime/types";

export function useNotificationRealtime(
  userId: string | null,
  onNotificationCreated?: (event: NotificationCreatedEvent) => void
): void {
  const handlerRef = useRef(onNotificationCreated);

  useEffect(() => {
    handlerRef.current = onNotificationCreated;
  }, [onNotificationCreated]);

  useEffect(() => {
    if (!userId || !onNotificationCreated) {
      return;
    }

    const unsubscribeTopic = subscribeToUser(userId);
    const removeListener = addRealtimeListener("notifications.created", (event) => {
      if (event.recipient_id !== userId) {
        return;
      }
      handlerRef.current?.(event);
    });

    return () => {
      removeListener();
      unsubscribeTopic();
    };
  }, [userId, onNotificationCreated]);
}
