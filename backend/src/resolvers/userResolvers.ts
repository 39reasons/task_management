import * as UserService from "../services/UserService.js";

export const userResolvers = {
  Query: {
    searchUsers: async (
      _: unknown,
      { query }: { query: string }
    ) => {
      return await UserService.searchUsers(query);
    },
  },
  Mutation: {
    signUp: async (
      _: unknown,
      {
        name,
        username,
        password,
      }: { name: string; username: string; password: string }
    ) => {
      return await UserService.createUser(name, username, password);
    },

    login: async (
      _: unknown,
      { username, password }: { username: string; password: string }
    ) => {
      return await UserService.loginUser(username, password);
    },
  },
};
