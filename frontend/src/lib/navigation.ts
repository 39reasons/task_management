import type { ClassValue } from "clsx";
import { cn } from "./utils";

export const NAV_ITEM_ACTIVE_CLASS =
  "border-primary/40 bg-primary/5 text-primary dark:border-white/15 dark:bg-white/10 dark:text-primary";

export const NAV_ITEM_INACTIVE_CLASS = "hover:border-transparent";

interface NavHighlightOptions {
  isActive: boolean;
  className?: ClassValue;
  activeClassName?: ClassValue;
  inactiveClassName?: ClassValue;
}

export function getNavItemHighlightClasses({
  isActive,
  className,
  activeClassName,
  inactiveClassName,
}: NavHighlightOptions): string {
  const resolvedActive = activeClassName === undefined ? NAV_ITEM_ACTIVE_CLASS : activeClassName;
  const resolvedInactive = inactiveClassName === undefined ? NAV_ITEM_INACTIVE_CLASS : inactiveClassName;

  return cn(className, isActive ? resolvedActive : resolvedInactive);
}
