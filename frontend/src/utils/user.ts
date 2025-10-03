import type { AuthUser, User } from "@shared/types";

type NameCarrier = Pick<User, "first_name" | "last_name"> | Pick<AuthUser, "first_name" | "last_name">;

export function getFullName(user: NameCarrier): string {
  const first = user.first_name?.trim() ?? "";
  const last = user.last_name?.trim() ?? "";
  return [first, last].filter(Boolean).join(" ");
}

export function getInitials(user: NameCarrier): string {
  const firstInitial = user.first_name?.trim().charAt(0) ?? "";
  const lastInitial = user.last_name?.trim().charAt(0) ?? "";
  const initials = `${firstInitial}${lastInitial}`.toUpperCase();
  if (initials) return initials;
  if (firstInitial) return firstInitial.toUpperCase();
  if (lastInitial) return lastInitial.toUpperCase();
  return "?";
}
