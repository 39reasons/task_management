import * as CommentService from "../services/CommentService.js";
import * as UserService from "../services/UserService.js";

export const commentResolvers = {
  Task: {
    comments: (parent: any) => CommentService.getCommentsByTask(parent.id),
  },

  Comment: {
    user: (parent: any) => {
      // parent.userId comes from your DB row
      if (!parent.userId) return null;
      return UserService.getUserById(parent.userId);
    },
  },

  Mutation: {
    addComment: async (_: any, { taskId, content }: any, ctx: any) => {
      if (!ctx.user) throw new Error("Not authenticated");
      return CommentService.addComment(taskId, ctx.user.id, content);
    },
    deleteComment: async (_: any, { id }: any, ctx: any) => {
      if (!ctx.user) throw new Error("Not authenticated");
      return CommentService.deleteComment(id, ctx.user.id);
    },
  },
};
