import * as UserService from "../services/UserService.js";
import type { GraphQLContext } from "../types/context";
import type { User } from "../../../shared/types.js";

export const userResolvers = {
  Query: {
    searchUsers: async (
      _: unknown,
      { query }: { query: string }
    ) => {
      return await UserService.searchUsers(query);
    },
    currentUser: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      if (!ctx.user) return null;
      const user = await UserService.getUserById(ctx.user.id);
      return user;
    },
  },
  Mutation: {
    signUp: async (
      _: unknown,
      {
        first_name,
        last_name,
        username,
        password,
      }: { first_name: string; last_name: string; username: string; password: string }
    ) => {
      return await UserService.createUser(first_name, last_name, username, password);
    },

    login: async (
      _: unknown,
      { username, password }: { username: string; password: string }
    ) => {
      return await UserService.loginUser(username, password);
    },

    updateUserProfile: async (
      _: unknown,
      args: { first_name?: string; last_name?: string; username?: string; avatar_color?: string },
      ctx: GraphQLContext
    ): Promise<User> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await UserService.updateUserProfile(ctx.user.id, args);
    },
  },
};
