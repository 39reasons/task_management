export function formatDate(value?: string | null): string {
  if (!value) return "Not set";
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "Not set";
  }
}

export function formatRelativeTimeFromNow(timestamp?: string | null): string {
  if (!timestamp) return "just now";
  const parsed = new Date(timestamp);
  const now = Date.now();
  if (Number.isNaN(parsed.getTime())) {
    return "just now";
  }
  const diffSeconds = Math.max(0, Math.floor((now - parsed.getTime()) / 1000));
  if (diffSeconds < 5) return "just now";
  if (diffSeconds < 60) {
    const seconds = diffSeconds;
    return `${seconds} second${seconds === 1 ? "" : "s"} ago`;
  }
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  }
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) {
    return `${diffWeeks} week${diffWeeks === 1 ? "" : "s"} ago`;
  }
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
  }
  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears} year${diffYears === 1 ? "" : "s"} ago`;
}
