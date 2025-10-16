import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client";
import type { AuthUser, Team as TeamType } from "@shared/types";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Separator,
  Textarea,
} from "../components/ui";
import { GET_TEAM, UPDATE_TEAM } from "../graphql";
import { useTeamContext } from "../providers/TeamProvider";
import { useTeamMembershipActions } from "../hooks/useTeamMembershipActions";
import { DEFAULT_AVATAR_COLOR } from "../constants/colors";
import { getFullName, getInitials } from "../utils/user";

interface TeamSettingsPageProps {
  user: AuthUser | null;
}

type TeamQueryResult = {
  team: TeamType | null;
};

export function TeamSettingsPage({ user }: TeamSettingsPageProps) {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { refetchTeams } = useTeamContext();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data, loading, error, refetch } = useQuery<TeamQueryResult>(GET_TEAM, {
    variables: teamId ? { id: teamId } : undefined,
    skip: !teamId,
    fetchPolicy: "network-only",
  });

  const [updateTeam] = useMutation(UPDATE_TEAM);

  useEffect(() => {
    if (data?.team) {
      setName(data.team.name ?? "");
      setDescription(data.team.description ?? "");
    }
  }, [data?.team]);

  const team = data?.team ?? null;

  const canManageTeam = useMemo(() => {
    return Boolean(user && team?.role === "owner");
  }, [team?.role, user]);

  const {
    handleRemoveMember,
    removingMemberId,
    teamActionError,
  } = useTeamMembershipActions({
    teamId,
    team,
    refetchTeam: () => refetch(),
    refetchTeams,
  });

  const hasChanges = useMemo(() => {
    const originalName = team?.name ?? "";
    const originalDescription = team?.description ?? "";
    return name !== originalName || description !== originalDescription;
  }, [description, name, team?.description, team?.name]);

  if (!teamId) {
    return <div className="p-6 text-destructive">Team identifier is missing.</div>;
  }

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading team settings…</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-6">
        <AlertTitle>Unable to load team</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!team) {
    return <div className="p-6 text-destructive">We couldn&apos;t find that team.</div>;
  }

  if (!canManageTeam) {
    return (
      <div className="space-y-4 p-6">
        <Alert>
          <AlertTitle>Insufficient permissions</AlertTitle>
          <AlertDescription>You must be the team owner to edit these settings.</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => navigate(`/teams/${team.id}`)}>
          Go back to team
        </Button>
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Team name is required.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await updateTeam({
        variables: {
          id: team.id,
          name: trimmedName,
          description: description.trim() || null,
        },
      });
      await Promise.all([refetch(), refetchTeams()]);
      setSuccessMessage("Team settings updated.");
    } catch (mutationError) {
      setErrorMessage((mutationError as Error).message ?? "Unable to update team.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Team settings</h1>
          <p className="text-sm text-muted-foreground">
            Update the team name and description. Changes are visible to all members.
          </p>
        </div>
        <Button variant="ghost" onClick={() => navigate(`/teams/${team.id}`)}>
          Cancel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="team-settings-name">Team name</Label>
              <Input
                id="team-settings-name"
                value={name}
                onChange={(event) => setName(event.target.value.slice(0, 120))}
                placeholder="Team name"
                required
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="team-settings-description">Description</Label>
              <Textarea
                id="team-settings-description"
                value={description}
                onChange={(event) => setDescription(event.target.value.slice(0, 600))}
                placeholder="Describe how this team collaborates."
                disabled={submitting}
                className="min-h-[140px]"
              />
            </div>

            {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
            {successMessage ? <p className="text-sm text-emerald-600">{successMessage}</p> : null}

            <Separator />

            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setName(team.name ?? "");
                  setDescription(team.description ?? "");
                  setSuccessMessage(null);
                  setErrorMessage(null);
                }}
                disabled={submitting || !hasChanges}
              >
                Reset
              </Button>
              <Button type="submit" disabled={submitting || !hasChanges}>
                {submitting ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Owners can remove teammates who no longer need access to this team.
          </p>

          {teamActionError ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to update membership</AlertTitle>
              <AlertDescription>{teamActionError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-3">
            {(team.members ?? []).length > 0 ? (
              (team.members ?? []).map((member) => {
                if (!member?.user) return null;
                const memberUser = member.user;
                const fullName = getFullName(memberUser);
                const displayName = fullName || `@${memberUser.username}`;
                const isViewer = memberUser.id === user?.id;
                const statusLabel =
                  member.status === "active"
                    ? "Active"
                    : member.status === "invited"
                    ? "Invited"
                    : "Removed";

                return (
                  <div
                    key={`${member.team_id}-${memberUser.id}`}
                    className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/40 px-3 py-3"
                  >
                    <Avatar className="h-10 w-10 border border-border/60">
                      <AvatarFallback
                        className="text-sm font-semibold uppercase text-primary"
                        style={{ backgroundColor: memberUser.avatar_color ?? DEFAULT_AVATAR_COLOR }}
                      >
                        {getInitials(memberUser)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{displayName}</p>
                      <p className="text-xs text-muted-foreground">@{memberUser.username}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <Badge variant="outline" className="text-[11px] uppercase tracking-wide">
                        {member.role}
                      </Badge>
                      <Badge
                        variant={member.status === "active" ? "secondary" : "outline"}
                        className="text-[10px] uppercase tracking-wide"
                      >
                        {statusLabel}
                      </Badge>
                      {isViewer ? (
                        <span className="text-xs text-muted-foreground">You</span>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => void handleRemoveMember(memberUser.id, displayName)}
                          disabled={removingMemberId === memberUser.id}
                        >
                          {removingMemberId === memberUser.id ? "Removing…" : "Remove"}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                No members found for this team.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
