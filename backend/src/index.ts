import { ApolloServer, HeaderMap } from "@apollo/server";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { typeDefs } from "./schema/index.js";
import { resolvers } from "./resolvers/index.js";
import jwt from "jsonwebtoken";
import "dotenv/config";
import { Pool } from "pg";
import type { DecodedToken } from "../../shared/types.js";
import type { GraphQLContext } from "./types/context.js";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/lib/use/ws";
import { URL } from "node:url";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function getUserFromToken(token: string | null): DecodedToken | null {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      username: string;
      first_name: string;
      last_name: string;
      avatar_color?: string | null;
    };
    return decoded;
  } catch {
    return null;
  }
}

function extractToken(authHeader: string | null | undefined): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.*)$/i);
  return match ? match[1] : authHeader;
}

function buildContext(token: string | null, clientId: string | null): GraphQLContext {
  const user = getUserFromToken(token);
  return {
    db: pool,
    user,
    clientId,
  };
}

const schema = makeExecutableSchema({ typeDefs, resolvers });

const httpServer = createServer();

const wsServer = new WebSocketServer({
  server: httpServer,
  path: "/graphql",
});

const serverCleanup = useServer<GraphQLContext>(
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
      return buildContext(token, clientHeader);
    },
  },
  wsServer
);

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

httpServer.on("request", async (req: IncomingMessage, res: ServerResponse) => {
  if (!req.url) {
    res.statusCode = 400;
    res.end("Invalid request");
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host ?? `localhost:${PORT}`}`);

  if (url.pathname !== "/graphql") {
    res.statusCode = 404;
    res.end("Not found");
    return;
  }

  // Simple CORS handling
  const origin = req.headers.origin ?? "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "content-type, authorization, x-client-id");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  let parsedBody: unknown = undefined;
  try {
    parsedBody = await readRequestBody(req);
  } catch (error) {
    res.statusCode = 400;
    res.end(`Invalid JSON body: ${(error as Error).message}`);
    return;
  }

  try {
    const authHeader = req.headers.authorization ?? null;
    const clientHeader = req.headers["x-client-id"];
    const clientId =
      Array.isArray(clientHeader) ? clientHeader[0] ?? null : (clientHeader ?? null);
    const token = extractToken(authHeader);
    const contextValue = buildContext(token, typeof clientId === "string" ? clientId : null);

    const httpGraphQLResponse = await server.executeHTTPGraphQLRequest({
      context: async () => contextValue,
      httpGraphQLRequest: {
        method: req.method ?? "POST",
        headers: toHeaderMap(req.headers),
        search: url.search,
        body: parsedBody,
      },
    });

    for (const [key, value] of httpGraphQLResponse.headers) {
      res.setHeader(key, value);
    }

    res.statusCode = httpGraphQLResponse.status ?? 200;

    if (httpGraphQLResponse.body.kind === "complete") {
      res.end(httpGraphQLResponse.body.string ?? "");
    } else {
      for await (const chunk of httpGraphQLResponse.body.asyncIterator) {
        res.write(chunk);
      }
      res.end();
    }
  } catch (error) {
    res.statusCode = 500;
    res.end(`GraphQL execution error: ${(error as Error).message}`);
  }
});

httpServer.listen(PORT, () => {
  console.log(`🚀 GraphQL server ready at http://localhost:${PORT}/graphql`);
});

function readRequestBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (req.method === "GET" || req.method === "HEAD") {
      resolve(undefined);
      return;
    }

    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      if (!body) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", (error) => {
      reject(error);
    });
  });
}

function toHeaderMap(headers: IncomingMessage['headers']): HeaderMap {
  const map = new HeaderMap();
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      map.set(key, value.join(","));
    } else if (typeof value === "string") {
      map.set(key, value);
    } else if (typeof value === "number") {
      map.set(key, String(value));
    }
  }
  return map;
}
