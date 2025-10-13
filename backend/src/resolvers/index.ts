import { commentResolvers } from "./commentResolvers.js";
import { projectResolvers } from "./projectResolvers.js";
import { taskResolvers } from "./taskResolvers.js";
import { userResolvers } from "./userResolvers.js";
import { tagResolvers } from "./tagResolvers.js";
import { workflowResolvers } from "./workflowResolvers.js";
import { notificationResolvers } from "./notificationResolvers.js";
import { teamResolvers } from "./teamResolvers.js";
import { backlogResolvers } from "./backlogResolvers.js";

export const resolvers = [
  taskResolvers,
  projectResolvers,
  userResolvers,
  commentResolvers,
  tagResolvers,
  workflowResolvers,
  notificationResolvers,
  teamResolvers,
  backlogResolvers,
];
