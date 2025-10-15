import { useCallback, useState } from "react";
import { useMutation } from "@apollo/client";

import { GET_NOTIFICATIONS, SEND_PROJECT_INVITE } from "../graphql";
import type { InviteeSuggestion } from "../types/invitations";

interface UseInviteUsersResult {
  inviteUsers: (projectId: string, users: InviteeSuggestion[]) => Promise<boolean>;
  loading: boolean;
  error: string | null;
  success: string | null;
  clearStatus: () => void;
}

export function useInviteUsers(): UseInviteUsersResult {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [sendInvite, { loading }] = useMutation(SEND_PROJECT_INVITE, {
    refetchQueries: [{ query: GET_NOTIFICATIONS }],
  });

  const clearStatus = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  const inviteUsers = useCallback(
    async (projectId: string, users: InviteeSuggestion[]) => {
      setError(null);
      setSuccess(null);

      if (users.length === 0) {
        setError("Select at least one user to invite.");
        return false;
      }

      try {
        await Promise.all(
          users.map((user) =>
            sendInvite({
              variables: {
                project_id: projectId,
                username: user.username,
              },
            })
          )
        );

        setSuccess(`Invited ${users.length} user${users.length > 1 ? "s" : ""}.`);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to send invite";
        setError(message);
        return false;
      }
    },
    [sendInvite]
  );

  return {
    inviteUsers,
    loading,
    error,
    success,
    clearStatus,
  };
}
