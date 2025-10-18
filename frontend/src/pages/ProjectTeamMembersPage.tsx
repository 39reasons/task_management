import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client";
import type { Team } from "@shared/types";
import { GET_PROJECT, REMOVE_TEAM_MEMBER } from "../graphql";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Avatar,
  AvatarFallback,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui";
import { DEFAULT_AVATAR_COLOR } from "../constants/colors";
import { getFullName, getInitials } from "../utils/user";

interface ProjectWithTeamResult {
  project: {
    id: string;
    name: string;
    teams?: Team[];
  } | null;
}

export function ProjectTeamMembersPage() {
  const { id: projectId, teamId } = useParams<{ id: string; teamId: string }>();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useQuery<ProjectWithTeamResult>(GET_PROJECT, {
    variables: { id: projectId ?? "" },
    skip: !projectId,
    fetchPolicy: "network-only",
  });
  const [removeTeamMemberMutation] = useMutation(REMOVE_TEAM_MEMBER);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());

  const toggleMemberSelection = (memberId: string, checked: boolean) => {
    setSelectedMemberIds((prev: Set<string>) => {
      const next = new Set(prev);
      if (checked) {
        next.add(memberId);
      } else {
        next.delete(memberId);
      }
      return next;
    });
  };

  const removeSelectedMembers = async () => {
    if (!teamId || selectedMemberIds.size === 0) return;
    try {
      await Promise.all(Array.from(selectedMemberIds).map((memberId) =>
        removeTeamMemberMutation({ variables: { team_id: teamId, user_id: memberId } })
      ));
      setSelectedMemberIds(new Set());
      await refetch();
    } catch (error) {
      console.error('Unable to remove team members', error);
    }
  };

  const project = data?.project ?? null;
  const team = useMemo(() => project?.teams?.find((entry) => entry.id === teamId) ?? null, [project?.teams, teamId]);

  if (!projectId || !teamId) {
    return <div className="p-6 text-destructive">Team context is missing.</div>;
  }

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading team members…</div>;
  }

  if (error) {
    return <div className="p-6 text-destructive">Unable to load team: {error.message}</div>;
  }

  if (!project || !team) {
    return <div className="p-6 text-destructive">We couldn't find that team.</div>;
  }

  const members = team.members ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{team.name}</h1>
          <p className="text-sm text-muted-foreground">
            Collaborators assigned to this team.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(`/projects/${projectId}/teams`)}>
            Back to teams
          </Button>
        </div>
      </div>

      {members.length === 0 ? (
        <Alert>
          <AlertTitle>No members yet</AlertTitle>
          <AlertDescription>Invite teammates to this team from the project overview.</AlertDescription>
        </Alert>
      ) : (
        <div className="rounded-none border border-border/60 bg-[#1f1f24] shadow-lg shadow-black/40">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[48px]">
                  <span className="sr-only">Select member</span>
                </TableHead>
                <TableHead className="w-[40%]">Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-[140px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const user = member.user;
                if (!user) return null;
                const nameEntry = { first_name: user.first_name ?? "", last_name: user.last_name ?? "" };
                const name = getFullName(nameEntry) || user.username;
                const initials = getInitials(nameEntry) || user.username.charAt(0).toUpperCase();
                const avatarColor = user.avatar_color ?? DEFAULT_AVATAR_COLOR;
                return (
                  <TableRow key={user.id} className="transition hover:bg-blue-500/5">
                    <TableCell>
                      <Checkbox
                        className="border border-white/70 bg-transparent text-white focus-visible:ring-white/70 data-[state=checked]:border-white data-[state=checked]:bg-white/20 data-[state=checked]:text-white"
                        aria-label={`Select ${name}`}
                        checked={selectedMemberIds.has(user.id)}
                        onCheckedChange={(checked) => toggleMemberSelection(user.id, Boolean(checked))}
                      />
                    </TableCell>
                    <TableCell className="w-[40%]">
                      <div className="flex items-center gap-3 text-sm font-medium text-foreground">
                        <Avatar className="h-9 w-9 border border-border/60 shadow-inner">
                          <AvatarFallback
                            className="text-xs font-semibold uppercase text-primary-foreground"
                            style={{ backgroundColor: avatarColor }}
                          >
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-foreground">{name}</span>
                          <span className="text-xs text-muted-foreground">@{user.username}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm capitalize text-muted-foreground">
                      {member.role}
                    </TableCell>
                    <TableCell className="w-[140px] text-sm capitalize text-muted-foreground">
                      {member.status}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default ProjectTeamMembersPage;
