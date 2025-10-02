import * as CommentService from "../services/CommentService.js";
import type { GraphQLContext } from "../types/context";
import type { Comment, Task } from "@shared/types";

export const commentResolvers = {
  Task: {
    comments: async (parent: Task): Promise<Comment[]> => {
      return await CommentService.getCommentsByTask(parent.id);
    },
  },

  Mutation: {
    addComment: async (
      _: unknown,
      { task_id, content }: { task_id: string; content: string },
      ctx: GraphQLContext
    ): Promise<Comment> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await CommentService.addComment(task_id, ctx.user.id, content);
    },

    deleteComment: async (
      _: unknown,
      { id }: { id: string },
      ctx: GraphQLContext
    ): Promise<boolean> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await CommentService.deleteComment(id, ctx.user.id);
    },
  },
};
