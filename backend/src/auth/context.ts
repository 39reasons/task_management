import jwt from "jsonwebtoken";
import type { Pool } from "pg";

import type { DecodedToken } from "../../../shared/types.js";
import type { GraphQLContext } from "../types/context.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export type ContextFactoryParams = {
  token: string | null;
  clientId: string | null;
};

export type ContextFactory = (
  params: ContextFactoryParams
) => Promise<GraphQLContext> | GraphQLContext;

export function getUserFromToken(token: string | null): DecodedToken | null {
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

export function extractToken(authHeader: string | null | undefined): string | null {
  if (!authHeader) return null;

  const match = authHeader.match(/^Bearer\s+(.*)$/i);
  return match ? match[1] : authHeader;
}

export function buildContext(options: {
  token: string | null;
  clientId: string | null;
  pool: Pool;
}): GraphQLContext {
  const { token, clientId, pool } = options;
  const user = getUserFromToken(token);

  return {
    db: pool,
    user,
    clientId,
  };
}
