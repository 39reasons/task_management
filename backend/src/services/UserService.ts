import { query } from "../db/index.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const USER_FIELDS = `id, first_name, last_name, username, created_at, updated_at`;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export interface User {
  id: string;
  first_name: string;
  last_name: string;
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
      first_name: user.first_name,
      last_name: user.last_name,
    },
    JWT_SECRET,
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
    WHERE username ILIKE $1
       OR first_name ILIKE $1
       OR last_name ILIKE $1
       OR (first_name || ' ' || last_name) ILIKE $1
    ORDER BY first_name ASC, last_name ASC
    LIMIT $2
    `,
    [`%${sanitized}%`, limit]
  );

  return result.rows;
}

export async function createUser(
  first_name: string,
  last_name: string,
  username: string,
  password: string
): Promise<{ token: string; user: User }> {
  const password_hash = await bcrypt.hash(password, 10);

  const result = await query<User>(
    `INSERT INTO users (first_name, last_name, username, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING ${USER_FIELDS}`,
    [first_name, last_name, username, password_hash]
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
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      created_at: user.created_at,
      updated_at: user.updated_at,
    },
  };
  
}
