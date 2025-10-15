import "dotenv/config";

import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { createServer } from "node:http";
import { Pool } from "pg";
import { WebSocketServer } from "ws";

import { typeDefs } from "./schema/index.js";
import { resolvers } from "./resolvers/index.js";
import { buildContext, type ContextFactory } from "./auth/context.js";
import { createHttpRequestListener } from "./http/createHttpRequestListener.js";
import { setupGraphQLWSServer } from "./websocket/setup.js";
import type { GraphQLContext } from "./types/context.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const schema = makeExecutableSchema({ typeDefs, resolvers });

const httpServer = createServer();
const wsServer = new WebSocketServer({
  server: httpServer,
  path: "/graphql",
});

const contextFactory: ContextFactory = ({ token, clientId }) =>
  buildContext({ token, clientId, pool });

const serverCleanup = setupGraphQLWSServer({
  schema,
  wsServer,
  contextFactory,
});

const server = new ApolloServer<GraphQLContext>({
  schema,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose();
          },
        };
      },
    },
  ],
});

await server.start();

const httpRequestListener = createHttpRequestListener({
  server,
  port: PORT,
  contextFactory,
});

httpServer.on("request", httpRequestListener);

httpServer.listen(PORT, () => {
  console.log(`🚀 GraphQL server ready at http://localhost:${PORT}/graphql`);
});
