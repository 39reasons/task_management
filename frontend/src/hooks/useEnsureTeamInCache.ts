import { useEffect, useRef } from "react";
import type { Team as TeamType } from "@shared/types";

interface UseEnsureTeamInCacheOptions {
  teamId?: string | null;
  teams: TeamType[];
  loadingTeams: boolean;
  refetchTeams: () => Promise<unknown>;
}

export function useEnsureTeamInCache({
  teamId,
  teams,
  loadingTeams,
  refetchTeams,
}: UseEnsureTeamInCacheOptions) {
  const hasRequestedRefetch = useRef(false);

  useEffect(() => {
    if (!teamId || loadingTeams || hasRequestedRefetch.current) {
      return;
    }

    const isTeamInCache = teams.some((team) => team.id === teamId);

    if (!isTeamInCache) {
      hasRequestedRefetch.current = true;
      void refetchTeams().catch(() => {
        // Swallow the error; loading state will surface issues to the UI.
      });
    }
  }, [teamId, teams, loadingTeams, refetchTeams]);
}
