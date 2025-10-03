import { useEffect } from "react";
import { useNotifications } from "../hooks/useNotifications";
import { useModal } from "./ModalStack";
import type { Notification } from "@shared/types";

export function NotificationInbox() {
  const { modals, closeModal } = useModal();
  const isOpen = modals.includes("notifications");
  const { notifications, loading, respond, markRead, remove } = useNotifications(true);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal('notifications');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, closeModal]);

  useEffect(() => {
    if (!isOpen) return;
    const unread = notifications.filter((notif) => !notif.is_read);
    if (unread.length === 0) return;
    Promise.all(unread.map((n) => markRead(n.id, true))).catch(() => {});
  }, [isOpen, notifications, markRead]);

  if (!isOpen) return null;

  const pendingNotifications = notifications.filter((n) => n.status === "pending");

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      <div className="absolute inset-0 bg-black/50" onClick={() => closeModal("notifications")} />
      <div className="relative bg-gray-800 rounded-xl shadow-lg w-full max-w-md max-h-[70vh] overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Notifications</h3>
          <button
            onClick={() => closeModal("notifications")}
            className="text-gray-400 hover:text-gray-200"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-gray-400">No notifications.</p>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRespond={respond}
                onDelete={remove}
              />
            ))
          )}
        </div>
        {pendingNotifications.length > 0 && (
          <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-700">
            Pending invites: {pendingNotifications.length}
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationItem({
  notification,
  onRespond,
  onDelete,
}: {
  notification: Notification;
  onRespond: (id: string, accept: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const isPending = notification.status === "pending";

  return (
    <div className="border border-gray-700 rounded-lg p-3 bg-gray-900 flex flex-col gap-2">
      <div className="flex justify-between text-xs text-gray-400 items-center gap-2">
        <span>{formatTimestamp(notification.created_at)}</span>
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${isPending ? "text-yellow-400" : notification.status === "accepted" ? "text-green-400" : "text-red-400"}`}>
            {notification.status.toUpperCase()}
          </span>
          <button
            onClick={() => onDelete(notification.id)}
            className="text-gray-400 hover:text-red-400 text-sm"
            aria-label="Delete notification"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="text-sm text-white whitespace-pre-wrap">{notification.message}</div>
      <div className="text-xs text-gray-300">
        {notification.sender && (
          <div>
            From <span className="font-semibold">{notification.sender.name}</span> (@{notification.sender.username})
          </div>
        )}
        {notification.project && (
          <div>
            Project: <span className="font-semibold">{notification.project.name}</span>
          </div>
        )}
      </div>
      {isPending && (
        <div className="flex gap-2">
          <button
            onClick={() => onRespond(notification.id, true)}
            className="flex-1 px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm"
          >
            Accept
          </button>
          <button
            onClick={() => onRespond(notification.id, false)}
            className="flex-1 px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm"
          >
            Decline
          </button>
        </div>
      )}
    </div>
  );
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date.toLocaleString();
  const fallback = new Date(Number(value));
  return Number.isNaN(fallback.getTime()) ? value : fallback.toLocaleString();
}
