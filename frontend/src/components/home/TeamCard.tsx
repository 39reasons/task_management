import { useCallback } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import type { Team } from "@shared/types";
import { Button } from "../ui/button";
import type { TeamCardMetrics } from "../../hooks/useHomeTeamMetrics";

interface TeamCardProps {
  team: Team;
  metrics: Omit<TeamCardMetrics, "team">;
  onOpenTeam: (team: Team) => void;
  onLeaveTeam?: (team: Team) => void;
  canLeave?: boolean;
  isLeaving?: boolean;
}

function formatRole(role: Team["role"] | null | undefined): string {
  if (!role) return "Member";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatUpdatedAt(timestamp?: string | null): string {
  if (!timestamp) return "recently";
  const formatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });
  return formatter.format(new Date(timestamp));
}

export function TeamCard({
  team,
  metrics,
  onOpenTeam,
  onLeaveTeam,
  canLeave = false,
  isLeaving = false,
}: TeamCardProps) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onOpenTeam(team);
      }
    },
    [onOpenTeam, team]
  );

  const handleLeaveClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onLeaveTeam?.(team);
    },
    [onLeaveTeam, team]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open team ${team.name}`}
      onClick={() => onOpenTeam(team)}
      onKeyDown={handleKeyDown}
      className="flex flex-col rounded-2xl border border-border bg-card/60 p-6 outline-none transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{formatRole(team.role)}</p>
          <h3 className="mt-2 text-lg font-semibold text-foreground">{team.name}</h3>
          {team.description ? <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{team.description}</p> : null}
        </div>
      </div>

      <div className="mt-6 grid gap-3 rounded-xl border border-dashed border-border bg-muted/60 p-4 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Projects</span>
          <span className="text-sm font-semibold text-foreground">{metrics.projectCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Visibility</span>
          <span className="text-sm font-semibold text-foreground">
            {metrics.publicProjects} public · {metrics.privateProjects} private
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Members</span>
          <span className="text-sm font-semibold text-foreground">{metrics.memberCount}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {canLeave ? (
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-destructive hover:text-destructive focus:text-destructive"
            disabled={isLeaving}
            onClick={handleLeaveClick}
          >
            Leave team
          </Button>
        ) : null}
        <span className="text-xs text-muted-foreground">Updated {formatUpdatedAt(team.updated_at)}</span>
      </div>
    </div>
  );
}
