import { readFileSync } from "fs";
import path from "path";

const projectSchema = readFileSync(
  path.join(process.cwd(), "src/schema/Project.graphql"),
  "utf8"
);

const userSchema = readFileSync(
  path.join(process.cwd(), "src/schema/User.graphql"),
  "utf8"
);

const commentsSchema = readFileSync(
  path.join(process.cwd(), "src/schema/Comments.graphql"),
  "utf8"
);

const tagSchema = readFileSync(
  path.join(process.cwd(), "src/schema/Tag.graphql"),
  "utf8"
);

const boardSchema = readFileSync(
  path.join(process.cwd(), "src/schema/Board.graphql"),
  "utf8"
);

const notificationSchema = readFileSync(
  path.join(process.cwd(), "src/schema/Notification.graphql"),
  "utf8"
);

const teamSchema = readFileSync(
  path.join(process.cwd(), "src/schema/Team.graphql"),
  "utf8"
);

const backlogSchema = readFileSync(
  path.join(process.cwd(), "src/schema/Backlog.graphql"),
  "utf8"
);

const sprintSchema = readFileSync(
  path.join(process.cwd(), "src/schema/Sprint.graphql"),
  "utf8"
);

const workItemSchema = readFileSync(
  path.join(process.cwd(), "src/schema/WorkItem.graphql"),
  "utf8"
);

const taskSchema = readFileSync(
  path.join(process.cwd(), "src/schema/Task.graphql"),
  "utf8"
);

export const typeDefs = `
  type Query
  type Mutation
  type Subscription
  ${workItemSchema}
  ${taskSchema}
  ${projectSchema}
  ${userSchema}
  ${commentsSchema}
  ${tagSchema}
  ${boardSchema}
  ${notificationSchema}
  ${teamSchema}
  ${backlogSchema}
  ${sprintSchema}
`;
