import { useApolloClient, useMutation, useQuery } from "@apollo/client";
import {
  GET_NOTIFICATIONS,
  RESPOND_NOTIFICATION,
  MARK_NOTIFICATION_READ,
  GET_PROJECTS,
  DELETE_NOTIFICATION,
} from "../graphql";
import type { Notification } from "@shared/types";
import { useNotificationRealtime } from "./useNotificationRealtime";

export function useNotifications(enabled: boolean = true, userId: string | null = null) {
  const client = useApolloClient();
  const { data, loading, error, refetch } = useQuery<{ notifications: Notification[] }>(
    GET_NOTIFICATIONS,
    {
      fetchPolicy: "cache-and-network",
      skip: !enabled,
    }
  );

  const [respondMutation] = useMutation(RESPOND_NOTIFICATION);
  const [markReadMutation] = useMutation(MARK_NOTIFICATION_READ);
  const [deleteNotificationMutation] = useMutation(DELETE_NOTIFICATION);

  useNotificationRealtime(enabled ? userId : null, (event) => {
    client.cache.updateQuery<{ notifications: Notification[] }>(
      { query: GET_NOTIFICATIONS },
      (existing) => {
        const notification = event.notification;
        if (!existing) {
          return {
            notifications: [notification],
          };
        }

        const alreadyExists = existing.notifications.some((item) => item.id === notification.id);
        if (alreadyExists) {
          return existing;
        }

        return {
          ...existing,
          notifications: [notification, ...existing.notifications],
        };
      }
    );
  });

  const respond = async (id: string, accept: boolean) => {
    await respondMutation({
      variables: { id, accept },
      refetchQueries: [{ query: GET_NOTIFICATIONS }, { query: GET_PROJECTS }],
    });
  };

  const markRead = async (id: string, read = true) => {
    await markReadMutation({
      variables: { id, read },
      refetchQueries: [{ query: GET_NOTIFICATIONS }],
    });
  };

  const remove = async (id: string) => {
    await deleteNotificationMutation({
      variables: { id },
      refetchQueries: [{ query: GET_NOTIFICATIONS }],
    });
  };

  return {
    notifications: data?.notifications ?? [],
    loading,
    error,
    refetch,
    respond,
    markRead,
    remove,
  };
}
