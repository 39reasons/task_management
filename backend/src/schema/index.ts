import { readFileSync } from "fs";
import path from "path";

const taskSchema = readFileSync(
  path.join(process.cwd(), "src/schema/Task.graphql"),
  "utf8"
);

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

export const typeDefs = `
  type Query
  type Mutation
  ${taskSchema}
  ${projectSchema}
  ${userSchema}
  ${commentsSchema}
  ${tagSchema}
`;
