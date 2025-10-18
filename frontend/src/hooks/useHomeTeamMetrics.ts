import { useMemo } from "react";
import type { Team } from "@shared/types";

interface HomeTotals {
  totalTeams: number;
  totalProjects: number;
  publicProjects: number;
  privateProjects: number;
  totalMembers: number;
}

export interface TeamCardMetrics {
  team: Team;
  projectCount: number;
  publicProjects: number;
  privateProjects: number;
  memberCount: number;
}

interface UseHomeTeamMetricsResult {
  totals: HomeTotals;
  teamCards: TeamCardMetrics[];
}

export function useHomeTeamMetrics(teams: Team[] = []): UseHomeTeamMetricsResult {
  return useMemo(() => {
    const aggregates = {
      totalTeams: teams.length,
      totalProjects: 0,
      publicProjects: 0,
      privateProjects: 0,
      memberIds: new Set<string>(),
      projectIds: new Set<string>(),
    };

    const cards = teams.map((team) => {
      const project = team.project ?? null;
      const members = team.members ?? [];
      const projectCount = project ? 1 : 0;
      const publicProjects = project && project.is_public ? 1 : 0;
      const privateProjects = projectCount - publicProjects;

      const teamMemberIds = new Set<string>();
      for (const member of members) {
        const memberId = member?.user?.id;
        if (memberId) {
          teamMemberIds.add(memberId);
          aggregates.memberIds.add(memberId);
        }
      }

      if (project && !aggregates.projectIds.has(project.id)) {
        aggregates.projectIds.add(project.id);
        aggregates.totalProjects += 1;
        if (project.is_public) {
          aggregates.publicProjects += 1;
        } else {
          aggregates.privateProjects += 1;
        }
      }

      return {
        team,
        projectCount,
        publicProjects,
        privateProjects,
        memberCount: teamMemberIds.size,
      };
    });

    return {
      totals: {
        totalTeams: aggregates.totalTeams,
        totalProjects: aggregates.totalProjects,
        publicProjects: aggregates.publicProjects,
        privateProjects: aggregates.privateProjects,
        totalMembers: aggregates.memberIds.size,
      },
      teamCards: cards,
    };
  }, [teams]);
}
