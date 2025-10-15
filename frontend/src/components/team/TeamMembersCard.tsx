import type { Team as TeamType } from "@shared/types";
import { DEFAULT_AVATAR_COLOR } from "../../constants/colors";
import { getFullName, getInitials } from "../../utils/user";
import { Avatar, AvatarFallback, Badge, Button, Card, CardContent, CardHeader, CardTitle } from "../ui";

interface TeamMembersCardProps {
  members: TeamType["members"] | null | undefined;
  viewerId: string | null;
  canManageTeam: boolean;
  leavingTeam: boolean;
  removingMemberId: string | null;
  onLeaveTeam: () => Promise<void>;
  onRemoveMember: (memberUserId: string, memberName: string) => Promise<void>;
}

export function TeamMembersCard({
  members,
  viewerId,
  canManageTeam,
  leavingTeam,
  removingMemberId,
  onLeaveTeam,
  onRemoveMember,
}: TeamMembersCardProps) {
  const memberList = members ?? [];
  const hasMembers = memberList.length > 0;

  return (
    <Card className="border-border/80" id="team-members">
      <CardHeader>
        <CardTitle>Members</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasMembers ? (
          memberList.map((member) => {
            const memberUser = member.user;
            const memberName = getFullName(memberUser);
            const statusLabel =
              member.status === "active" ? "Active" : member.status === "invited" ? "Invited" : "Removed";
            const isCurrentViewer = memberUser.id === viewerId;

            return (
              <div
                key={`${member.team_id}-${memberUser.id}`}
                className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/40 px-3 py-3"
              >
                <Avatar className="h-10 w-10 border border-border/70">
                  <AvatarFallback
                    className="text-sm font-semibold text-primary"
                    style={{ backgroundColor: memberUser.avatar_color || DEFAULT_AVATAR_COLOR }}
                  >
                    {getInitials(memberUser)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground">
                    {memberName || memberUser.username}
                  </span>
                  <span className="text-xs text-muted-foreground">@{memberUser.username}</span>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[11px] uppercase tracking-wide">
                      {member.role}
                    </Badge>
                    <Badge
                      variant={member.status === "active" ? "secondary" : "outline"}
                      className="text-[10px] uppercase tracking-wide"
                    >
                      {statusLabel}
                    </Badge>
                  </div>
                  {isCurrentViewer ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-[11px] text-destructive hover:text-destructive focus:text-destructive"
                      onClick={(event) => {
                        event.stopPropagation();
                        void onLeaveTeam();
                      }}
                      disabled={leavingTeam}
                    >
                      {leavingTeam ? "Leaving…" : "Leave"}
                    </Button>
                  ) : canManageTeam ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-[11px]"
                      onClick={(event) => {
                        event.stopPropagation();
                        void onRemoveMember(memberUser.id, memberName || `@${memberUser.username}`);
                      }}
                      disabled={removingMemberId === memberUser.id}
                    >
                      {removingMemberId === memberUser.id ? "Removing…" : "Remove"}
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/70 px-4 py-6 text-sm text-muted-foreground">
            No members found for this team.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TeamMembersCard;
