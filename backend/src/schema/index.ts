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

export const typeDefs = `
  type Query
  type Mutation
  ${taskSchema}
  ${projectSchema}
`;
