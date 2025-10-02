import { commentResolvers } from "./commentResolvers.js";
import { projectResolvers } from "./projectResolvers.js";
import { taskResolvers } from "./taskResolvers.js";
import { userResolvers } from "./userResolvers.js";
import { tagResolvers } from "./tagResolvers.js";
import { workflowResolvers } from "./workflowResolvers.js";

export const resolvers = [
  taskResolvers,
  projectResolvers,
  userResolvers,
  commentResolvers,
  tagResolvers,
  workflowResolvers,
];
