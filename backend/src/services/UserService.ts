import { query } from "../db/index.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const USER_FIELDS = `id, name, username, created_at, updated_at`;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export interface User {
  id: string;
  name: string;
  username: string;
  created_at: string;
  updated_at: string;
  password_hash?: string;
}

function generateToken(user: User) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      name: user.name,
    },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );
}

export async function getUserById(id: string): Promise<User | null> {
  const result = await query<User>(
    `SELECT ${USER_FIELDS} FROM users WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const result = await query<User>(
    `SELECT ${USER_FIELDS}, password_hash FROM users WHERE username = $1`,
    [username]
  );
  return result.rows[0] ?? null;
}

export async function searchUsers(term: string, limit: number = 10): Promise<User[]> {
  const sanitized = term.trim();
  if (!sanitized) return [];

  const result = await query<User>(
    `
    SELECT ${USER_FIELDS}
    FROM users
    WHERE username ILIKE $1 OR name ILIKE $1
    ORDER BY username ASC
    LIMIT $2
    `,
    [`%${sanitized}%`, limit]
  );

  return result.rows;
}

export async function createUser(
  name: string,
  username: string,
  password: string
): Promise<{ token: string; user: User }> {
  const password_hash = await bcrypt.hash(password, 10);

  const result = await query<User>(
    `INSERT INTO users (name, username, password_hash)
     VALUES ($1, $2, $3)
     RETURNING ${USER_FIELDS}`,
    [name, username, password_hash]
  );

  const user = result.rows[0];
  const token = generateToken(user);

  return { token, user };
}

export async function loginUser(
  username: string,
  password: string
): Promise<{ token: string; user: User }> {
  const result = await query<User & { password_hash: string }>(
    `SELECT * FROM users WHERE username = $1`,
    [username]
  );

  const user = result.rows[0];
  if (!user) {
    throw new Error("Invalid username or password");
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new Error("Invalid username or password");
  }

  const token = generateToken(user);

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      created_at: user.created_at,
      updated_at: user.updated_at,
    },
  };
  
}
