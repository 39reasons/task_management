import type { GraphQLContext } from "../types/context";
import {
  createWorkItem as createWorkItemService,
  getWorkItemById,
  getWorkItemChildren,
  getWorkItemParent,
  getWorkItemTask,
  linkWorkItems as linkItems,
  listWorkItems,
  unlinkWorkItems as unlinkItems,
  updateWorkItem as updateWorkItemService,
  type CreateWorkItemInput,
  type UpdateWorkItemInput,
  setWorkItemAssignee,
  assignTagToWorkItem,
  removeTagFromWorkItem,
  addWorkItemComment,
  updateWorkItemComment,
  deleteWorkItemComment,
  fetchWorkItemTags,
  fetchWorkItemComments,
} from "../services/WorkItemService.js";
import type { WorkItemType } from "../../../shared/types.js";

export const workItemResolvers = {
  Query: {
    workItem: async (_: unknown, { id }: { id: string }) => {
      return await getWorkItemById(id);
    },
    workItems: async (
      _: unknown,
      args: {
        project_id?: string | null;
        team_id?: string | null;
        types?: string[] | null;
        parent_id?: string | null;
      }
    ) => {
      const filters = {
        project_id: args.project_id ?? undefined,
        team_id: args.team_id ?? undefined,
        parent_id: args.parent_id ?? undefined,
        types: args.types ? args.types.map((type) => type.toUpperCase() as WorkItemType) : undefined,
      };
      return await listWorkItems(filters);
    },
  },
  Mutation: {
    createWorkItem: async (
      _: unknown,
      { input }: { input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await createWorkItemService(
        input as CreateWorkItemInput,
        {
          origin: ctx.clientId ?? null,
          actorId: ctx.user.id,
        }
      );
    },
    updateWorkItem: async (
      _: unknown,
      { id, input }: { id: string; input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      if (!ctx.user) throw new Error("Not authenticated");
      const updated = await updateWorkItemService(
        id,
        input as UpdateWorkItemInput
      );
      return updated;
    },
    setWorkItemAssignee: async (
      _: unknown,
      { work_item_id, assignee_id }: { work_item_id: string; assignee_id?: string | null },
      ctx: GraphQLContext
    ) => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await setWorkItemAssignee(work_item_id, assignee_id ?? null);
    },
    assignTagToWorkItem: async (
      _: unknown,
      { work_item_id, tag_id }: { work_item_id: string; tag_id: string },
      ctx: GraphQLContext
    ) => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await assignTagToWorkItem(work_item_id, tag_id);
    },
    removeTagFromWorkItem: async (
      _: unknown,
      { work_item_id, tag_id }: { work_item_id: string; tag_id: string },
      ctx: GraphQLContext
    ) => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await removeTagFromWorkItem(work_item_id, tag_id);
    },
    addWorkItemComment: async (
      _: unknown,
      { input }: { input: { work_item_id: string; content: string } },
      ctx: GraphQLContext
    ) => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await addWorkItemComment(input.work_item_id, ctx.user.id, input.content);
    },
    updateWorkItemComment: async (
      _: unknown,
      { input }: { input: { id: string; content: string } },
      ctx: GraphQLContext
    ) => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await updateWorkItemComment(input.id, ctx.user.id, input.content);
    },
    deleteWorkItemComment: async (
      _: unknown,
      { id }: { id: string },
      ctx: GraphQLContext
    ) => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await deleteWorkItemComment(id, ctx.user.id);
    },
    linkWorkItems: async (
      _: unknown,
      { input }: { input: { parent_id: string; child_id: string } },
      ctx: GraphQLContext
    ) => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await linkItems(input.parent_id, input.child_id);
    },
    unlinkWorkItems: async (
      _: unknown,
      { input }: { input: { parent_id: string; child_id: string } },
      ctx: GraphQLContext
    ) => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await unlinkItems(input.parent_id, input.child_id);
    },
  },
  WorkItem: {
    task_kind: (item: { task_kind?: string | null }) => item.task_kind ?? null,
    assignee: (item: { assignee?: unknown | null }) => {
      return item.assignee ?? null;
    },
    tags: async (item: { id: string; tags?: unknown }) => {
      if (Array.isArray(item.tags)) {
        return item.tags;
      }
      return await fetchWorkItemTags(item.id);
    },
    comments: async (item: { id: string; comments?: unknown }) => {
      if (Array.isArray(item.comments)) {
        return item.comments;
      }
      return await fetchWorkItemComments(item.id);
    },
    parent: async (item: { id: string }) => {
      return await getWorkItemParent(item.id);
    },
    children: async (item: { id: string }) => {
      return await getWorkItemChildren(item.id);
    },
    task: async (item: { id: string; type: string }) => {
      if (item.type === "TASK" || item.type === "BUG") {
        return await getWorkItemTask(item.id);
      }
      return null;
    },
  },
};
