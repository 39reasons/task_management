import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { GET_PROJECT_MEMBERS, SET_TASK_ASSIGNEE, GET_WORKFLOWS, GET_TASKS } from "../graphql";
import type { Task, User } from "@shared/types";
import { useModal } from "./ModalStack";
import { getFullName, getInitials } from "../utils/user";
import { DEFAULT_AVATAR_COLOR } from "../constants/colors";
import {
  Avatar,
  AvatarFallback,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ScrollArea,
} from "./ui";
import { cn } from "../lib/utils";

interface MemberModalProps {
  task: Task | null;
  onAssign?: (task: Task) => void;
}

type ProjectMember = Pick<User, "id" | "first_name" | "last_name" | "username" | "avatar_color">;

export function MemberModal({ task, onAssign }: MemberModalProps) {
  const { modals, closeModal } = useModal();
  const isOpen = modals.includes("member");

  const project_id = task?.project_id ?? null;

  const { data, loading } = useQuery(GET_PROJECT_MEMBERS, {
    variables: { project_id },
    skip: !isOpen || !project_id,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [setTaskAssignee] = useMutation(SET_TASK_ASSIGNEE);

  useEffect(() => {
    if (isOpen && task) {
      setSelectedId(task.assignee?.id ?? null);
    }
  }, [isOpen, task]);

  if (!isOpen || !task) return null;

  const members = (data?.projectMembers ?? []) as ProjectMember[];

  const refetchQueries = [
    { query: GET_WORKFLOWS, variables: { project_id: task.project_id } },
    { query: GET_TASKS, variables: {} },
    { query: GET_TASKS, variables: { project_id: task.project_id } },
  ];

  const toggleMember = (memberId: string) => {
    setSelectedId((prev) => (prev === memberId ? null : memberId));
  };

  const handleSave = async () => {
    await setTaskAssignee({
      variables: { task_id: task.id, member_id: selectedId },
      refetchQueries,
    });

    const assignedMember = members.find((member) => member.id === selectedId) ?? null;
    onAssign?.({
      ...task,
      assignee_id: selectedId,
      assignee: assignedMember,
    });
    closeModal("member");
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      closeModal("member");
    }
  };

  const clearAll = () => setSelectedId(null);

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-md space-y-4">
        <DialogHeader>
          <DialogTitle>Assign members</DialogTitle>
          <DialogDescription>Select teammates who should be attached to this task.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading members…</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Choose the teammate who should own this task.
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={clearAll} className="text-xs">
                Unassign
              </Button>
            </div>

            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No project members yet.</p>
            ) : (
              <ScrollArea className="max-h-72 rounded-md border border-border">
                <div className="space-y-2 p-2">
                  {members.map((member) => {
                    const isSelected = selectedId === member.id;
                    return (
                      <div
                        key={member.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleMember(member.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            toggleMember(member.id);
                          }
                        }}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 text-left transition hover:border-primary/20 hover:bg-muted/40",
                          isSelected && "border-primary/40 bg-primary/5"
                        )}
                        aria-pressed={isSelected}
                        aria-label={`Toggle ${getFullName(member)}`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border border-border/60">
                            <AvatarFallback
                              className="text-sm font-semibold text-primary"
                              style={{ backgroundColor: member.avatar_color || DEFAULT_AVATAR_COLOR }}
                            >
                              {getInitials(member)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-foreground">
                              {getFullName(member)}
                            </span>
                            <span className="text-xs text-muted-foreground">@{member.username}</span>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">
                          {isSelected ? "Selected" : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={() => closeModal("member")}>
            Close
          </Button>
          <Button type="button" onClick={handleSave} disabled={loading}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
