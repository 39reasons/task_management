import { useQuery, useMutation } from "@apollo/client";
import {
  GET_NOTIFICATIONS,
  RESPOND_NOTIFICATION,
  MARK_NOTIFICATION_READ,
  GET_PROJECTS,
  DELETE_NOTIFICATION,
} from "../graphql";
import type { Notification } from "@shared/types";

export function useNotifications(enabled: boolean = true) {
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
