import type { User } from "@shared/types";

export type InviteeSuggestion = Pick<
  User,
  "id" | "first_name" | "last_name" | "username" | "avatar_color"
>;
