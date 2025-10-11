import { useEffect } from "react";
import type { AuthUser, Notification } from "@shared/types";
import { useModal } from "./ModalStack";
import { useNotifications } from "../hooks/useNotifications";
import { getFullName } from "../utils/user";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ScrollArea,
} from "./ui";

export function NotificationInbox({ currentUser }: { currentUser: AuthUser | null }) {
  const { modals, closeModal } = useModal();
  const isOpen = modals.includes("notifications");
  const enableNotifications = Boolean(currentUser);

  const { notifications, loading, respond, markRead, remove } = useNotifications(
    enableNotifications,
    currentUser?.id ?? null
  );

  useEffect(() => {
    if (!isOpen) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal("notifications");
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, closeModal]);

  useEffect(() => {
    if (!isOpen) return;
    const unread = notifications.filter((notification) => !notification.is_read);
    if (!unread.length) return;
    void Promise.all(unread.map((notification) => markRead(notification.id, true))).catch(() => {});
  }, [isOpen, notifications, markRead]);

  if (!isOpen) return null;

  const pendingNotifications = notifications.filter((notification) => notification.status === "pending");

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 pt-20 transition-opacity dark:bg-black/80"
      onClick={() => closeModal("notifications")}
      role="presentation"
    >
      <Card
        className="relative flex h-[70vh] w-full max-w-md flex-col border border-border bg-[hsl(var(--modal-background))] text-[hsl(var(--modal-foreground))] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Stay up to date on invites and project activity.</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={() => closeModal("notifications")}>✕</Button>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3 p-0">
          <ScrollArea className="flex-1 px-4 py-3">
            {loading ? (
              <Alert variant="info">
                <AlertTitle>Checking for updates…</AlertTitle>
                <AlertDescription>Fetching the latest notifications for your account.</AlertDescription>
              </Alert>
            ) : notifications.length === 0 ? (
              <Alert>
                <AlertTitle>No notifications</AlertTitle>
                <AlertDescription>You’re all caught up. Invites and project updates will appear here.</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onRespond={respond}
                    onDelete={remove}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
          {pendingNotifications.length > 0 ? (
            <div className="border-t border-border px-4 py-3">
              <Alert variant="warning" className="border-none bg-transparent p-0 text-xs">
                <AlertTitle>Pending invites</AlertTitle>
                <AlertDescription className="text-xs">
                  {pendingNotifications.length} invite{pendingNotifications.length === 1 ? "" : "s"} awaiting
                  your response.
                </AlertDescription>
              </Alert>
            </div>
          ) : null}
        </CardContent>
      </Card>
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
    <Card className="bg-card text-card-foreground">
      <CardContent className="flex flex-col gap-2 py-4 text-sm text-foreground">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatTimestamp(notification.created_at)}</span>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                isPending
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : notification.status === "accepted"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-destructive/40 bg-destructive/10 text-destructive"
              }
            >
              {notification.status.toUpperCase()}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(notification.id)}
              aria-label="Delete notification"
            >
              ✕
            </Button>
          </div>
        </div>
        <div className="text-sm text-foreground whitespace-pre-wrap">
          {notification.message}
        </div>
        <div className="text-xs text-muted-foreground">
          {notification.sender ? (
            <div>
              From <span className="font-semibold text-foreground">{getFullName(notification.sender)}</span> (@
              {notification.sender.username})
            </div>
          ) : null}
          {notification.project ? (
            <div>
              Project: <span className="font-semibold text-foreground">{notification.project.name}</span>
            </div>
          ) : null}
        </div>
        {isPending ? (
          <div className="flex gap-2">
            <Button variant="default" className="flex-1" onClick={() => onRespond(notification.id, true)}>
              Accept
            </Button>
            <Button
              variant="destructive"
              className="flex-1 bg-red-600 hover:bg-red-700"
              onClick={() => onRespond(notification.id, false)}
            >
              Decline
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date.toLocaleString();
  const fallback = new Date(Number(value));
  return Number.isNaN(fallback.getTime()) ? value : fallback.toLocaleString();
}
