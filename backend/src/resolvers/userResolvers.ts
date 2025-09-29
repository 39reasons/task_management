import * as UserService from "../services/UserService.js";

export const userResolvers = {
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
