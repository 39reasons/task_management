import type { GraphQLSchema } from "graphql";
import { useServer } from "graphql-ws/lib/use/ws";
import type { Disposable } from "graphql-ws";
import type { WebSocketServer } from "ws";

import { extractToken, type ContextFactory } from "../auth/context.js";
import type { GraphQLContext } from "../types/context.js";

type SetupGraphQLWSServerOptions = {
  schema: GraphQLSchema;
  wsServer: WebSocketServer;
  contextFactory: ContextFactory;
};

export function setupGraphQLWSServer(
  options: SetupGraphQLWSServerOptions
): Disposable {
  const { schema, wsServer, contextFactory } = options;

  return useServer<GraphQLContext>(
    {
      schema,
      context: async (ctx) => {
        const connectionParams = (ctx.connectionParams ?? {}) as Record<string, unknown>;
        const authHeaderRaw =
          connectionParams["authorization"] ?? connectionParams["Authorization"] ?? null;
        const clientHeaderRaw = connectionParams["x-client-id"] ?? null;

        const authHeader = typeof authHeaderRaw === "string" ? authHeaderRaw : null;
        const clientHeader = typeof clientHeaderRaw === "string" ? clientHeaderRaw : null;

        const token = extractToken(authHeader);
        return contextFactory({ token, clientId: clientHeader });
      },
    },
    wsServer
  );
}
