import { useCallback, useState } from "react";
import { useMutation } from "@apollo/client";
import type { Team as TeamType } from "@shared/types";
import { LEAVE_TEAM, REMOVE_TEAM_MEMBER } from "../graphql";

interface UseTeamMembershipActionsOptions {
  teamId?: string | null;
  team: TeamType | null | undefined;
  refetchTeam: () => Promise<unknown>;
  refetchTeams: () => Promise<unknown>;
  onLeaveSuccess?: () => void;
}

interface UseTeamMembershipActionsResult {
  handleRemoveMember: (memberUserId: string, memberName: string) => Promise<void>;
  handleLeaveTeam: () => Promise<void>;
  removingMemberId: string | null;
  leavingTeam: boolean;
  teamActionError: string | null;
  resetTeamActionError: () => void;
}

export function useTeamMembershipActions({
  teamId,
  team,
  refetchTeam,
  refetchTeams,
  onLeaveSuccess,
}: UseTeamMembershipActionsOptions): UseTeamMembershipActionsResult {
  const [teamActionError, setTeamActionError] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [leavingTeam, setLeavingTeam] = useState(false);

  const [removeTeamMemberMutation] = useMutation(REMOVE_TEAM_MEMBER);
  const [leaveTeamMutation] = useMutation(LEAVE_TEAM);

  const handleRemoveMember = useCallback(
    async (memberUserId: string, memberName: string) => {
      if (!teamId) return;
      const confirmed = window.confirm(`Remove ${memberName} from this team?`);
      if (!confirmed) return;

      setTeamActionError(null);
      setRemovingMemberId(memberUserId);
      try {
        await removeTeamMemberMutation({
          variables: { team_id: teamId, user_id: memberUserId },
        });
        await Promise.allSettled([refetchTeam(), refetchTeams()]);
      } catch (error) {
        setTeamActionError((error as Error).message ?? "Unable to remove teammate.");
      } finally {
        setRemovingMemberId(null);
      }
    },
    [teamId, refetchTeam, refetchTeams, removeTeamMemberMutation]
  );

  const handleLeaveTeam = useCallback(async () => {
    if (!teamId || !team) return;
    const confirmed = window.confirm(`Leave the team "${team.name}"?`);
    if (!confirmed) return;

    setTeamActionError(null);
    setLeavingTeam(true);
    try {
      await leaveTeamMutation({
        variables: { team_id: teamId },
      });
      await Promise.allSettled([refetchTeams()]);
      onLeaveSuccess?.();
    } catch (error) {
      setTeamActionError((error as Error).message ?? "Unable to leave team.");
    } finally {
      setLeavingTeam(false);
    }
  }, [teamId, team, leaveTeamMutation, refetchTeams, onLeaveSuccess]);

  const resetTeamActionError = useCallback(() => setTeamActionError(null), []);

  return {
    handleRemoveMember,
    handleLeaveTeam,
    removingMemberId,
    leavingTeam,
    teamActionError,
    resetTeamActionError,
  };
}
