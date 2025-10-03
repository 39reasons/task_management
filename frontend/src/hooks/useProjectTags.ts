import { useQuery } from "@apollo/client";
import { GET_PROJECT_TAGS } from "../graphql";
import type { Tag } from "@shared/types";

export function useProjectTags(project_id?: string | null) {
  const { data, loading, error, refetch } = useQuery<{ tags: Tag[] }>(GET_PROJECT_TAGS, {
    variables: { project_id },
    skip: !project_id,
    fetchPolicy: "cache-and-network",
  });

  return {
    tags: data?.tags ?? [],
    loading,
    error,
    refetch,
  };
}
