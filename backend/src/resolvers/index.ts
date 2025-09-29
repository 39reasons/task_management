import { projectResolvers } from "./projectResolvers.js";
import { taskResolvers } from "./taskResolvers.js";
import { userResolvers } from "./userResolvers.js";

export const resolvers = [taskResolvers, projectResolvers, userResolvers];
