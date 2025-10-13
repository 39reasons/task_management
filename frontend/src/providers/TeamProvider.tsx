import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@apollo/client";
import type { AuthUser, Team } from "@shared/types";
import { GET_TEAMS } from "../graphql";

interface TeamContextValue {
  teams: Team[];
  loadingTeams: boolean;
  refetchTeams: () => Promise<Team[]>;
  getTeamById: (teamId: string | null | undefined) => Team | null;
}

const TeamContext = createContext<TeamContextValue | undefined>(undefined);

interface TeamProviderProps {
  user: AuthUser | null;
  children: ReactNode;
}

type TeamsQueryResult = {
  teams: Team[];
};

export function TeamProvider({ user, children }: TeamProviderProps) {
  const { data, loading, refetch } = useQuery<TeamsQueryResult>(GET_TEAMS, {
    skip: !user,
    fetchPolicy: "network-only",
    nextFetchPolicy: "cache-first",
  });

  const value = useMemo<TeamContextValue>(() => {
    const normalizedTeams = data?.teams ?? [];
    return {
      teams: normalizedTeams,
      loadingTeams: loading,
      refetchTeams: async () => {
        if (!user) {
          return [];
        }
        try {
          const result = await refetch();
          return result.data?.teams ?? [];
        } catch {
          return [];
        }
      },
      getTeamById: (teamId: string | null | undefined) => {
        if (!teamId) {
          return null;
        }
        return normalizedTeams.find((team) => team.id === teamId) ?? null;
      },
    };
  }, [data?.teams, loading, refetch, user]);

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeamContext(): TeamContextValue {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error("useTeamContext must be used within a TeamProvider");
  }
  return context;
}
