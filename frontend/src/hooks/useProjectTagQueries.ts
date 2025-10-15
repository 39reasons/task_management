import { useCallback, useMemo } from "react";
import { useQuery } from "@apollo/client";
import type { Tag, Task } from "@shared/types";
import { GET_TASK_TAGS } from "../graphql";
import { useProjectTags } from "./useProjectTags";

interface UseProjectTagQueriesResult {
  projectTags: Tag[];
  loadingProjectTags: boolean;
  assignedTags: Tag[];
  assignedTagIds: Set<string>;
  loadingTaskTags: boolean;
  refetchProjectTags: () => Promise<unknown>;
  refetchTaskTags: () => Promise<unknown>;
  refetchAll: () => Promise<void>;
}

export function useProjectTagQueries(
  projectId: string | null,
  taskId: string | null
): UseProjectTagQueriesResult {
  const {
    tags: projectTags,
    loading: loadingProjectTags,
    refetch: refetchProjectTags,
  } = useProjectTags(projectId);

  const {
    data: taskTagsData,
    loading: loadingTaskTags,
    refetch: refetchTaskTags,
  } = useQuery<{
    task: (Pick<Task, "id"> & { tags: Tag[] }) | null;
  }>(GET_TASK_TAGS, {
    variables: { task_id: taskId ?? undefined },
    skip: !taskId,
  });

  const taskTagList = taskTagsData?.task?.tags;

  const assignedTags = useMemo(() => taskTagList ?? [], [taskTagList]);

  const assignedTagIds = useMemo(
    () => new Set(assignedTags.map((tag) => tag.id)),
    [assignedTags]
  );

  const refetchAll = useCallback(async () => {
    await Promise.all([
      refetchProjectTags().catch(() => undefined),
      taskId ? refetchTaskTags().catch(() => undefined) : Promise.resolve(),
    ]);
  }, [refetchProjectTags, refetchTaskTags, taskId]);

  return {
    projectTags,
    loadingProjectTags,
    assignedTags,
    assignedTagIds,
    loadingTaskTags,
    refetchProjectTags,
    refetchTaskTags,
    refetchAll,
  };
}
