import { Dot } from "lucide-react";
import { DEFAULT_AVATAR_COLOR } from "../../constants/colors";
import { getFullName, getInitials } from "../../utils/user";
import { Alert, AlertDescription, Badge } from "../ui";
import { timeAgo } from "./utils";
import type { TaskHistoryEntry } from "./types";

interface TaskHistoryPanelProps {
  events: TaskHistoryEntry[];
  loading: boolean;
  error: string | null;
}

export function TaskHistoryPanel({ events, loading, error }: TaskHistoryPanelProps) {
  if (loading) {
    return <HistorySkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No history recorded yet.</p>;
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <HistoryItem key={event.id} event={event} />
      ))}
    </div>
  );
}

function HistoryItem({ event }: { event: TaskHistoryEntry }) {
  const actor = event.actor ?? null;
  const actorName = (() => {
    if (!actor) {
      return event.actorId ? `User ${event.actorId.slice(0, 6)}` : "System";
    }
    const fullName = getFullName(actor).trim();
    if (fullName) {
      return fullName;
    }
    if (actor.username) {
      return `@${actor.username}`;
    }
    return "Unknown";
  })();

  const actorUsername = actor?.username ? `@${actor.username}` : null;
  const avatarColor = actor?.avatar_color ?? DEFAULT_AVATAR_COLOR;
  const initials = actor ? getInitials(actor) : "●";
  const timestamp = Date.parse(event.createdAt);
  const relativeTime = Number.isNaN(timestamp) ? "" : timeAgo(timestamp);
  const absoluteTime = Number.isNaN(timestamp) ? undefined : new Date(timestamp).toLocaleString();

  const eventLabel = event.eventType.replace(/_/g, " ");

  return (
    <div className="flex gap-3 rounded-lg border border-border/70 bg-[hsl(var(--card))] p-3 shadow-sm">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold uppercase text-primary"
        style={{ backgroundColor: avatarColor ?? DEFAULT_AVATAR_COLOR }}
      >
        {initials}
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{actorName}</span>
          {actorUsername ? <span className="text-muted-foreground/80">{actorUsername}</span> : null}
          {relativeTime ? (
            <>
              <Dot size={14} className="text-muted-foreground/50" />
              <span title={absoluteTime}>{relativeTime}</span>
            </>
          ) : null}
          <Badge variant="outline" className="ml-auto text-[10px] uppercase tracking-wide">
            {eventLabel}
          </Badge>
        </div>
        <p className="text-sm text-foreground">{event.message}</p>
        {event.details ? (
          <p className="text-xs text-muted-foreground">{event.details}</p>
        ) : null}
      </div>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="flex gap-3 rounded-lg border border-dashed border-border/60 bg-muted/30 p-3 animate-pulse"
        >
          <div className="h-10 w-10 rounded-full bg-muted-foreground/20" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/4 rounded bg-muted-foreground/20" />
            <div className="h-4 w-2/3 rounded bg-muted-foreground/20" />
            <div className="h-3 w-1/3 rounded bg-muted-foreground/20" />
          </div>
        </div>
      ))}
    </div>
  );
}
