import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";

import { typeDefs } from "./schema/index.js";
import { resolvers } from "./resolvers/index.js";
import "dotenv/config";

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: PORT },
});

console.log(`🚀 Apollo v5 server ready at ${url}`);
