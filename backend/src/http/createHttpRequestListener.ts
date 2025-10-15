import type { ApolloServer } from "@apollo/server";
import { HeaderMap } from "@apollo/server";
import type { IncomingMessage, RequestListener, ServerResponse } from "node:http";
import { URL } from "node:url";

import { extractToken, type ContextFactory } from "../auth/context.js";
import type { GraphQLContext } from "../types/context.js";

type CreateHttpRequestListenerOptions = {
  server: ApolloServer<GraphQLContext>;
  port: number;
  contextFactory: ContextFactory;
};

export function createHttpRequestListener(
  options: CreateHttpRequestListenerOptions
): RequestListener {
  const { server, port, contextFactory } = options;

  return async (req: IncomingMessage, res: ServerResponse) => {
    if (!req.url) {
      res.statusCode = 400;
      res.end("Invalid request");
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host ?? `localhost:${port}`}`);

    if (url.pathname === "/health" || url.pathname === "/healthz") {
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/plain");
      res.end("ok");
      return;
    }

    if (url.pathname !== "/graphql") {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }

    applyCorsHeaders(req, res);

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    let parsedBody: unknown;
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
      const clientId = Array.isArray(clientHeader) ? clientHeader[0] ?? null : clientHeader ?? null;
      const token = extractToken(authHeader);
      const contextValue = await contextFactory({
        token,
        clientId: typeof clientId === "string" ? clientId : null,
      });

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
  };
}

function applyCorsHeaders(req: IncomingMessage, res: ServerResponse): void {
  const origin = req.headers.origin ?? "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "content-type, authorization, x-client-id");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
}

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

function toHeaderMap(headers: IncomingMessage["headers"]): HeaderMap {
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
