import { useCallback, useState } from "react";
import { useMutation } from "@apollo/client";
import type { Team } from "@shared/types";
import { LEAVE_TEAM } from "../graphql";

interface UseLeaveTeamResult {
  leaveTeam: (team: Pick<Team, "id" | "name">) => Promise<boolean>;
  isLeaving: (teamId?: string | null) => boolean;
  error: string | null;
}

export function useLeaveTeam(refetchTeams: () => Promise<unknown>): UseLeaveTeamResult {
  const [leaveTeamMutation] = useMutation(LEAVE_TEAM);
  const [leavingTeamId, setLeavingTeamId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const leaveTeam = useCallback(
    async (team: Pick<Team, "id" | "name">) => {
      if (!team?.id) {
        return false;
      }

      setError(null);
      setLeavingTeamId(team.id);
      try {
        await leaveTeamMutation({ variables: { team_id: team.id } });
        await refetchTeams();
        return true;
      } catch (err) {
        setError((err as Error).message ?? "Unable to leave team.");
        return false;
      } finally {
        setLeavingTeamId(null);
      }
    },
    [leaveTeamMutation, refetchTeams]
  );

  const isLeaving = useCallback((teamId?: string | null) => leavingTeamId === teamId, [leavingTeamId]);

  return { leaveTeam, isLeaving, error };
}
