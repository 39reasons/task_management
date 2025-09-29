import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { typeDefs } from "./schema/index.js";
import { resolvers } from "./resolvers/index.js";
import jwt from "jsonwebtoken";
import "dotenv/config";
import { Pool } from "pg";


const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function getUserIdFromToken(token: string | null): string | null {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    return decoded.userId;
  } catch {
    return null; // invalid or expired token
  }
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: PORT },
  context: async ({ req }) => {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");
    const userId = getUserIdFromToken(token);

    return {
      db: pool,
      userId,
    };
  },
});

console.log(`🚀 Apollo v5 server ready at ${url}`);
