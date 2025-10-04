import { query } from "../db/index.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const USER_FIELDS = `id, first_name, last_name, username, avatar_color, created_at, updated_at`;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const NAME_MAX_LENGTH = 32;
const USERNAME_MAX_LENGTH = 32;
const PASSWORD_MAX_LENGTH = 64;
const NAME_PATTERN = /^[A-Za-z]+$/;
const USERNAME_PATTERN = /^(?!.*[-_]{2})[A-Za-z0-9_-]+$/;

function ensureWithinLength(value: string, fieldName: string, maxLength: number): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${fieldName} is required.`);
  }
  if (trimmed.length > maxLength) {
    throw new Error(`${fieldName} cannot exceed ${maxLength} characters.`);
  }
  return trimmed;
}

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  avatar_color?: string | null;
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
      avatar_color: user.avatar_color,
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
  const sanitizedFirst = ensureWithinLength(first_name, "First name", NAME_MAX_LENGTH);
  const sanitizedLast = ensureWithinLength(last_name, "Last name", NAME_MAX_LENGTH);
  const sanitizedUsername = ensureWithinLength(username, "Username", USERNAME_MAX_LENGTH);
  if (!NAME_PATTERN.test(sanitizedFirst)) {
    throw new Error("First name can only contain letters.");
  }
  if (!NAME_PATTERN.test(sanitizedLast)) {
    throw new Error("Last name can only contain letters.");
  }
  if (!USERNAME_PATTERN.test(sanitizedUsername)) {
    throw new Error("Username can only contain letters, numbers, hyphens, or underscores.");
  }
  if (!password.trim()) {
    throw new Error("Password is required.");
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    throw new Error(`Password cannot exceed ${PASSWORD_MAX_LENGTH} characters.`);
  }

  const password_hash = await bcrypt.hash(password, 10);

  try {
    const result = await query<User>(
      `INSERT INTO users (first_name, last_name, username, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING ${USER_FIELDS}`,
      [sanitizedFirst, sanitizedLast, sanitizedUsername, password_hash]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    return { token, user };
  } catch (error: any) {
    if (error?.code === "23505") {
      throw new Error("That username is already taken. Please choose another.");
    }
    throw error;
  }
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
      avatar_color: user.avatar_color,
      created_at: user.created_at,
      updated_at: user.updated_at,
    },
  };
  
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<User, "first_name" | "last_name" | "username" | "avatar_color">>
): Promise<User> {
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.first_name !== undefined) {
    const sanitizedFirst = ensureWithinLength(updates.first_name, "First name", NAME_MAX_LENGTH);
    if (!NAME_PATTERN.test(sanitizedFirst)) {
      throw new Error("First name can only contain letters.");
    }
    fields.push("first_name = $" + (fields.length + 1));
    values.push(sanitizedFirst);
  }
  if (updates.last_name !== undefined) {
    const sanitizedLast = ensureWithinLength(updates.last_name, "Last name", NAME_MAX_LENGTH);
    if (!NAME_PATTERN.test(sanitizedLast)) {
      throw new Error("Last name can only contain letters.");
    }
    fields.push("last_name = $" + (fields.length + 1));
    values.push(sanitizedLast);
  }
  if (updates.username !== undefined) {
    const sanitizedUsername = ensureWithinLength(updates.username, "Username", USERNAME_MAX_LENGTH);
    if (!USERNAME_PATTERN.test(sanitizedUsername)) {
      throw new Error("Username can only contain letters, numbers, hyphens, or underscores.");
    }
    fields.push("username = $" + (fields.length + 1));
    values.push(sanitizedUsername);
  }
  if (updates.avatar_color !== undefined) {
    fields.push("avatar_color = $" + (fields.length + 1));
    values.push(updates.avatar_color);
  }

  if (fields.length === 0) {
    const result = await query<User>(
      `SELECT ${USER_FIELDS} FROM users WHERE id = $1`,
      [userId]
    );
    const user = result.rows[0];
    if (!user) throw new Error("User not found");
    return user;
  }

  values.push(userId);

  try {
    const result = await query<User>(
      `UPDATE users
       SET ${fields.join(", ")}, updated_at = now()
       WHERE id = $${fields.length + 1}
       RETURNING ${USER_FIELDS}`,
      values
    );

    const user = result.rows[0];
    if (!user) throw new Error("User not found");
    return user;
  } catch (error: any) {
    if (error?.code === "23505") {
      throw new Error("That username is already taken. Please choose another.");
    }
    throw error;
  }
}
