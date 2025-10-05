import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { typeDefs } from "./schema/index.js";
import { resolvers } from "./resolvers/index.js";
import jwt from "jsonwebtoken";
import "dotenv/config";
import { Pool } from "pg";
import type { DecodedToken } from "@shared/types";
import { GraphQLContext } from "src/types/context";

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

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer<GraphQLContext>(server, {
  listen: { port: PORT },
  context: async ({ req }) => {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");
    const user = getUserFromToken(token);
    const clientIdHeader = req.headers["x-client-id"];
    const clientId = Array.isArray(clientIdHeader)
      ? clientIdHeader[0] ?? null
      : clientIdHeader ?? null;

    return {
      db: pool,
      user,
      clientId,
    };
  },
});

console.log(`🚀 Apollo v5 server ready at ${url}`);
