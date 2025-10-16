import { useCallback, useMemo, useState } from "react";
import type { Project } from "@shared/types";
import type { DocumentNode } from "graphql";

export const NAME_MAX_LENGTH = 120;
export const DESCRIPTION_MAX_LENGTH = 600;

interface MutationOptions {
  variables: Record<string, unknown>;
  refetchQueries?: Array<{ query: DocumentNode; variables?: Record<string, unknown> }>;
}

interface UseProjectSettingsDialogOptions {
  project: Project | null;
  projectTeamId: string | null;
  overviewRefetchDocument: DocumentNode;
  updateProject: (options: MutationOptions) => Promise<unknown>;
  removeProject: (options: MutationOptions) => Promise<unknown>;
  removeProjectMember: (options: MutationOptions) => Promise<unknown>;
  refetchProject: () => Promise<unknown>;
  onProjectDeleted?: () => void;
}

export function useProjectSettingsDialog({
  project,
  projectTeamId,
  overviewRefetchDocument,
  updateProject,
  removeProject,
  removeProjectMember,
  refetchProject,
  onProjectDeleted,
}: UseProjectSettingsDialogOptions) {
  const [dialogProject, setDialogProject] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleteSectionOpen, setIsDeleteSectionOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [memberActionError, setMemberActionError] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  const isOpen = Boolean(dialogProject);

  const openSettings = useCallback(() => {
    if (!project) return;

    setDialogProject(project);
    setName(project.name ?? "");
    setDescription(project.description ?? "");
    setIsPublic(Boolean(project.is_public));
    setError(null);
    setDeleteError(null);
    setDeleteConfirmation("");
    setIsDeleteSectionOpen(false);
    setMemberActionError(null);
    setRemovingMemberId(null);
  }, [project]);

  const closeSettings = useCallback(() => {
    setDialogProject(null);
    setError(null);
    setDeleteError(null);
    setDeleteConfirmation("");
    setIsDeleteSectionOpen(false);
    setMemberActionError(null);
    setRemovingMemberId(null);
  }, []);

  const hasChanges = useMemo(() => {
    if (!dialogProject) return false;

    const initialName = dialogProject.name ?? "";
    const initialDescription = dialogProject.description ?? "";
    const initialPublic = Boolean(dialogProject.is_public);

    return (
      name !== initialName ||
      description !== initialDescription ||
      isPublic !== initialPublic
    );
  }, [description, dialogProject, isPublic, name]);

  const refetchQueries = useMemo(() => {
    if (!projectTeamId) return [];
    return [{ query: overviewRefetchDocument, variables: { team_id: projectTeamId } }];
  }, [overviewRefetchDocument, projectTeamId]);

  const saveSettings = useCallback(async () => {
    if (!dialogProject) return;
    if (!hasChanges) return;

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Project name is required.");
      return;
    }

    if (trimmedName.length > NAME_MAX_LENGTH) {
      setError(`Project name cannot exceed ${NAME_MAX_LENGTH} characters.`);
      return;
    }

    if (description.trim().length > DESCRIPTION_MAX_LENGTH) {
      setError(`Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await updateProject({
        variables: {
          id: dialogProject.id,
          name: trimmedName,
          description: description.trim() || null,
          is_public: isPublic,
        },
        refetchQueries,
      });

      await refetchProject();
      closeSettings();
    } catch (err) {
      setError((err as Error).message ?? "Unable to update project.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    closeSettings,
    description,
    dialogProject,
    hasChanges,
    isPublic,
    name,
    refetchProject,
    refetchQueries,
    updateProject,
  ]);

  const deleteProject = useCallback(async () => {
    if (!dialogProject) return;

    if (deleteConfirmation.trim().toLowerCase() !== "delete") {
      setDeleteError('Type "delete" to confirm deletion.');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await removeProject({
        variables: { id: dialogProject.id },
        refetchQueries,
      });

      await refetchProject();
      closeSettings();
      onProjectDeleted?.();
    } catch (err) {
      setDeleteError((err as Error).message ?? "Unable to delete project.");
    } finally {
      setIsDeleting(false);
    }
  }, [
    closeSettings,
    deleteConfirmation,
    dialogProject,
    onProjectDeleted,
    refetchProject,
    refetchQueries,
    removeProject,
  ]);

  const removeMember = useCallback(
    async (memberId: string) => {
      const currentProjectId = dialogProject?.id;
      if (!currentProjectId) return;

      setMemberActionError(null);
      setRemovingMemberId(memberId);

      try {
        await removeProjectMember({
          variables: { project_id: currentProjectId, user_id: memberId },
          refetchQueries,
        });

        setDialogProject((previous) => {
          if (!previous || previous.id !== currentProjectId) {
            return previous;
          }

          const remainingMembers = (previous.members ?? []).filter((member) => member?.id !== memberId);
          return { ...previous, members: remainingMembers };
        });

        await refetchProject();
      } catch (err) {
        setMemberActionError((err as Error).message ?? "Unable to remove collaborator.");
      } finally {
        setRemovingMemberId(null);
      }
    },
    [dialogProject?.id, refetchProject, refetchQueries, removeProjectMember]
  );

  const resetMemberActionError = useCallback(() => setMemberActionError(null), []);

  const toggleDeleteSection = useCallback(() => {
    setIsDeleteSectionOpen((previous) => {
      const next = !previous;
      if (!next) {
        setDeleteError(null);
        setDeleteConfirmation("");
      }
      return next;
    });
  }, []);

  return {
    isOpen,
    dialogProject,
    name,
    setName,
    description,
    setDescription,
    isPublic,
    setIsPublic,
    error,
    isSubmitting,
    hasChanges,
    openSettings,
    closeSettings,
    saveSettings,
    deleteState: {
      isDeleteSectionOpen,
      toggleDeleteSection,
      deleteConfirmation,
      setDeleteConfirmation,
      deleteError,
      isDeleting,
      deleteProject,
    },
    membershipState: {
      removeMember,
      removingMemberId,
      memberActionError,
      resetMemberActionError,
    },
  };
}
