import { scalarResolvers } from "./scalarResolvers.js";
import { commentResolvers } from "./commentResolvers.js";
import { projectResolvers } from "./projectResolvers.js";
import { taskResolvers } from "./taskResolvers.js";
import { userResolvers } from "./userResolvers.js";
import { tagResolvers } from "./tagResolvers.js";
import { boardResolvers } from "./boardResolvers.js";
import { notificationResolvers } from "./notificationResolvers.js";
import { teamResolvers } from "./teamResolvers.js";
import { backlogResolvers } from "./backlogResolvers.js";
import { sprintResolvers } from "./sprintResolvers.js";
import { workItemResolvers } from "./workItemResolvers.js";

export const resolvers = [
  scalarResolvers,
  workItemResolvers,
  taskResolvers,
  projectResolvers,
  userResolvers,
  commentResolvers,
  tagResolvers,
  boardResolvers,
  notificationResolvers,
  teamResolvers,
  backlogResolvers,
  sprintResolvers,
];
