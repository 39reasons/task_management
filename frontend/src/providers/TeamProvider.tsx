import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQuery } from "@apollo/client";
import type { AuthUser, Team } from "@shared/types";
import { GET_TEAMS } from "../graphql";

interface TeamContextValue {
  teams: Team[];
  activeTeamId: string | null;
  activeTeam: Team | null;
  loadingTeams: boolean;
  setActiveTeamId: (teamId: string) => void;
  refetchTeams: () => Promise<void>;
}

const TeamContext = createContext<TeamContextValue | undefined>(undefined);

interface TeamProviderProps {
  user: AuthUser | null;
  children: React.ReactNode;
}

type TeamsQueryResult = {
  teams: Team[];
};

export function TeamProvider({ user, children }: TeamProviderProps) {
  const storageKey = user ? `taskmgr:active-team:${user.id}` : null;
  const [activeTeamId, setActiveTeamIdState] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery<TeamsQueryResult>(GET_TEAMS, {
    skip: !user,
    fetchPolicy: "network-only",
    nextFetchPolicy: "cache-first",
  });

  const teams = data?.teams ?? [];

  const setActiveTeamInternal = useCallback(
    (teamId: string | null) => {
      setActiveTeamIdState(teamId);
      if (storageKey) {
        if (teamId) {
          window.localStorage.setItem(storageKey, teamId);
        } else {
          window.localStorage.removeItem(storageKey);
        }
      }
    },
    [storageKey]
  );

  useEffect(() => {
    if (!user) {
      setActiveTeamInternal(null);
      return;
    }

    if (teams.length === 0) {
      setActiveTeamInternal(null);
      return;
    }

    if (activeTeamId && teams.some((team) => team.id === activeTeamId)) {
      return;
    }

    const storedId = storageKey ? window.localStorage.getItem(storageKey) : null;
    const initialId = storedId && teams.some((team) => team.id === storedId) ? storedId : teams[0].id;
    setActiveTeamInternal(initialId);
  }, [user, teams, activeTeamId, setActiveTeamInternal, storageKey]);

  useEffect(() => {
    if (!user) {
      setActiveTeamInternal(null);
    }
  }, [user, setActiveTeamInternal]);

  const value = useMemo<TeamContextValue>(() => {
    const activeTeam = teams.find((team) => team.id === activeTeamId) ?? null;
    return {
      teams,
      activeTeamId,
      activeTeam,
      loadingTeams: loading,
      setActiveTeamId: (teamId: string) => setActiveTeamInternal(teamId),
      refetchTeams: async () => {
        if (!user) return;
        await refetch();
      },
    };
  }, [teams, activeTeamId, loading, setActiveTeamInternal, refetch, user]);

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeamContext(): TeamContextValue {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error("useTeamContext must be used within a TeamProvider");
  }
  return context;
}
